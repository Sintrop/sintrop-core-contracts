const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RCMarket", function () {
  let RCMarket;
  let rcMarket;
  let MockRCToken;
  let mockToken;
  let owner, seller, buyer;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    // Deploy mock RC token
    MockRCToken = await ethers.getContractFactory("MockRCToken");
    mockToken = await MockRCToken.deploy();
    await mockToken.waitForDeployment();

    // Mint some tokens to seller
    await mockToken.mint(seller.address, ethers.parseEther("1000"));

    // Deploy RCMarket with mock token address
    RCMarket = await ethers.getContractFactory("RCMarket");
    rcMarket = await RCMarket.deploy(mockToken.target);
    await rcMarket.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should initialize with offersCount of 0", async function () {
      expect(await rcMarket.getOffersCount()).to.equal(0);
    });

    it("Should set correct RC token address", async function () {
      expect(await rcMarket.rcToken()).to.equal(mockToken.target);
    });
  });

  describe("Creating Offers", function () {
    it("Should create an offer with valid data", async function () {
      const amount = ethers.parseEther("100");
      const unitPrice = "R$0,10";
      const paymentMethod = "pix:12345678901@nubank";
      const description = "Selling RC tokens to support regen project";

      await expect(
        rcMarket.connect(seller).createOffer(amount, unitPrice, paymentMethod, description)
      )
        .to.emit(rcMarket, "OfferCreated")
        .withArgs(1, seller.address, amount, unitPrice);

      expect(await rcMarket.getOffersCount()).to.equal(1);

      const offer = await rcMarket.getOffer(1);
      expect(offer.seller).to.equal(seller.address);
      expect(offer.amountRC).to.equal(amount);
      expect(offer.unitPrice).to.equal(unitPrice);
      expect(offer.paymentMethod).to.equal(paymentMethod);
      expect(offer.description).to.equal(description);
      expect(offer.active).to.equal(true);
    });

    it("Should revert with zero amount", async function () {
      await expect(
        rcMarket.connect(seller).createOffer(0, "R$0,10", "pix:123", "desc")
      ).to.be.revertedWithCustomError(rcMarket, "ZeroAmount");
    });

    it("Should revert with empty payment method", async function () {
      await expect(
        rcMarket.connect(seller).createOffer(100, "R$0,10", "", "desc")
      ).to.be.revertedWithCustomError(rcMarket, "InvalidPaymentMethod");
    });

    it("Should revert with empty description", async function () {
      await expect(
        rcMarket.connect(seller).createOffer(100, "R$0,10", "pix:123", "")
      ).to.be.revertedWithCustomError(rcMarket, "InvalidDescription");
    });

    it("Should revert with insufficient balance", async function () {
      // seller only has 1000 RC, try to sell 2000
      await expect(
        rcMarket.connect(seller).createOffer(ethers.parseEther("2000"), "R$0,10", "pix:123", "desc")
      ).to.be.revertedWithCustomError(rcMarket, "InsufficientBalance");
    });

    it("Should revert with empty unit price", async function () {
      await expect(
        rcMarket.connect(seller).createOffer(100, "", "pix:123", "desc")
      ).to.be.revertedWithCustomError(rcMarket, "InvalidPrice");
    });
  });

  describe("Canceling Offers", function () {
    beforeEach(async function () {
      await rcMarket.connect(seller).createOffer(
        ethers.parseEther("100"),
        "R$0,10",
        "pix:123@nubank",
        "Test offer"
      );
    });

    it("Should allow seller to cancel offer", async function () {
      await expect(rcMarket.connect(seller).cancelOffer(1))
        .to.emit(rcMarket, "OfferCancelled")
        .withArgs(1, seller.address);

      const offer = await rcMarket.getOffer(1);
      expect(offer.active).to.equal(false);
    });

    it("Should revert when offer is already inactive", async function () {
      await rcMarket.connect(seller).cancelOffer(1);

      await expect(rcMarket.connect(seller).cancelOffer(1))
        .to.be.revertedWithCustomError(rcMarket, "OfferNotActive")
        .withArgs(1);
    });

    it("Should revert when non-seller tries to cancel", async function () {
      await expect(rcMarket.connect(buyer).cancelOffer(1))
        .to.be.revertedWithCustomError(rcMarket, "NotSeller")
        .withArgs(1);
    });
  });

  describe("Confirming Sales", function () {
    beforeEach(async function () {
      await rcMarket.connect(seller).createOffer(
        ethers.parseEther("100"),
        "R$0,10",
        "pix:123@nubank",
        "Test offer"
      );
    });

    it("Should confirm sale and update buyer", async function () {
      await expect(rcMarket.connect(seller).confirmSale(1, buyer.address))
        .to.emit(rcMarket, "OfferCompleted")
        .withArgs(1, seller.address, buyer.address, ethers.parseEther("100"));

      const offer = await rcMarket.getOffer(1);
      expect(offer.active).to.equal(false);
      expect(offer.buyer).to.equal(buyer.address);
      expect(offer.completedAt).to.be.gt(0);
    });

    it("Should increment seller sales count", async function () {
      await rcMarket.connect(seller).confirmSale(1, buyer.address);

      expect(await rcMarket.getSellerSalesCount(seller.address)).to.equal(1);
    });

    it("Should revert with zero address buyer", async function () {
      await expect(rcMarket.connect(seller).confirmSale(1, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(rcMarket, "ZeroAddress");
    });

    it("Should revert when offer is inactive", async function () {
      await rcMarket.connect(seller).cancelOffer(1);

      await expect(rcMarket.connect(seller).confirmSale(1, buyer.address))
        .to.be.revertedWithCustomError(rcMarket, "OfferNotActive")
        .withArgs(1);
    });

    it("Should revert when non-seller tries to confirm", async function () {
      await expect(rcMarket.connect(buyer).confirmSale(1, buyer.address))
        .to.be.revertedWithCustomError(rcMarket, "NotSeller")
        .withArgs(1);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Create multiple offers
      await rcMarket.connect(seller).createOffer(100, "R$0,10", "pix:1", "Offer 1");
      await rcMarket.connect(seller).createOffer(200, "R$0,20", "pix:2", "Offer 2");
      await rcMarket.connect(seller).createOffer(300, "R$0,30", "pix:3", "Offer 3");
      
      // Complete first offer
      await rcMarket.connect(seller).confirmSale(1, buyer.address);
    });

    it("Should return correct offers count", async function () {
      expect(await rcMarket.getOffersCount()).to.equal(3);
    });

    it("Should return offer by ID", async function () {
      const offer = await rcMarket.getOffer(2);
      expect(offer.amountRC).to.equal(200);
    });

    it("Should return seller offer IDs", async function () {
      const offerIds = await rcMarket.getSellerOfferIds(seller.address);
      expect(offerIds.length).to.equal(3);
    });

    it("Should revert for non-existent offer", async function () {
      await expect(rcMarket.getOffer(999))
        .to.be.revertedWithCustomError(rcMarket, "OfferNotFound");
    });

    it("Should return seller sales count", async function () {
      expect(await rcMarket.getSellerSalesCount(seller.address)).to.equal(1);
    });
  });
});