// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPonsFactory} from "../../src/ponsperp/IPonsFactory.sol";

/// @notice Testnet stand-ins for the Pons launchpad: a token with Pons' own `getTokenInfo()`, a factory that
/// reports graduated launches and emits `LaunchSwept`, and a seeder that opens a real Uniswap v4 pool (native
/// ETH against the token, full range) on the chain's `PoolManager`. The router is the production contract.
contract MockPonsToken is ERC20 {
    struct Socials {
        string twitter;
        string telegram;
        string discord;
        string website;
        string farcaster;
    }

    address public immutable tokenDeployer;
    string public tokenLogo;
    string public tokenDescription;
    Socials internal socials;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory logo_,
        string memory description_,
        string memory website_
    ) ERC20(name_, symbol_) {
        tokenDeployer = msg.sender;
        tokenLogo = logo_;
        tokenDescription = description_;
        socials.website = website_;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == tokenDeployer, "only deployer");
        _mint(to, amount);
    }

    function getTokenInfo() external view returns (address, string memory, string memory, Socials memory) {
        return (tokenDeployer, tokenLogo, tokenDescription, socials);
    }
}

contract MockPonsFactory {
    event LaunchSwept(address indexed token, uint256 sweptQuote, uint256 sweptTokens);

    address public immutable owner = msg.sender;
    mapping(address => IPonsFactory.LaunchedToken) internal launches;

    /// @notice Records `token` as graduated into an ETH-paired v4 pool with `tickSpacing` and zero fee.
    function graduate(address token, int24 tickSpacing) external {
        require(msg.sender == owner, "only owner");
        launches[token] = IPonsFactory.LaunchedToken({
            token: token,
            curve: address(0),
            deployer: msg.sender,
            creatorFeeRecipient: msg.sender,
            pairToken: address(0),
            graduationThreshold: 0,
            poolFee: 0,
            tickSpacing: tickSpacing,
            creatorTaxBps: 0,
            buybackEnabled: false,
            phase: 2,
            sweptQuote: 0,
            sweptTokens: 0,
            sweptAt: block.timestamp,
            exists: true
        });
        emit LaunchSwept(token, 0, 0);
    }

    function getLaunchedToken(address token) external view returns (IPonsFactory.LaunchedToken memory) {
        return launches[token];
    }
}

interface IV4Admin {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct ModifyParams {
        int24 tickLower;
        int24 tickUpper;
        int256 liquidityDelta;
        bytes32 salt;
    }

    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24);
    function unlock(bytes calldata data) external returns (bytes memory);
    function modifyLiquidity(PoolKey memory key, ModifyParams memory params, bytes calldata hookData)
        external
        returns (int256, int256);
    function sync(address currency) external;
    function settle() external payable returns (uint256);
}

contract MockPonsSeeder {
    IV4Admin public immutable poolManager;
    int24 internal constant TICK_SPACING = 200;
    int24 internal constant MAX_TICK = 887200; // 4436 * 200, the widest range the spacing allows

    constructor(address poolManager_) {
        poolManager = IV4Admin(poolManager_);
    }

    /// @notice Opens the ETH / `token` pool at `sqrtPriceX96` and adds full-range liquidity from `msg.value` and
    /// as many tokens as that needs (the caller mints them to this contract first).
    function seed(address token, uint160 sqrtPriceX96) external payable {
        IV4Admin.PoolKey memory key = IV4Admin.PoolKey(address(0), token, 0, TICK_SPACING, address(0));
        poolManager.initialize(key, sqrtPriceX96);
        // Full range: amount0 is about L / sqrtP, so L is slightly below msg.value * sqrtP.
        int256 liquidity = int256((msg.value * uint256(sqrtPriceX96)) >> 96) * 99 / 100;
        poolManager.unlock(abi.encode(key, liquidity, msg.value));
        if (address(this).balance > 0) {
            (bool ok,) = msg.sender.call{value: address(this).balance}("");
            require(ok, "refund failed");
        }
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "not pool manager");
        (IV4Admin.PoolKey memory key, int256 liquidity,) = abi.decode(data, (IV4Admin.PoolKey, int256, uint256));
        (int256 callerDelta,) =
            poolManager.modifyLiquidity(key, IV4Admin.ModifyParams(-MAX_TICK, MAX_TICK, liquidity, bytes32(0)), "");
        int128 owe0 = int128(callerDelta >> 128);
        int128 owe1 = int128(callerDelta);
        if (owe0 < 0) poolManager.settle{value: uint256(uint128(-owe0))}();
        if (owe1 < 0) {
            poolManager.sync(key.currency1);
            IERC20(key.currency1).transfer(address(poolManager), uint256(uint128(-owe1)));
            poolManager.settle();
        }
        return "";
    }

    receive() external payable {}
}
