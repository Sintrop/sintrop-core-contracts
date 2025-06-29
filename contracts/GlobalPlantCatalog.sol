// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title GlobalPlantCatalog
 * @author Sintrop
 * @notice A global and open catalog of plants and trees registered on the blockchain.
 * @dev This contract allows any user to add detailed information about plants,
 * storing it in a decentralized manner and associating it with the creator.
 * Image data (photos) are stored as hashes/URLs for off-chain content (e.g., IPFS).
 */
contract GlobalPlantCatalog {
  // --- Data Structures ---

  /**
   * @dev Structure representing a plant or tree in the catalog.
   * @param id Unique identifier of the plant.
   * @param popularName Popular name of the plant/tree.
   * @param scientificName Scientific name of the plant/tree.
   * @param taxonomy Full taxonomic classification (e.g., Kingdom, Phylum, Class, Order, Family, Genus, Species).
   * @param description A detailed description or additional information about the plant.
   * @param photoHashes An array of IPFS hashes or URLs for the plant's photos.
   * @param creator The wallet address that added this plant to the catalog.
   * @param createdAt The timestamp (block.timestamp) when the plant was added.
   */
  struct Plant {
    uint256 id;
    string popularName;
    string scientificName;
    string taxonomy;
    string description;
    string[] photoHashes;
    address creator;
    uint256 createdAt;
  }

  // --- State Variables ---

  /// @notice Mapping from plant ID to the complete Plant data structure.
  mapping(uint256 => Plant) public plants;

  /// @notice Mapping from creator address to an array of IDs of plants they have added.
  mapping(address => uint256[]) public creatorPlants;

  /// @notice Counter to generate unique IDs for each new plant. Also represents the total number of plants.
  uint256 public nextPlantId;

  // --- Events ---

  /**
   * @notice Emitted when a new plant is added to the catalog.
   * @param plantId The unique ID of the added plant.
   * @param creator The wallet address that added the plant.
   * @param popularName The popular name of the plant.
   * @param scientificName The scientific name of the plant.
   * @param createdAt The timestamp of the plant's creation.
   */
  event PlantAdded(
    uint256 indexed plantId,
    address indexed creator,
    string popularName,
    string scientificName,
    uint256 createdAt
  );

  // --- Functions ---

  /**
   * @notice Adds a new plant or tree to the global catalog.
   * @dev Anyone can call this function to register a plant.
   * Plant IDs are automatically incremented.
   * @param _popularName The popular name of the plant (e.g., "Rosewood").
   * @param _scientificName The scientific name of the plant (e.g., "Cariniana legalis").
   * @param _taxonomy The taxonomic classification (e.g., "Family: Lecythidaceae, Genus: Cariniana").
   * @param _description A description or additional information.
   * @param _photoHashes An array of strings containing IPFS hashes or URLs for the photos.
   */
  function addPlant(
    string memory _popularName,
    string memory _scientificName,
    string memory _taxonomy,
    string memory _description,
    string[] calldata _photoHashes
  ) public {
    uint256 currentId = nextPlantId;

    // Create and store the new Plant struct
    plants[currentId] = Plant(
      currentId,
      _popularName,
      _scientificName,
      _taxonomy,
      _description,
      _photoHashes, // Note: photoHashes is copied
      msg.sender,
      block.timestamp
    );

    // Associate the plant with its creator
    creatorPlants[msg.sender].push(currentId);

    // Increment the counter for the next ID
    nextPlantId++;

    // Emit the event for tracking
    emit PlantAdded(currentId, msg.sender, _popularName, _scientificName, block.timestamp);
  }

  /**
   * @notice Returns the details of a specific plant given its ID.
   * @param _plantId The unique ID of the plant to query.
   * @return Plant The complete plant data structure.
   */
  function getPlant(uint256 _plantId) public view returns (Plant memory) {
    require(_plantId < nextPlantId, "Plant ID does not exist");
    return plants[_plantId];
  }

  /**
   * @notice Returns the total number of plants registered in the catalog.
   * @return uint256 The total number of plants (equal to the current `nextPlantId`).
   */
  function getTotalPlantsCount() public view returns (uint256) {
    return nextPlantId;
  }

  /**
   * @notice Returns a list of all plant IDs that have been added to the catalog.
   * @dev Useful for off-chain applications that want to iterate over all plants.
   * WARNING: If the number of plants is very large (thousands), calling this function
   * can be gas-expensive (off-chain) to load all IDs.
   * Consider paginated iterations or querying by creator for very large catalogs.
   * @return uint256[] An array containing all registered plant IDs.
   */
  function getAllPlantIds() public view returns (uint256[] memory) {
    uint256[] memory allIds = new uint256[](nextPlantId);
    for (uint256 i = 0; i < nextPlantId; i++) {
      allIds[i] = i; // IDs are sequential from 0 to nextPlantId-1
    }
    return allIds;
  }

  /**
   * @notice Returns a list of plant IDs created by a specific address.
   * @param _creator The wallet address of the creator.
   * @return uint256[] An array of plant IDs created by the provided address.
   */
  function getPlantsByCreator(address _creator) public view returns (uint256[] memory) {
    return creatorPlants[_creator];
  }
}
