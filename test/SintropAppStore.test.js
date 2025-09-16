// Import the tools we need. `expect` is for making assertions.
// `ethers` is the library Hardhat uses to interact with contracts.
const { expect } = require("chai");
const { ethers } = require("hardhat");

// The main block that groups all tests for the "SintropAppStore" contract.
describe("SintropAppStore", function () {
  // Declare variables that we will use across multiple tests.
  let SintropAppStore;
  let sintropAppStore;
  let owner, addr1, addr2;

  // VoteType enum corresponding to the one in the Solidity contract.
  // This makes tests more readable.
  const VoteType = {
    None: 0,
    Positive: 1,
    Negative: 2,
  };

  // `beforeEach` block runs before EACH `it()` test.
  // It's the perfect place to deploy the contract, ensuring a clean state for each test.
  beforeEach(async function () {
    // Get the test accounts provided by Hardhat.
    [owner, addr1, addr2] = await ethers.getSigners();

    // Get the contract factory (the "blueprint" for our contract).
    SintropAppStore = await ethers.getContractFactory("SintropAppStore");
    // Deploy a new contract instance.
    sintropAppStore = await SintropAppStore.deploy();
    await sintropAppStore.waitForDeployment();
  });

  // First group of tests: focused on the registration of new applications.
  describe("Registration", function () {
    it("Should allow a user to register a new ImpactApp with valid data", async function () {
      const name = "EcoApp";
      const description = "An app for tracking ecological footprints.";
      const icon = "http://example.com/icon.png";
      const repoUrl = "http://github.com/ecoapp";
      const externalLink = "http://ecoapp.com";
      const contractAddresses = [ethers.Wallet.createRandom().address]; // A random contract address

      // We expect the registration transaction to EMIT the `ImpactAppRegistered` event with the correct arguments.
      await expect(sintropAppStore.registerImpactApp(name, description, icon, repoUrl, externalLink, contractAddresses))
        .to.emit(sintropAppStore, "ImpactAppRegistered")
        .withArgs(1, name, owner.address);

      // We check if the app counter has been incremented to 1.
      expect(await sintropAppStore.impactAppsCount()).to.equal(1);

      // We fetch the newly created app from the public `impactApps` mapping.
      const newApp = await sintropAppStore.getImpactApp(1);

      // We check if all fields were stored correctly.
      expect(newApp.id).to.equal(1);
      expect(newApp.publisher).to.equal(owner.address);
      expect(newApp.name).to.equal(name);
      expect(newApp.description).to.equal(description);
      expect(newApp.positiveVotes).to.equal(0);
      expect(newApp.negativeVotes).to.equal(0);
    });

    it("Should revert if contract address array is empty", async function () {
      // We test a failure case: registering an app with no contract addresses.
      // We expect the transaction to be reverted with the exact error message from the `require` statement.
      await expect(sintropAppStore.registerImpactApp("Test", "Desc", "icon", "repo", "link", [])).to.be.revertedWith(
        "Must include at least one contract address."
      );
    });

    it("Should revert if name is empty", async function () {
      // We test another failure case: empty name.
      await expect(
        sintropAppStore.registerImpactApp("", "Desc", "icon", "repo", "link", [owner.address])
      ).to.be.revertedWith("Name must be between 1 and 100 characters.");
    });
  });

  // It focuses specifically on testing the getter functions.
  describe("Getters", function () {
    let sampleData;

    // Before each test in this block, we register one app to ensure we have data to fetch.
    beforeEach(async function () {
      // Define sample data that we will use for registration and assertions.
      sampleData = {
        name: "Green Ledger",
        description: "A DApp for tracking reforestation projects.",
        icon: "ipfs://icon_hash_123",
        repositoryUrl: "https://github.com/greenledger",
        externalLink: "https://greenledger.org",
        // Create two random addresses for the contract list to test the array.
        contractAddresses: [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address],
      };

      // Register the app using the owner's account.
      await sintropAppStore.registerImpactApp(
        sampleData.name,
        sampleData.description,
        sampleData.icon,
        sampleData.repositoryUrl,
        sampleData.externalLink,
        sampleData.contractAddresses
      );
    });

    // Main test case for the getImpactApp function's happy path.
    it("getImpactApp() should return the full ImpactApp struct, including dynamic arrays and strings", async function () {
      // --- Action ---
      // We call the new explicit getter function for the app with ID 1.
      const app = await sintropAppStore.getImpactApp(1);

      // --- Assertions ---

      // First, confirm the returned value is not undefined or null.
      expect(app).to.not.be.undefined;
      expect(app).to.not.be.null;

      // Now, verify all fields of the struct match the sample data.
      expect(app.id).to.equal(1);
      expect(app.publisher).to.equal(owner.address);
      expect(app.name).to.equal(sampleData.name);
      expect(app.description).to.equal(sampleData.description);
      expect(app.icon).to.equal(sampleData.icon);
      expect(app.repositoryUrl).to.equal(sampleData.repositoryUrl);
      expect(app.externalLink).to.equal(sampleData.externalLink);
      expect(app.positiveVotes).to.equal(0);
      expect(app.negativeVotes).to.equal(0);

      // **The crucial test**: Verify the dynamic array is returned correctly.
      // We use `deep.equal` to compare the contents of the array.
      expect(app.contractAddresses).to.deep.equal(sampleData.contractAddresses);
    });

    // Test case for the revert condition (sad path).
    it("getImpactApp() should revert if the app ID does not exist", async function () {
      // We expect the call to fail with the specific error message from the `require` statement.
      await expect(sintropAppStore.getImpactApp(999)).to.be.revertedWith("Invalid ImpactApp ID");
    });
  });

  // Second group of tests: focused on the voting functionality.
  describe("Voting", function () {
    // Before each voting test, we register an app to have something to vote on.
    beforeEach(async function () {
      await sintropAppStore.registerImpactApp("VoteApp", "Desc", "icon", "repo", "link", [owner.address]);
    });

    it("Should allow a user to cast a positive vote for the first time", async function () {
      // We use `connect(addr1)` to make the call from the perspective of `addr1`.
      await expect(sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive))
        .to.emit(sintropAppStore, "ImpactAppVoted")
        .withArgs(1, addr1.address, VoteType.Positive);

      const app = await sintropAppStore.getImpactApp(1);
      expect(app.positiveVotes).to.equal(1);
      expect(app.negativeVotes).to.equal(0);

      // We check if the user's vote was recorded correctly.
      const userVote = await sintropAppStore.impactAppVotes(1, addr1.address);
      expect(userVote).to.equal(VoteType.Positive);
    });

    it("Should allow a user to change their vote from positive to negative", async function () {
      // First, addr1 casts a positive vote.
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive);
      let app = await sintropAppStore.getImpactApp(1);
      expect(app.positiveVotes).to.equal(1);

      // Now, addr1 changes their vote to negative.
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Negative);
      app = await sintropAppStore.getImpactApp(1);

      // We check if the counts were adjusted correctly.
      expect(app.positiveVotes).to.equal(0);
      expect(app.negativeVotes).to.equal(1);

      const userVote = await sintropAppStore.impactAppVotes(1, addr1.address);
      expect(userVote).to.equal(VoteType.Negative);
    });

    it("Should not change vote counts if voting with the same type again", async function () {
      // addr1 casts a positive vote.
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive);
      let app = await sintropAppStore.getImpactApp(1);
      expect(app.positiveVotes).to.equal(1);

      // Try to vote positive again. The transaction will succeed, but it should not emit an event or change the state.
      await expect(sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive)).to.not.emit(
        sintropAppStore,
        "ImpactAppVoted"
      );

      app = await sintropAppStore.getImpactApp(1);
      // The count should remain the same.
      expect(app.positiveVotes).to.equal(1);
    });

    it("Should revert for an invalid ImpactApp ID", async function () {
      await expect(sintropAppStore.voteForImpactApp(999, VoteType.Positive)).to.be.revertedWith(
        "Invalid ImpactApp ID."
      );
    });
  });

  // Third group of tests: focused on the sustainability logic.
  describe("Sustainability Status", function () {
    beforeEach(async function () {
      await sintropAppStore.registerImpactApp("StatusApp", "Desc", "icon", "repo", "link", [owner.address]);
    });

    it("Should not be sustainable initially (0 votes)", async function () {
      // 0 > 0 is false.
      expect(await sintropAppStore.isImpactApp(1)).to.be.false;
    });

    it("Should be sustainable if positive votes are greater than negative votes", async function () {
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive);
      // 1 > 0 is true.
      expect(await sintropAppStore.isImpactApp(1)).to.be.true;
    });

    it("Should not be sustainable if votes are equal", async function () {
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive);
      await sintropAppStore.connect(addr2).voteForImpactApp(1, VoteType.Negative);
      // 1 > 1 is false.
      expect(await sintropAppStore.isImpactApp(1)).to.be.false;
    });
  });

  describe("Updating an ImpactApp", function () {
    const initialData = {
      name: "Carbon Tracker v1",
      description: "Initial release for tracking carbon credits.",
      icon: "http://example.com/icon_v1.png",
      repoUrl: "http://github.com/carbontracker/v1",
      externalLink: "http://carbontracker.io",
      contractAddresses: [],
    };

    const updatedData = {
      name: "Carbon Tracker v1.1",
      description: "A new and improved description after user feedback.",
      icon: "http://example.com/icon_v1.1.png",
      repoUrl: "http://github.com/carbontracker/v1.1",
      externalLink: "http://carbontracker.dev",
    };

    beforeEach(async function () {
      initialData.contractAddresses = [ethers.Wallet.createRandom().address];

      await sintropAppStore.connect(owner).registerImpactApp(
        initialData.name,
        initialData.description,
        initialData.icon,
        initialData.repoUrl,
        initialData.externalLink,
        initialData.contractAddresses
      );
    });

    it("Should allow the publisher to update their own app's data", async function () {
      await expect(
        sintropAppStore.connect(owner).updateImpactApp(
          1,
          updatedData.name,
          updatedData.description,
          updatedData.icon,
          updatedData.repoUrl,
          updatedData.externalLink
        )
      )
        .to.emit(sintropAppStore, "ImpactAppUpdated")
        .withArgs(1);

      const appAfterUpdate = await sintropAppStore.getImpactApp(1);

      expect(appAfterUpdate.name).to.equal(updatedData.name);
      expect(appAfterUpdate.description).to.equal(updatedData.description);
      expect(appAfterUpdate.icon).to.equal(updatedData.icon);
      expect(appAfterUpdate.repositoryUrl).to.equal(updatedData.repoUrl);
      expect(appAfterUpdate.externalLink).to.equal(updatedData.externalLink);

      expect(appAfterUpdate.id).to.equal(1);
      expect(appAfterUpdate.publisher).to.equal(owner.address);
      expect(appAfterUpdate.positiveVotes).to.equal(0);
      expect(appAfterUpdate.contractAddresses).to.deep.equal(initialData.contractAddresses);
    });

    it("Should revert if a non-publisher tries to update an app", async function () {
      await expect(
        sintropAppStore.connect(addr1).updateImpactApp(
          1,
          updatedData.name,
          updatedData.description,
          updatedData.icon,
          updatedData.repoUrl,
          updatedData.externalLink
        )
      ).to.be.revertedWith("Only the publisher can update the app.");
    });

    it("Should revert when trying to update an app with a non-existent ID", async function () {
      await expect(
        sintropAppStore.connect(owner).updateImpactApp(
          999,
          updatedData.name,
          updatedData.description,
          updatedData.icon,
          updatedData.repoUrl,
          updatedData.externalLink
        )
      ).to.be.revertedWith("Invalid ImpactApp ID.");
    });

    it("Should revert if trying to update with invalid data (e.g., empty name)", async function () {
      await expect(
        sintropAppStore.connect(owner).updateImpactApp(
          1,
          "",
          updatedData.description,
          updatedData.icon,
          updatedData.repoUrl,
          updatedData.externalLink
        )
      ).to.be.revertedWith("Name must be between 1 and 100 characters.");
    });
  });  
});
