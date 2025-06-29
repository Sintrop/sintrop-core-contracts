// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

/**
 * @title Free Education Center
 * @author Sintrop
 * @notice A decentralized platform for users to publish and access free educational content.
 * @dev This contract manages the storage and retrieval of content entries, each identified by a unique ID.
 * It emphasizes public access and user contribution.
 */
contract FreeEducationCenter {
  // --- State Variables ---

  /// @notice A counter for the total number of content entries published in the center.
  /// @dev This variable is incremented for each new piece of content added and serves as the unique ID for new content.
  uint256 public contentsCount;

  /// @notice Stores all content entries, mapped by their unique ID.
  /// @dev This mapping allows efficient retrieval of content using its `id`.
  mapping(uint256 => Content) public contents;

  // --- Structs ---

  /// @notice Represents a single educational content entry within the Free Education Center.
  /// @dev Each content piece includes metadata and links to the actual content.
  struct Content {
    uint256 id; ///< @notice The unique identifier for this content entry.
    string title; ///< @notice The title of the educational content.
    string description; ///< @notice A brief description of the content.
    string url; ///< @notice The URL or IPFS CID pointing to the actual content resource.
    string photo; ///< @notice The URL or IPFS CID for a representative image or thumbnail.
  }

  // --- Events ---

  /// @notice Emitted when a new educational content entry is successfully published.
  /// @param id The unique ID assigned to the new content.
  /// @param title The title of the published content.
  /// @param publisher The address of the user who published the content.
  event ContentPublished(uint256 indexed id, string title, address indexed publisher);

  // --- Public Functions ---

  /**
   * @notice Publishes a new educational content entry to the Free Education Center.
   * @dev Increments the `contentsCount` to generate a new unique ID, stores the content details,
   * and emits a `ContentPublished` event for off-chain indexing.
   * Basic input validation is included to ensure content is not empty and respects length limits.
   * @param _title The title of the educational content. Cannot be empty and must be less than 50 characters.
   * @param _description A brief description of the content. Cannot be empty and must be less than 500 characters.
   * @param _url The URL or IPFS CID pointing to the actual content resource. Cannot be empty and must be less than 200 characters.
   * @param _photo The URL or IPFS CID for a representative image or thumbnail. Can be empty and must be less than 200 characters if provided.
   */
  function addContent(
    string memory _title,
    string memory _description,
    string memory _url,
    string memory _photo
  ) public {
    // Input validation for string lengths and non-empty fields.
    require(bytes(_title).length > 0 && bytes(_title).length < 50, "FEC: Title must be between 1 and 49 characters");
    require(
      bytes(_description).length > 0 && bytes(_description).length < 500,
      "FEC: Description must be between 1 and 499 characters"
    );
    require(bytes(_url).length > 0 && bytes(_url).length < 200, "FEC: URL must be between 1 and 199 characters");
    // _photo can be empty, but if not empty, it must respect the length limit.
    require(bytes(_photo).length < 200, "FEC: Photo URL must be less than 199 characters");

    contentsCount++; // Increment count to get the next ID
    uint256 newId = contentsCount; // Use the new count as the ID

    // Store the new content entry in the mapping
    contents[newId] = Content(newId, _title, _description, _url, _photo);

    // Emit an event to allow off-chain applications to track new content.
    emit ContentPublished(newId, _title, msg.sender);
  }

  /**
   * @notice Retrieves a specific educational content entry by its ID.
   * @dev Provides a read-only interface to fetch content details.
   * Will revert if the provided `_id` does not correspond to an existing content entry.
   * @param _id The unique ID of the content to retrieve.
   * @return Content The `Content` struct containing all details for the requested entry.
   */
  function getContent(uint256 _id) public view returns (Content memory) {
    // Ensure the requested ID exists and is within the valid range.
    require(_id > 0 && _id <= contentsCount, "FEC: Content ID does not exist");
    return contents[_id];
  }
}
