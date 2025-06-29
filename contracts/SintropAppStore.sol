// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title SintropAppStore v.1.0.0
 * @author Sintrop
 * @notice A decentralized appStore for listing impact smart contract applications.
 * This contract acts as a gateway for applications to be listed on Sintrop Core.
 * Vote on registered apps ou register your new impactApp.
 * @dev This contract allows users to register ImpactApps, vote on their impact, and determine their approval status dynamically.
 */
contract SintropAppStore {
  // --- Data Types ---

  /// @notice Represents a ImpactApp listed in the SintropAppStore.
  /// @dev Contains ImpactApp metadata and impact voting information. The sustainability status is dynamic.
  struct ImpactApp {
    uint256 id; /// @notice Unique ID of the ImpactApp.
    address publisher; /// @notice Wallet address that published the ImpactApp.
    string name; /// @notice Name of the ImpactApp.
    string description; /// @notice Detailed description of the ImpactApp.
    string icon; /// @notice URL to an icon image.
    string repositoryUrl; /// @notice URL to the code repository (e.g., GitHub, GitLab).
    string externalLink; /// @notice URL to the ImpactApp's website or external interface.
    address[] contractAddresses; /// @notice List of smart contract addresses that compose the ImpactApp.
    uint256 positiveVotes; /// @notice Count of positive votes for socio-environmental impact.
    uint256 negativeVotes; /// @notice Count of negative votes for socio-environmental impact.
  }

  /// @notice Represents a wallet's vote for a ImpactApp.
  /// @dev Maps the ImpactApp ID and wallet address to the vote type (positive/negative).
  enum VoteType {
    None, /// @notice No vote given.
    Positive, /// @notice Positive vote for socio-environmental impact.
    Negative /// @notice Negative vote for socio-environmental impact.
  }

  // --- State Variables ---

  /// @notice Total counter of ImpactApps registered in the SintropAppStore.
  /// @dev Used to generate unique IDs for new ImpactApps.
  uint256 public impactAppsCount;

  /// @notice Mapping of ImpactApp IDs to their complete information.
  mapping(uint256 => ImpactApp) public impactApps;

  /// @notice Mapping of `impactAppId => voterAddress => VoteType` to track each wallet's votes.
  mapping(uint256 => mapping(address => VoteType)) public impactAppVotes;

  // --- Events ---

  /// @notice Emitted when a new ImpactApp is registered in the SintropAppStore.
  /// @param impactAppId The unique ID of the registered ImpactApp.
  /// @param name The name of the ImpactApp.
  /// @param publisher The wallet address that registered the ImpactApp.
  event ImpactAppRegistered(uint256 indexed impactAppId, string name, address indexed publisher);

  /// @notice Emitted when a wallet votes on a ImpactApp.
  /// @param impactAppId The ID of the ImpactApp voted on.
  /// @param voter The address of the wallet that voted.
  /// @param voteType The type of vote (Positive or Negative).
  event ImpactAppVoted(uint256 indexed impactAppId, address indexed voter, VoteType voteType);

  // --- Functions ---

  /**
   * @notice Registers a new application (ImpactApp) in the SintropAppStore.
   * @dev Any user can register a ImpactApp. String fields cannot be empty and have length limits.
   * The list of contract addresses must contain at least one address.
   * @param _name Name of the application.
   * @param _description Description of the application.
   * @param _icon Foto or image URL used as app icon.
   * @param _repositoryUrl URL to the code repository (e.g., GitHub, GitLab).
   * @param _externalLink URL to the ImpactApp's website or external interface.
   * @param _contractAddresses List of smart contract addresses that compose the ImpactApp.
   */
  function registerImpactApp(
    string memory _name,
    string memory _description,
    string memory _icon,
    string memory _repositoryUrl,
    string memory _externalLink,
    address[] memory _contractAddresses
  ) public {
    // Input validation
    require(bytes(_name).length > 0 && bytes(_name).length <= 100, "Name must be between 1 and 100 characters.");
    require(
      bytes(_description).length > 0 && bytes(_description).length <= 1000,
      "Description must be between 1 and 1000 characters."
    );
    require(bytes(_icon).length > 0 && bytes(_icon).length <= 150, "Icon must be between 1 and 150 characters.");
    require(
      bytes(_repositoryUrl).length > 0 && bytes(_repositoryUrl).length <= 200,
      "Repository URL must be between 1 and 200 characters."
    );
    require(
      bytes(_externalLink).length > 0 && bytes(_externalLink).length <= 200,
      "External link must be between 1 and 200 characters."
    );
    require(_contractAddresses.length > 0, "Must include at least one contract address.");

    impactAppsCount++;
    uint256 newImpactAppId = impactAppsCount;

    // Create and store the new ImpactApp
    impactApps[newImpactAppId] = ImpactApp({
      id: newImpactAppId,
      publisher: msg.sender,
      name: _name,
      description: _description,
      icon: _icon,
      repositoryUrl: _repositoryUrl,
      externalLink: _externalLink,
      contractAddresses: _contractAddresses, // Copy the array of addresses
      positiveVotes: 0,
      negativeVotes: 0
    });

    emit ImpactAppRegistered(newImpactAppId, _name, msg.sender);
  }

  /**
   * @notice Allows a wallet to vote positively or negatively on a ImpactApp's socio-environmental impact.
   * @dev Each wallet can vote only once per ImpactApp. Voting again on the same ImpactApp with the same vote type changes nothing.
   * Voting again with a different vote type will change the vote and adjust the counts.
   * @param _impactAppId The ID of the ImpactApp to be voted on.
   * @param _voteType The type of vote: `VoteType.Positive` for impact, `VoteType.Negative` for no impact.
   */
  function voteForImpactApp(uint256 _impactAppId, VoteType _voteType) public {
    require(_impactAppId > 0 && _impactAppId <= impactAppsCount, "Invalid ImpactApp ID.");
    require(_voteType == VoteType.Positive || _voteType == VoteType.Negative, "Invalid vote type.");

    ImpactApp storage impactappToVote = impactApps[_impactAppId]; // Use `storage` to modify directly

    VoteType existingVote = impactAppVotes[_impactAppId][msg.sender];

    // If the existing vote is different from the new vote
    if (existingVote != _voteType) {
      // Revert the previous vote, if any
      if (existingVote == VoteType.Positive) {
        impactappToVote.positiveVotes--;
      } else if (existingVote == VoteType.Negative) {
        impactappToVote.negativeVotes--;
      }

      // Apply the new vote
      if (_voteType == VoteType.Positive) {
        impactappToVote.positiveVotes++;
      } else {
        // _voteType == VoteType.Negative
        impactappToVote.negativeVotes++;
      }

      // Store the user's new vote
      impactAppVotes[_impactAppId][msg.sender] = _voteType;

      emit ImpactAppVoted(_impactAppId, msg.sender, _voteType);
    }
  }

  /**
   * @notice Dynamically checks if a ImpactApp is considered sustainable based on its votes.
   * @dev A ImpactApp is considered sustainable if it has more positive votes than negative votes.
   * This is a `view` function and does not modify the contract's state.
   * @param _impactAppId The ID of the ImpactApp to be checked.
   * @return bool True if the ImpactApp is considered sustainable, false otherwise.
   */
  function isImpactAppSustainable(uint256 _impactAppId) public view returns (bool) {
    require(_impactAppId > 0 && _impactAppId <= impactAppsCount, "Invalid ImpactApp ID.");

    ImpactApp memory impactapp = impactApps[_impactAppId]; // Use `memory` for reading in a view function

    // Sustainability logic: more positive votes than negative.
    return impactapp.positiveVotes > impactapp.negativeVotes;
  }
}
