// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {HumePonsRouter} from "../../src/pons/HumePonsRouter.sol";
import {MockPonsToken, MockPonsFactory, MockPonsSeeder} from "../mocks/MockPons.sol";
import {IPonsFactory} from "../../src/ponsperp/IPonsFactory.sol";

address constant POOL_MANAGER = 0x8366a39CC670B4001A1121B8F6A443A643e40951;

/// @notice The router against the real Uniswap v4 `PoolManager` on the testnet fork, with mock Pons launches.
/// Skipped unless `ROBINHOOD_TESTNET_RPC_URL` is set.
contract PonsTestnetForkTest is Test {
    HumePonsRouter internal router;
    MockPonsToken internal token;
    address internal trader = makeAddr("trader");

    receive() external payable {}

    function setUp() public {
        string memory rpc = vm.envOr("ROBINHOOD_TESTNET_RPC_URL", string(""));
        if (bytes(rpc).length == 0) vm.skip(true);
        vm.createSelectFork(rpc);

        MockPonsFactory factory = new MockPonsFactory();
        token = new MockPonsToken(
            "Pons Test", "PTEST", "https://example.invalid/logo.png", "A test token", "https://example.invalid"
        );
        factory.graduate(address(token), 200);
        MockPonsSeeder seeder = new MockPonsSeeder(POOL_MANAGER);
        token.mint(address(seeder), 1_000 ether);
        vm.deal(address(this), 1 ether);
        seeder.seed{value: 0.001 ether}(address(token), uint160(1000) << 96); // 1,000,000 tokens per ETH
        router = new HumePonsRouter(POOL_MANAGER, address(factory), address(0));
        vm.deal(trader, 1 ether);
    }

    function test_buyThenSellMovesFundsExactly() public {
        vm.startPrank(trader);
        uint256 out = router.buy{value: 0.0001 ether}(address(token), 1, trader, block.timestamp + 60);
        assertEq(token.balanceOf(trader), out);
        assertEq(address(router).balance, 0);
        assertGt(out, 80 ether); // about 100 tokens before price impact on a 0.001 ETH pool

        token.approve(address(router), out);
        uint256 ethBefore = trader.balance;
        uint256 back = router.sell(address(token), out, 1, trader, block.timestamp + 60);
        assertEq(trader.balance, ethBefore + back);
        assertEq(token.balanceOf(trader), 0);
        assertLt(back, 0.0001 ether); // price impact both ways: never a free round trip
        vm.stopPrank();
    }

    function test_minOutAndDeadlineAreEnforced() public {
        vm.startPrank(trader);
        vm.expectRevert();
        router.buy{value: 0.0001 ether}(address(token), 1_000 ether, trader, block.timestamp + 60);
        vm.expectRevert(HumePonsRouter.Expired.selector);
        router.buy{value: 0.0001 ether}(address(token), 1, trader, block.timestamp - 1);
        vm.expectRevert(HumePonsRouter.ZeroAmount.selector);
        router.buy(address(token), 1, trader, block.timestamp + 60);
        vm.stopPrank();
    }

    function test_unknownTokenIsRefused() public {
        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(HumePonsRouter.UnknownPool.selector, address(0xdead)));
        router.buy{value: 0.0001 ether}(address(0xdead), 1, trader, block.timestamp + 60);
    }

    function test_unlockCallbackRefusesOtherCallers() public {
        vm.expectRevert(HumePonsRouter.NotPoolManager.selector);
        router.unlockCallback("");
    }
}

/// @notice The same router against the REAL Pons factory, hook and ZZZ pool on a mainnet fork: a small buy and
/// sell must work through the live hook. Skipped unless `ROBINHOOD_MAINNET_RPC_URL` is set.
contract PonsMainnetForkTest is Test {
    address internal constant FACTORY = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address internal constant HOOK = 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044;
    address internal constant ZZZ = 0x7dbf38976f6D3b9c529e7D9484A71898B409eE6a;

    function test_buyAndSellZzzThroughTheLiveHook() public {
        string memory rpc = vm.envOr("ROBINHOOD_MAINNET_RPC_URL", string(""));
        if (bytes(rpc).length == 0) vm.skip(true);
        vm.createSelectFork(rpc);

        HumePonsRouter router = new HumePonsRouter(POOL_MANAGER, FACTORY, HOOK);
        address trader = makeAddr("trader");
        vm.deal(trader, 1 ether);
        vm.startPrank(trader);
        uint256 out = router.buy{value: 0.001 ether}(ZZZ, 1, trader, block.timestamp + 60);
        assertGt(out, 0);
        MockPonsToken(ZZZ).approve(address(router), out);
        uint256 back = router.sell(ZZZ, out, 1, trader, block.timestamp + 60);
        assertGt(back, 0);
        vm.stopPrank();
    }
}
