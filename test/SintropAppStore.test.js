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
      await expect(
        sintropAppStore.registerImpactApp(name, description, icon, repoUrl, externalLink, contractAddresses)
      )
        .to.emit(sintropAppStore, "ImpactAppRegistered")
        .withArgs(1, name, owner.address);

      // We check if the app counter has been incremented to 1.
      expect(await sintropAppStore.impactAppsCount()).to.equal(1);

      // We fetch the newly created app from the public `impactApps` mapping.
      const newApp = await sintropAppStore.impactApps(1);

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
      await expect(
        sintropAppStore.registerImpactApp("Test", "Desc", "icon", "repo", "link", [])
      ).to.be.revertedWith("Must include at least one contract address.");
    });

    it("Should revert if name is empty", async function () {
      // We test another failure case: empty name.
      await expect(
        sintropAppStore.registerImpactApp("", "Desc", "icon", "repo", "link", [owner.address])
      ).to.be.revertedWith("Name must be between 1 and 100 characters.");
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

      const app = await sintropAppStore.impactApps(1);
      expect(app.positiveVotes).to.equal(1);
      expect(app.negativeVotes).to.equal(0);

      // We check if the user's vote was recorded correctly.
      const userVote = await sintropAppStore.impactAppVotes(1, addr1.address);
      expect(userVote).to.equal(VoteType.Positive);
    });

    it("Should allow a user to change their vote from positive to negative", async function () {
      // First, addr1 casts a positive vote.
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive);
      let app = await sintropAppStore.impactApps(1);
      expect(app.positiveVotes).to.equal(1);

      // Now, addr1 changes their vote to negative.
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Negative);
      app = await sintropAppStore.impactApps(1);

      // We check if the counts were adjusted correctly.
      expect(app.positiveVotes).to.equal(0);
      expect(app.negativeVotes).to.equal(1);

      const userVote = await sintropAppStore.impactAppVotes(1, addr1.address);
      expect(userVote).to.equal(VoteType.Negative);
    });

    it("Should not change vote counts if voting with the same type again", async function () {
      // addr1 casts a positive vote.
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive);
      let app = await sintropAppStore.impactApps(1);
      expect(app.positiveVotes).to.equal(1);

      // Try to vote positive again. The transaction will succeed, but it should not emit an event or change the state.
      await expect(
        sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive)
      ).to.not.emit(sintropAppStore, "ImpactAppVoted");
      
      app = await sintropAppStore.impactApps(1);
      // The count should remain the same.
      expect(app.positiveVotes).to.equal(1);
    });

    it("Should revert for an invalid ImpactApp ID", async function () {
        await expect(
            sintropAppStore.voteForImpactApp(999, VoteType.Positive)
        ).to.be.revertedWith("Invalid ImpactApp ID.");
    });
  });

  // Third group of tests: focused on the sustainability logic.
  describe("Sustainability Status", function () {
    beforeEach(async function () {
      await sintropAppStore.registerImpactApp("StatusApp", "Desc", "icon", "repo", "link", [owner.address]);
    });

    it("Should not be sustainable initially (0 votes)", async function () {
      // 0 > 0 is false.
      expect(await sintropAppStore.isImpactAppSustainable(1)).to.be.false;
    });

    it("Should be sustainable if positive votes are greater than negative votes", async function () {
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive);
      // 1 > 0 is true.
      expect(await sintropAppStore.isImpactAppSustainable(1)).to.be.true;
    });

    it("Should not be sustainable if votes are equal", async function () {
      await sintropAppStore.connect(addr1).voteForImpactApp(1, VoteType.Positive);
      await sintropAppStore.connect(addr2).voteForImpactApp(1, VoteType.Negative);
      // 1 > 1 is false.
      expect(await sintropAppStore.isImpactAppSustainable(1)).to.be.false;
    });
  });
});