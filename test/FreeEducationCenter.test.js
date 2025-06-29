// Import the necessary tools from Chai for assertions and from Hardhat/Ethers for contract interaction.
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Main `describe` block grouping all tests for the "FreeEducationCenter" contract.
describe("FreeEducationCenter", function () {
  // Declare variables to be used across multiple tests.
  let EducationCenter;
  let educationCenter;
  let owner, addr1;

  // `beforeEach` runs before EACH `it()` test, ensuring a clean state.
  beforeEach(async function () {
    // Get test accounts provided by Hardhat.
    [owner, addr1] = await ethers.getSigners();

    // Get the contract factory.
    EducationCenter = await ethers.getContractFactory("FreeEducationCenter");
    // Deploy a new contract instance.
    educationCenter = await EducationCenter.deploy();
    await educationCenter.waitForDeployment();
  });

  // Test group for the initial state of the contract after deployment.
  describe("Deployment", function () {
    it("Should initialize with a contentsCount of 0", async function () {
      // The initial count of content should be zero.
      expect(await educationCenter.contentsCount()).to.equal(0);
    });
  });

  // Test group for the `addContent` functionality.
  describe("Adding Content", function () {
    it("Should allow a user to add new content with valid data", async function () {
      // Define sample data for a new content entry.
      const title = "Introduction to Solidity";
      const description = "A beginner-friendly guide to smart contract development.";
      const url = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
      const photo = "ipfs://bafybeiemxf5abjw2wsq5eehgpj22w3dwc6g5x4flvfc24Gf22w3dwc6g";

      // The first content ID should be 1, as the counter is incremented first.
      const expectedId = 1;

      // Expect the transaction to emit the `ContentPublished` event with the correct arguments.
      await expect(educationCenter.addContent(title, description, url, photo))
        .to.emit(educationCenter, "ContentPublished")
        .withArgs(expectedId, title, owner.address);

      // Check if the content counter has been updated.
      expect(await educationCenter.contentsCount()).to.equal(expectedId);

      // Retrieve the newly added content from the public `contents` mapping to verify its data.
      const newContent = await educationCenter.contents(expectedId);
      expect(newContent.id).to.equal(expectedId);
      expect(newContent.title).to.equal(title);
      expect(newContent.description).to.equal(description);
      expect(newContent.url).to.equal(url);
      expect(newContent.photo).to.equal(photo);
    });

    it("Should allow adding content with an empty photo URL", async function () {
        const title = "Test Title";
        const description = "Test Description";
        const url = "ipfs://some-url";
        const photo = ""; // Empty photo string

        await expect(educationCenter.addContent(title, description, url, photo))
            .to.emit(educationCenter, "ContentPublished")
            .withArgs(1, title, owner.address);
        
        const newContent = await educationCenter.contents(1);
        expect(newContent.photo).to.equal("");
    });

    it("Should revert if the title is empty", async function () {
      // We test a failure case: trying to add content with an empty title.
      // We expect the transaction to be reverted with the exact error message from the `require` statement.
      await expect(
        educationCenter.addContent("", "Description", "url", "photo")
      ).to.be.revertedWith("FEC: Title must be between 1 and 49 characters");
    });

    it("Should revert if the URL is empty", async function () {
      // We test another failure case: empty URL.
      await expect(
        educationCenter.addContent("Title", "Description", "", "photo")
      ).to.be.revertedWith("FEC: URL must be between 1 and 199 characters");
    });
  });

  // Test group for the `getContent` functionality.
  describe("Retrieving Content", function () {
    const title = "Test Content";
    const description = "A test entry.";
    const url = "ipfs://test";
    const photo = "";

    // Before each retrieval test, we pre-populate the catalog with one entry.
    beforeEach(async function () {
      await educationCenter.connect(addr1).addContent(title, description, url, photo);
    });

    it("getContent() should return the correct content data for a valid ID", async function () {
      const content = await educationCenter.getContent(1);
      
      expect(content.id).to.equal(1);
      expect(content.title).to.equal(title);
      expect(content.description).to.equal(description);
    });

    it("getContent() should revert for an ID of 0", async function () {
      // Trying to get content with ID 0 should fail as IDs start from 1.
      await expect(educationCenter.getContent(0)).to.be.revertedWith("FEC: Content ID does not exist");
    });

    it("getContent() should revert for a non-existent ID", async function () {
      // Trying to get content with an ID that is out of bounds should fail.
      await expect(educationCenter.getContent(99)).to.be.revertedWith("FEC: Content ID does not exist");
    });
  });
});