// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NippyPaymentGateway
 * @notice A stateless multi-currency payment router enforcing The Profit Skim split.
 */
contract NippyPaymentGateway is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public treasury;

    struct TokenConfig {
        bool isEnabled;
        uint256 minAmount;
    }

    mapping(address => TokenConfig) public supportedTokens;

    // Basis points precision (2000 = 20%)
    uint256 public TREASURY_FEE_BPS = 2000;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_FEE_BPS = 3000; // 30% hard cap

    // Events updated to track the Profit Spread
    event ContentPurchased(
        address indexed buyer,
        address indexed creator,
        bytes32 indexed contentId,
        address token,
        uint256 rawBasePrice,
        uint256 chargeAmount,
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

    function setTokenConfig(address token, bool isEnabled, uint256 minAmount) external onlyOwner {
        if (token != address(0)) {
            require(token.code.length > 0, "Address is not a contract");
        }
        require(minAmount > 0, "Min amount must be greater than zero");
        supportedTokens[token] = TokenConfig({isEnabled: isEnabled, minAmount: minAmount});
        emit TokenConfigured(token, isEnabled, minAmount);
    }

    function setTokenStatus(address token, bool isEnabled) external onlyOwner {
        supportedTokens[token].isEnabled = isEnabled;
        emit TokenStatusUpdated(token, isEnabled);
    }

    /**
     * @notice THE FIX: Accepts both the creator's base price and the fan's padded charge amount.
     */
    function purchaseWithERC20(
        address token,
        address creator,
        bytes32 contentId,
        uint256 rawBasePrice,
        uint256 chargeAmount
    ) external nonReentrant {
        require(token != address(0), "Use purchaseWithNative for ETH/POL");
        require(creator != msg.sender, "Creators cannot buy their own content");
        require(creator != treasury, "Creator cannot be treasury");
        require(chargeAmount >= rawBasePrice, "Charge amount must cover base price");

        TokenConfig memory config = supportedTokens[token];
        require(config.isEnabled, "Token is unsupported or disabled");
        require(chargeAmount >= config.minAmount, "Price below token minimum threshold");

        // THE SKIM MATH:
        // Creator strictly gets their 80% cut of the BASE price.
        uint256 creatorCut = (rawBasePrice * (BPS_DENOMINATOR - TREASURY_FEE_BPS)) / BPS_DENOMINATOR;

        // Treasury sweeps everything else (The 20% base fee + 100% of the padding spread)
        uint256 treasuryCut = chargeAmount - creatorCut;

        if (creator == address(0)) {
            // FALLBACK ROUTE: Creator has no crypto address set. 100% to treasury for DB settlement.
            IERC20(token).safeTransferFrom(msg.sender, treasury, chargeAmount);
        } else {
            // DIRECT ROUTE: On-chain instant split
            if (treasuryCut > 0) {
                IERC20(token).safeTransferFrom(msg.sender, treasury, treasuryCut);
            }
            if (creatorCut > 0) {
                IERC20(token).safeTransferFrom(msg.sender, creator, creatorCut);
            }
        }

        emit ContentPurchased(
            msg.sender, creator, contentId, token, rawBasePrice, chargeAmount, creatorCut, treasuryCut
        );
    }

    /**
     * @notice THE FIX: Native execution mimicking the ERC20 skim split.
     */
    function purchaseWithNative(address payable creator, bytes32 contentId, uint256 rawBasePrice)
        external
        payable
        nonReentrant
    {
        require(creator != msg.sender, "Creators cannot buy their own content");
        require(creator != treasury, "Creator cannot be treasury");

        uint256 chargeAmount = msg.value;
        require(chargeAmount >= rawBasePrice, "Msg.value must cover base price");

        TokenConfig memory config = supportedTokens[address(0)];
        require(config.isEnabled, "Native payments are unsupported or disabled");
        require(chargeAmount >= config.minAmount, "Amount below native minimum threshold");

        // THE SKIM MATH
        uint256 creatorCut = (rawBasePrice * (BPS_DENOMINATOR - TREASURY_FEE_BPS)) / BPS_DENOMINATOR;
        uint256 treasuryCut = chargeAmount - creatorCut;

        if (creator == address(0)) {
            (bool successTreasury,) = treasury.call{value: chargeAmount}("");
            require(successTreasury, "Treasury native transfer failed");
        } else {
            if (treasuryCut > 0) {
                (bool successTreasury,) = treasury.call{value: treasuryCut}("");
                require(successTreasury, "Treasury transfer failed");
            }
            if (creatorCut > 0) {
                (bool successCreator,) = creator.call{value: creatorCut}("");
                require(successCreator, "Creator transfer failed");
            }
        }

        emit ContentPurchased(
            msg.sender, creator, contentId, address(0), rawBasePrice, chargeAmount, creatorCut, treasuryCut
        );
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

    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid destination address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(amount <= balance, "Insufficient token balance");
        IERC20(token).safeTransfer(to, amount);
    }

    function rescueNative(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid destination address");
        require(amount <= address(this).balance, "Insufficient native balance");
        (bool success,) = to.call{value: amount}("");
        require(success, "Native rescue transfer failed");
    }
}
