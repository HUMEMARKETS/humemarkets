// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {HumeCreditRegistry} from "./HumeCreditRegistry.sol";
import {HumeCreditPair} from "./HumeCreditPair.sol";
import {HumeCreditRouter} from "./HumeCreditRouter.sol";
import {HumeCreditVault} from "./HumeCreditVault.sol";
import {HumeFeedOracle} from "../oracle/HumeFeedOracle.sol";

/// @title HumeCreditProxies
/// @notice Deploys each Hume contract as an implementation plus an ERC1967 UUPS proxy that is
/// initialized in the same transaction, so no proxy is ever left uninitialized.
/// @dev The `*At` variants take an existing implementation, letting several proxies share one.
library HumeCreditProxies {
    function _proxy(address implementation, bytes memory init) private returns (address) {
        return address(new ERC1967Proxy(implementation, init));
    }

    function registry(address owner) internal returns (HumeCreditRegistry) {
        return HumeCreditRegistry(
            _proxy(address(new HumeCreditRegistry()), abi.encodeCall(HumeCreditRegistry.initialize, (owner)))
        );
    }

    function lendingRouter(address owner) internal returns (HumeCreditRouter) {
        return
            HumeCreditRouter(
                _proxy(address(new HumeCreditRouter()), abi.encodeCall(HumeCreditRouter.initialize, (owner)))
            );
    }

    function vault(
        IERC20 asset,
        string memory name,
        string memory symbol,
        string memory slug,
        string memory riskTier,
        address owner
    ) internal returns (HumeCreditVault) {
        return HumeCreditVault(
            _proxy(
                address(new HumeCreditVault()),
                abi.encodeCall(HumeCreditVault.initialize, (asset, name, symbol, slug, riskTier, owner))
            )
        );
    }

    function oracle(
        address owner,
        uint256 expectedChainId,
        address sequencer,
        uint256 gracePeriod,
        HumeFeedOracle.FeedInput[] memory inputs
    ) internal returns (HumeFeedOracle) {
        return oracleAt(address(new HumeFeedOracle()), owner, expectedChainId, sequencer, gracePeriod, inputs);
    }

    function oracleAt(
        address implementation,
        address owner,
        uint256 expectedChainId,
        address sequencer,
        uint256 gracePeriod,
        HumeFeedOracle.FeedInput[] memory inputs
    ) internal returns (HumeFeedOracle) {
        return HumeFeedOracle(
            _proxy(
                implementation,
                abi.encodeCall(HumeFeedOracle.initialize, (owner, expectedChainId, sequencer, gracePeriod, inputs))
            )
        );
    }

    function pair(
        bytes32 marketId,
        address collateral,
        address debt,
        address priceOracle,
        address marketRegistry,
        address owner
    ) internal returns (HumeCreditPair) {
        return pairAt(address(new HumeCreditPair()), marketId, collateral, debt, priceOracle, marketRegistry, owner);
    }

    function pairAt(
        address implementation,
        bytes32 marketId,
        address collateral,
        address debt,
        address priceOracle,
        address marketRegistry,
        address owner
    ) internal returns (HumeCreditPair) {
        return HumeCreditPair(
            _proxy(
                implementation,
                abi.encodeCall(
                    HumeCreditPair.initialize, (marketId, collateral, debt, priceOracle, marketRegistry, owner)
                )
            )
        );
    }
}
