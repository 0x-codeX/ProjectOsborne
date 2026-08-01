// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NippyPaymentGateway
 * @notice A stateless multi-currency payment router enforcing an 80/20 revenue split.
 */
contract NippyPaymentGateway is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public treasury;

    struct TokenConfig {
        bool isEnabled; // True = active, False = paused/unsupported
        uint256 minAmount; // The absolute minimum purchase amount in token base units (wei)
    }

    // address(0) represents Native network coins (ETH/POL)
    mapping(address => TokenConfig) public supportedTokens;

    // Basis points precision (2000 = 20%)
    uint256 public TREASURY_FEE_BPS = 2000;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_FEE_BPS = 3000; // 30% hard cap

    // Events (Max 3 indexed parameters per EVM spec)
    event ContentPurchased(
        address indexed buyer,
        address indexed creator,
        bytes32 indexed contentId,
        address token,
        uint256 price,
        uint256 creatorCut,
        uint256 treasuryCut
    );

    event TokenConfigured(address indexed token, bool isEnabled, uint256 minAmount);
    event TokenStatusUpdated(address indexed token, bool isEnabled);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Zero address treasury");
        treasury = _treasury;
    }

    /**
     * @notice Configures token support status and minimum purchase amount.
     */
    function setTokenConfig(address token, bool isEnabled, uint256 minAmount) external onlyOwner {
        if (token != address(0)) {
            require(token.code.length > 0, "Address is not a contract");
        }
        require(minAmount > 0, "Min amount must be greater than zero");

        supportedTokens[token] = TokenConfig({isEnabled: isEnabled, minAmount: minAmount});
        emit TokenConfigured(token, isEnabled, minAmount);
    }

    /**
     * @notice Emergency toggle to enable/disable a token without resetting its minimum amount.
     */
    function setTokenStatus(address token, bool isEnabled) external onlyOwner {
        supportedTokens[token].isEnabled = isEnabled;
        emit TokenStatusUpdated(token, isEnabled);
    }

    /**
     * @notice Executes purchase using a whitelisted ERC20 token (e.g., USDT, USDC).
     */
    function purchaseWithERC20(address token, address creator, bytes32 contentId, uint256 price) external nonReentrant {
        require(token != address(0), "Use purchaseWithNative for ETH/POL");
        require(creator != address(0), "Invalid creator address");
        require(creator != msg.sender, "Creators cannot buy their own content");
        require(creator != treasury, "Creator cannot be treasury");

        TokenConfig memory config = supportedTokens[token];
        require(config.isEnabled, "Token is unsupported or disabled");
        require(price >= config.minAmount, "Price below token minimum threshold");

        uint256 treasuryCut = (price * TREASURY_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorCut = price - treasuryCut;

        if (treasuryCut > 0) {
            IERC20(token).safeTransferFrom(msg.sender, treasury, treasuryCut);
        }
        if (creatorCut > 0) {
            IERC20(token).safeTransferFrom(msg.sender, creator, creatorCut);
        }

        emit ContentPurchased(msg.sender, creator, contentId, token, price, creatorCut, treasuryCut);
    }

    /**
     * @notice Executes purchase using native network tokens (ETH, POL).
     */
    function purchaseWithNative(address payable creator, bytes32 contentId) external payable nonReentrant {
        require(creator != address(0), "Invalid creator address");
        require(creator != msg.sender, "Creators cannot buy their own content");
        require(creator != treasury, "Creator cannot be treasury");

        TokenConfig memory config = supportedTokens[address(0)];
        require(config.isEnabled, "Native payments are unsupported or disabled");
        require(msg.value >= config.minAmount, "Amount below native minimum threshold");

        uint256 price = msg.value;
        uint256 treasuryCut = (price * TREASURY_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorCut = price - treasuryCut;

        if (treasuryCut > 0) {
            (bool successTreasury,) = treasury.call{value: treasuryCut}("");
            require(successTreasury, "Treasury transfer failed");
        }

        if (creatorCut > 0) {
            (bool successCreator,) = creator.call{value: creatorCut}("");
            require(successCreator, "Creator transfer failed");
        }

        emit ContentPurchased(msg.sender, creator, contentId, address(0), price, creatorCut, treasuryCut);
    }

    function updateTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Zero address treasury");
        emit TreasuryUpdated(treasury, _newTreasury);
        treasury = _newTreasury;
    }

    function updateFee(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum limit");
        emit FeeUpdated(TREASURY_FEE_BPS, _newFeeBps);
        TREASURY_FEE_BPS = _newFeeBps;
    }

    /**
     * @notice Rescues mistakenly sent ERC20 tokens sitting in the contract.
     */
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid destination address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(amount <= balance, "Insufficient token balance");
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Rescues mistakenly sent native coins sitting in the contract.
     */
    function rescueNative(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid destination address");
        require(amount <= address(this).balance, "Insufficient native balance");
        (bool success,) = to.call{value: amount}("");
        require(success, "Native rescue transfer failed");
    }
}
