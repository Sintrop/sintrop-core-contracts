// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RCMarket
 * @dev P2P marketplace for RC tokens without custody
 * 
 * Sellers create listing offers declaring quantity, unit price and payment method.
 * Off-chain payment (Pix/transfer) happens outside blockchain.
 * Seller confirms sale, transferring tokens to buyer.
 * 
 * This contract does NOT hold tokens - it only registers offers and confirmations.
 * Transfer verification is done off-chain via Transfer events.
 */
contract RCMarket {
    
    // --- Constants ---
    uint256 public constant MAX_DESCRIPTION_LENGTH = 500;
    uint256 public constant MAX_PAYMENT_METHOD_LENGTH = 200;
    uint256 public constant MAX_PRICE_LENGTH = 50;
    
    // --- State Variables ---
    IERC20 public rcToken;
    uint256 private _offersCount;
    
    // Mappings
    mapping(uint256 => Offer) public offers;
    mapping(address => uint256[]) public sellerOfferIds;
    mapping(address => uint256) public sellerSalesCount;
    
    // --- Structs ---
    struct Offer {
        uint256 id;
        address seller;
        uint256 amountRC;      // Total amount of RC tokens for sale
        string unitPrice;      // Price per unit (ex: "R$0,10" or "0.01 BTC")
        string paymentMethod;  // Payment info (ex: "pix:cpf@bank")
        string description;    // Offer description
        bool active;
        uint256 createdAt;
        address buyer;
        uint256 completedAt;
    }
    
    // --- Events ---
    /**
     * @dev Emitted when a new offer is created
     * @param offerId Unique identifier of the offer
     * @param seller Address of the seller
     * @param amountRC Amount of RC tokens for sale
     * @param unitPrice Unit price for the tokens
     */
    event OfferCreated(
        uint256 indexed offerId,
        address indexed seller,
        uint256 amountRC,
        string unitPrice
    );
    
    /**
     * @dev Emitted when an offer is cancelled
     * @param offerId Unique identifier of the cancelled offer
     * @param seller Address of the seller who cancelled
     */
    event OfferCancelled(
        uint256 indexed offerId,
        address indexed seller
    );
    
    /**
     * @dev Emitted when a sale is completed
     * @param offerId Unique identifier of the completed offer
     * @param seller Address of the seller
     * @param buyer Address of the buyer
     * @param amountRC Amount of RC tokens transferred
     */
    event OfferCompleted(
        uint256 indexed offerId,
        address indexed seller,
        address indexed buyer,
        uint256 amountRC
    );
    
    // --- Errors ---
    error ZeroAmount();
    error InvalidPrice();
    error InvalidPaymentMethod();
    error InvalidDescription();
    error OfferNotActive(uint256 offerId);
    error NotSeller(uint256 offerId);
    error InsufficientBalance(uint256 required, uint256 available);
    error ZeroAddress();
    error OfferNotFound(uint256 offerId);
    
    // --- Constructor ---
    constructor(address _rcTokenAddress) {
        if (_rcTokenAddress == address(0)) revert ZeroAddress();
        rcToken = IERC20(_rcTokenAddress);
    }
    
    // --- External Functions ---
    
    /**
     * @dev Creates a new offer for selling RC tokens
     * @param amountRC Amount of RC tokens to sell
     * @param unitPrice Price per unit (short string, ex: "R$0,10")
     * @param paymentMethod Payment method (ex: "pix:cpf@bank")
     * @param description Description of the offer
     * @return offerId The unique ID of the created offer
     * 
     * Requirements:
     * - amountRC must be greater than 0
     * - unitPrice must not be empty (max 50 chars)
     * - paymentMethod must not be empty
     * - description must not be empty
     * - seller must have sufficient RC token balance
     */
    function createOffer(
        uint256 amountRC,
        string calldata unitPrice,
        string calldata paymentMethod,
        string calldata description
    ) external returns (uint256) {
        if (amountRC == 0) revert ZeroAmount();
        if (bytes(unitPrice).length == 0 || bytes(unitPrice).length > MAX_PRICE_LENGTH) 
            revert InvalidPrice();
        if (bytes(paymentMethod).length == 0 || bytes(paymentMethod).length > MAX_PAYMENT_METHOD_LENGTH) 
            revert InvalidPaymentMethod();
        if (bytes(description).length == 0 || bytes(description).length > MAX_DESCRIPTION_LENGTH) 
            revert InvalidDescription();
        
        // Check seller has sufficient balance
        uint256 balance = rcToken.balanceOf(msg.sender);
        if (balance < amountRC) revert InsufficientBalance(amountRC, balance);
        
        _offersCount++;
        uint256 offerId = _offersCount;
        
        offers[offerId] = Offer({
            id: offerId,
            seller: msg.sender,
            amountRC: amountRC,
            unitPrice: unitPrice,
            paymentMethod: paymentMethod,
            description: description,
            active: true,
            createdAt: block.timestamp,
            buyer: address(0),
            completedAt: 0
        });
        
        sellerOfferIds[msg.sender].push(offerId);
        
        emit OfferCreated(offerId, msg.sender, amountRC, unitPrice);
        
        return offerId;
    }
    
    /**
     * @dev Cancels an active offer
     * @param offerId ID of the offer to cancel
     * 
     * Requirements:
     * - Offer must be active
     * - Only seller can cancel
     */
    function cancelOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        
        if (!offer.active) revert OfferNotActive(offerId);
        if (offer.seller != msg.sender) revert NotSeller(offerId);
        
        offer.active = false;
        
        emit OfferCancelled(offerId, msg.sender);
    }
    
    /**
     * @dev Confirms a sale and records the buyer
     * @param offerId ID of the offer being completed
     * @param buyer Address of the buyer
     * 
     * Note: Token transfer is done off-chain. This function only records
     * the completion for transparency and reputation tracking.
     * 
     * Requirements:
     * - Offer must be active
     * - Only seller can confirm
     * - buyer address must not be zero
     */
    function confirmSale(uint256 offerId, address buyer) external {
        if (buyer == address(0)) revert ZeroAddress();
        
        Offer storage offer = offers[offerId];
        
        if (!offer.active) revert OfferNotActive(offerId);
        if (offer.seller != msg.sender) revert NotSeller(offerId);
        
        offer.active = false;
        offer.buyer = buyer;
        offer.completedAt = block.timestamp;
        
        sellerSalesCount[msg.sender]++;
        
        emit OfferCompleted(offerId, msg.sender, buyer, offer.amountRC);
    }
    
    // --- View Functions ---
    
    /**
     * @dev Returns the total number of offers created
     */
    function getOffersCount() external view returns (uint256) {
        return _offersCount;
    }
    
    /**
     * @dev Returns a specific offer by ID
     * @param offerId ID of the offer to retrieve
     * @return Offer struct with the offer details
     */
    function getOffer(uint256 offerId) external view returns (Offer memory) {
        if (offerId == 0 || offerId > _offersCount) revert OfferNotFound(offerId);
        return offers[offerId];
    }
    
    /**
     * @dev Returns all offer IDs for a specific seller
     * @param seller Address of the seller
     * @return Array of offer IDs belonging to the seller
     */
    function getSellerOfferIds(address seller) external view returns (uint256[] memory) {
        return sellerOfferIds[seller];
    }
    
    /**
     * @dev Returns the total number of completed sales for a seller
     * @param seller Address of the seller
     * @return Number of completed sales
     */
    function getSellerSalesCount(address seller) external view returns (uint256) {
        return sellerSalesCount[seller];
    }
}

// Minimal IERC20 interface
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}
