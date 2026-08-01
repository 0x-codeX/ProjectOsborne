// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {NippyPaymentGateway} from "../src/NippyPaymentGateway.sol";
import {MockUSDT} from "../src/MockUSDT.sol"; // Adjust path if necessary

contract DeployMaster is Script {
    function run() external {
        // 1. Load variables securely (We NO LONGER need USDT_ADDRESS from .env)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");

        require(treasuryAddress != address(0), "Deploy: Treasury address cannot be zero");
        console.log("Starting Master Deployment on Chain ID:", block.chainid);

        // 2. Begin broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // 3. Deploy MockUSDT FIRST
        MockUSDT mockUsdt = new MockUSDT();
        console.log("SUCCESS: MockUSDT deployed at:", address(mockUsdt));

        // 4. Deploy the Gateway
        NippyPaymentGateway gateway = new NippyPaymentGateway(treasuryAddress);
        console.log("SUCCESS: NippyPaymentGateway deployed at:", address(gateway));

        // 5. Configure Initial Supported Tokens using the fresh MockUSDT address
        uint256 usdtMinAmount = 100_000;
        gateway.setTokenConfig(address(mockUsdt), true, usdtMinAmount);
        console.log("Configured USDT at address:", address(mockUsdt));

        uint256 nativeMinAmount = 100_000_000_000_000;
        gateway.setTokenConfig(address(0), true, nativeMinAmount);
        console.log("Configured Native Token (address(0))");

        // 6. Stop broadcasting
        vm.stopBroadcast();

        console.log("Master Deployment and State Configuration Complete.");
    }
}
