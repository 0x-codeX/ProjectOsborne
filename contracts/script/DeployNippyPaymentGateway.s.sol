// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {NippyPaymentGateway} from "../src/NippyPaymentGateway.sol";

contract DeployNippyPaymentGateway is Script {
    function run() external {
        // 1. Load variables securely from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");
        address usdtAddress = vm.envAddress("USDT_ADDRESS");

        // 2. Pre-flight Auditor Checks
        require(treasuryAddress != address(0), "Deploy: Treasury address cannot be zero");
        require(usdtAddress != address(0), "Deploy: USDT address cannot be zero");

        console.log("Starting deployment on Chain ID:", block.chainid);
        console.log("Treasury Address:", treasuryAddress);

        // 3. Begin broadcasting transactions to the RPC
        vm.startBroadcast(deployerPrivateKey);

        // 4. Deploy the updated contract
        NippyPaymentGateway gateway = new NippyPaymentGateway(treasuryAddress);
        console.log("SUCCESS: NippyPaymentGateway deployed at:", address(gateway));

        // 5. Configure Initial Supported Tokens
        // Configure USDT (Assuming 6 decimals -> $0.10 = 100_000 wei)
        uint256 usdtMinAmount = 100_000;
        gateway.setTokenConfig(usdtAddress, true, usdtMinAmount);
        console.log("Configured USDT at address:", usdtAddress);
        console.log("USDT Minimum Amount set to:", usdtMinAmount);

        // Configure Native Token (ETH/POL) (Assuming 18 decimals)
        uint256 nativeMinAmount = 100_000_000_000_000;
        gateway.setTokenConfig(address(0), true, nativeMinAmount);
        console.log("Configured Native Token (address(0))");
        console.log("Native Minimum Amount set to:", nativeMinAmount);

        // 6. Stop broadcasting
        vm.stopBroadcast();

        console.log("Deployment and State Configuration Complete. Ready for traffic.");
    }
}
