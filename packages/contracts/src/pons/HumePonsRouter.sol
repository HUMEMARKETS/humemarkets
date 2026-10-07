// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPonsFactory} from "../ponsperp/IPonsFactory.sol";

/// @notice The slice of the Uniswap v4 `PoolManager` the router uses. `BalanceDelta` is two packed int128
/// values (amount0 in the high half) and crosses the ABI as an int256.
interface IV4PoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData) external returns (int256);
    function sync(address currency) external;
    function settle() external payable returns (uint256);
    function take(address currency, address to, uint256 amount) external;
}

/// @notice Buy and sell a graduated Pons token for native ETH in its Uniswap v4 pool. This is spot trading and
/// nothing else: the router holds no funds between calls, has no owner and no fee, and the caller chooses a
/// minimum output and a deadline. The pool key is rebuilt from the Pons factory, so a caller names only the
/// token and cannot point the router at a pool the factory does not know.
contract HumePonsRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint160 internal constant MIN_SQRT_PRICE_PLUS_ONE = 4295128740;
    uint160 internal constant MAX_SQRT_PRICE_MINUS_ONE = 1461446703485210103287273052203988822378723970341;

    IV4PoolManager public immutable poolManager;
    IPonsFactory public immutable ponsFactory;
    /// @notice The Pons pool hook on this chain (`address(0)` where pools have none).
    address public immutable hook;

    error Expired();
    error UnknownPool(address token);
    error ZeroAmount();
    error SlippageExceeded(uint256 got, uint256 minimum);
    error NotPoolManager();
    error EthTransferFailed();

    event PonsBought(address indexed buyer, address indexed token, uint256 ethIn, uint256 tokensOut);
    event PonsSold(address indexed seller, address indexed token, uint256 tokensIn, uint256 ethOut);

    struct Action {
        bool buy;
        IV4PoolManager.PoolKey key;
        uint256 amountIn;
        uint256 minOut;
        address payer;
        address recipient;
    }

    constructor(address poolManager_, address ponsFactory_, address hook_) {
        if (poolManager_.code.length == 0 || ponsFactory_.code.length == 0) revert UnknownPool(address(0));
        poolManager = IV4PoolManager(poolManager_);
        ponsFactory = IPonsFactory(ponsFactory_);
        hook = hook_;
    }

    /// @notice Swaps `msg.value` ETH for `token`, sent to `recipient`. Reverts if fewer than `minOut` tokens result.
    function buy(address token, uint256 minOut, address recipient, uint256 deadline)
        external
        payable
        nonReentrant
        returns (uint256 tokensOut)
    {
        if (block.timestamp > deadline) revert Expired();
        if (msg.value == 0) revert ZeroAmount();
        tokensOut = _run(Action(true, _key(token), msg.value, minOut, msg.sender, recipient));
        emit PonsBought(msg.sender, token, msg.value, tokensOut);
    }

    /// @notice Swaps `amountIn` of `token` for ETH, sent to `recipient`. The caller approves this router first.
    function sell(address token, uint256 amountIn, uint256 minOut, address recipient, uint256 deadline)
        external
        nonReentrant
        returns (uint256 ethOut)
    {
        if (block.timestamp > deadline) revert Expired();
        if (amountIn == 0) revert ZeroAmount();
        ethOut = _run(Action(false, _key(token), amountIn, minOut, msg.sender, recipient));
        emit PonsSold(msg.sender, token, amountIn, ethOut);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        Action memory a = abi.decode(data, (Action));
        IV4PoolManager.SwapParams memory params = IV4PoolManager.SwapParams({
            zeroForOne: a.buy,
            amountSpecified: -int256(a.amountIn),
            sqrtPriceLimitX96: a.buy ? MIN_SQRT_PRICE_PLUS_ONE : MAX_SQRT_PRICE_MINUS_ONE
        });
        int256 delta = poolManager.swap(a.key, params, "");
        int128 amount0 = int128(delta >> 128);
        int128 amount1 = int128(delta);

        uint256 out;
        if (a.buy) {
            // ETH is owed to the pool, the token is owed to us.
            poolManager.settle{value: uint256(uint128(-amount0))}();
            out = uint256(uint128(amount1));
            if (out < a.minOut) revert SlippageExceeded(out, a.minOut);
            poolManager.take(a.key.currency1, a.recipient, out);
        } else {
            poolManager.sync(a.key.currency1);
            IERC20(a.key.currency1).safeTransferFrom(a.payer, address(poolManager), uint256(uint128(-amount1)));
            poolManager.settle();
            out = uint256(uint128(amount0));
            if (out < a.minOut) revert SlippageExceeded(out, a.minOut);
            poolManager.take(a.key.currency0, a.recipient, out);
        }
        return abi.encode(out);
    }

    function _run(Action memory a) internal returns (uint256 out) {
        out = abi.decode(poolManager.unlock(abi.encode(a)), (uint256));
        // A buy that stopped at the price limit leaves ETH behind; give it back.
        if (a.buy && address(this).balance > 0) {
            (bool ok,) = a.payer.call{value: address(this).balance}("");
            if (!ok) revert EthTransferFailed();
        }
    }

    function _key(address token) internal view returns (IV4PoolManager.PoolKey memory) {
        IPonsFactory.LaunchedToken memory launch = ponsFactory.getLaunchedToken(token);
        // Phase 2 means graduated into a v4 pool; a zero pair token means the pool pairs against native ETH.
        if (!launch.exists || launch.token != token || launch.phase != 2 || launch.pairToken != address(0)) {
            revert UnknownPool(token);
        }
        return IV4PoolManager.PoolKey(address(0), token, launch.poolFee, launch.tickSpacing, hook);
    }

    receive() external payable {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
    }
}
