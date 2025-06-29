// Import the tools we need from Chai (for assertions) and Hardhat/Ethers.
const { expect } = require("chai");
const { ethers } = require("hardhat");

// The main `describe` block groups all tests for the "GlobalPlantCatalog" contract.
describe("GlobalPlantCatalog", function () {
  // Declare variables that we will use across multiple tests.
  let PlantCatalog;
  let plantCatalog;
  let owner, addr1, addr2;

  // `beforeEach` runs before EACH `it()` test.
  // This is the perfect place to deploy the contract, ensuring a clean state.
  beforeEach(async function () {
    // Get the test accounts provided by Hardhat.
    [owner, addr1, addr2] = await ethers.getSigners();

    // Get the contract factory.
    PlantCatalog = await ethers.getContractFactory("GlobalPlantCatalog");
    // Deploy a new contract instance before each test.
    plantCatalog = await PlantCatalog.deploy();
    await plantCatalog.waitForDeployment();
  });

  // A group of tests to check the initial state of the contract after deployment.
  describe("Deployment", function () {
    it("Should set the nextPlantId to 0 initially", async function () {
      // The initial count of plants should be zero.
      expect(await plantCatalog.getTotalPlantsCount()).to.equal(0);
      expect(await plantCatalog.nextPlantId()).to.equal(0);
    });
  });

  // A group of tests focused on the `addPlant` functionality.
  describe("Adding Plants", function () {
    it("Should allow a user to add a new plant and emit an event", async function () {
      // Define sample data for a new plant.
      const popularName = "Pau-Brasil";
      const scientificName = "Paubrasilia echinata";
      const taxonomy = "Fabaceae";
      const description = "A Brazilian timber tree.";
      const photoHashes = ["ipfs://hash1", "ipfs://hash2"];

      // We expect the transaction to EMIT the `PlantAdded` event with correct arguments.
      // The `anyValue` from Chai is useful for checking `block.timestamp` without knowing the exact value.
      await expect(
        plantCatalog.addPlant(popularName, scientificName, taxonomy, description, photoHashes)
      )
        .to.emit(plantCatalog, "PlantAdded")
        .withArgs(0, owner.address, popularName, scientificName, (value) => {
            // We can add a custom check for the timestamp if needed
            expect(value).to.be.above(0);
            return true;
        });

      // Check if the total plant count has been updated.
      expect(await plantCatalog.getTotalPlantsCount()).to.equal(1);

      // Retrieve the newly added plant to verify its data.
      const newPlant = await plantCatalog.getPlant(0);
      expect(newPlant.id).to.equal(0);
      expect(newPlant.creator).to.equal(owner.address);
      expect(newPlant.popularName).to.equal(popularName);
      expect(newPlant.photoHashes).to.deep.equal(photoHashes); // Use `deep.equal` for arrays.
    });

    it("Should correctly assign IDs and creators for multiple plants from different users", async function () {
      // addr1 adds the first plant (ID 0)
      await plantCatalog.connect(addr1).addPlant("Jatobá", "Hymenaea courbaril", "Fabaceae", "...", []);
      
      // addr2 adds the second plant (ID 1)
      await plantCatalog.connect(addr2).addPlant("Ipê Amarelo", "Handroanthus albus", "Bignoniaceae", "...", []);

      expect(await plantCatalog.getTotalPlantsCount()).to.equal(2);

      const plant1 = await plantCatalog.getPlant(0);
      const plant2 = await plantCatalog.getPlant(1);

      // Verify creators are correct.
      expect(plant1.creator).to.equal(addr1.address);
      expect(plant2.creator).to.equal(addr2.address);
    });
  });

  // A group of tests for the various `get` functions.
  describe("Retrieving Plant Data", function () {
    // Before each retrieval test, we pre-populate the catalog with some data.
    beforeEach(async function () {
      // addr1 adds plant with ID 0
      await plantCatalog.connect(addr1).addPlant("Plant A", "A scientia", "...", "...", []);
      // addr2 adds plant with ID 1
      await plantCatalog.connect(addr2).addPlant("Plant B", "B scientia", "...", "...", []);
      // addr1 adds another plant with ID 2
      await plantCatalog.connect(addr1).addPlant("Plant C", "C scientia", "...", "...", []);
    });

    it("getPlant() should return the correct plant data", async function () {
      const plantB = await plantCatalog.getPlant(1);
      expect(plantB.popularName).to.equal("Plant B");
      expect(plantB.creator).to.equal(addr2.address);
    });

    it("getPlant() should revert for a non-existent plant ID", async function () {
      // Trying to get a plant with ID 99 (which doesn't exist) should fail.
      await expect(plantCatalog.getPlant(99)).to.be.revertedWith("Plant ID does not exist");
    });
    
    it("getAllPlantIds() should return all registered plant IDs", async function () {
      const allIds = await plantCatalog.getAllPlantIds();
      // Ethers returns BigInts, so we convert them to numbers for easy comparison.
      const idsAsNumbers = allIds.map(id => Number(id));
      expect(idsAsNumbers).to.deep.equal([0, 1, 2]);
    });

    it("getPlantsByCreator() should return the correct list of plant IDs for each creator", async function () {
      // Get plants for addr1
      const addr1Plants = await plantCatalog.getPlantsByCreator(addr1.address);
      const addr1IdsAsNumbers = addr1Plants.map(id => Number(id));
      expect(addr1IdsAsNumbers).to.deep.equal([0, 2]);

      // Get plants for addr2
      const addr2Plants = await plantCatalog.getPlantsByCreator(addr2.address);
      const addr2IdsAsNumbers = addr2Plants.map(id => Number(id));
      expect(addr2IdsAsNumbers).to.deep.equal([1]);

      // Get plants for owner (who created none)
      const ownerPlants = await plantCatalog.getPlantsByCreator(owner.address);
      expect(ownerPlants).to.deep.equal([]);
    });
  });
});