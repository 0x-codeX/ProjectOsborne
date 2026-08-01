// src/MockUSDT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        // Mint 1,000,000 USDT (with 6 decimals) directly to your Treasury Wallet
        _mint(msg.sender, 1000000 * 10 ** 6);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    // Ironclad testing requires unlimited, frictionless access to capital.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}