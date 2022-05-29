// SPDX-License-Identifier: MIT
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "hardhat/console.sol";

contract NFTMarketplace is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    Counters.Counter private _itemsPendingVerification;
    Counters.Counter private _itemsAvailable;

    uint256 listingPrice = 1 ether;
    address payable owner;

    mapping(uint256 => MarketItem) private idToMarketItem;
    mapping(address => bool) private authorizedVerifiers;

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    enum ItemStatus {
        PendingVerification, //Item in this state would be pending verification from a verifier.
        RejectedVerification, //Item in this state would require review from seller to update existing information.
        AvailableItem, //Item in this state would be publicly viewable and no one has reserved this yet.
        HiddenItem, //Item in this state would not be publicly viewable unless user sets it to available.
        ReservedItem, //Item in this state has been reserved by a user.
        SoldItem, //Item in this state has been sold
        DestroyedItem //Item in this state has been burned. No recovery can be done.
    }

    struct MarketItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        ItemStatus status;
    }

    event MarketItemCreated(
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    constructor() ERC721("Metaverse Tokens", "METT") {
        owner = payable(msg.sender);
    }

    function addAuthorizedVerifiers(address user) public onlyOwner {
        //Only admin function
        authorizedVerifiers[user] = true;
    }

    function removeAuthorizedVerifiers(address user) public onlyOwner {
        //Only admin function
        authorizedVerifiers[user] = false;
    }

    function approveVerification(uint256 itemId) public {
        require(
            authorizedVerifiers[msg.sender] == true,
            "Invalid User to approve verification"
        );
        require(
            idToMarketItem[itemId].tokenId == itemId,
            "Item does not exists."
        );
        idToMarketItem[itemId].status = ItemStatus.AvailableItem;
        _itemsPendingVerification.decrement();
        _itemsAvailable.increment();
    }

    function rejectVerification(uint256 itemId) public {
        require(
            authorizedVerifiers[msg.sender] == true,
            "Invalid User to approve verification"
        );
        require(
            idToMarketItem[itemId].tokenId == itemId,
            "Item does not exists."
        );
        idToMarketItem[itemId].status = ItemStatus.RejectedVerification;
    }

    /* Updates the listing price of the contract */
    function updateListingPrice(uint256 _listingPrice) public payable {
        require(
            owner == msg.sender,
            "Only marketplace owner can update listing price."
        );
        listingPrice = _listingPrice;
    }

    /* Returns the listing price of the contract */
    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    /* Mints a token and lists it in the marketplace */
    function createToken(string memory tokenURI, uint256 price)
        public
        payable
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        createMarketItem(newTokenId, price);
        return newTokenId;
    }

    function createMarketItem(uint256 tokenId, uint256 price) private {
        require(price > 0, "Price must be at least 1 wei");
        require(
            msg.value == listingPrice,
            "Price must be equal to listing price"
        );

        idToMarketItem[tokenId] = MarketItem(
            tokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            ItemStatus.PendingVerification
        );
        _itemsPendingVerification.increment();
        _transfer(msg.sender, address(this), tokenId);
        emit MarketItemCreated(tokenId, msg.sender, msg.sender, price, false);
    }

    /* allows someone to resell a token they have purchased */
    function resellToken(uint256 tokenId, uint256 price) public payable {
        require(
            idToMarketItem[tokenId].owner == msg.sender,
            "Only item owner can perform this operation"
        );
        require(
            msg.value == listingPrice,
            "Price must be equal to listing price"
        );
        require(
            msg.sender == idToMarketItem[tokenId].owner,
            "Unauthorized user of this item. Please log in to the correct wallet."
        );
        require(
            idToMarketItem[tokenId].status == ItemStatus.SoldItem,
            "Item cannot be resold. Please verify item before making it publicly for sale."
        );
        idToMarketItem[tokenId].sold = false;
        idToMarketItem[tokenId].price = price;
        idToMarketItem[tokenId].seller = payable(msg.sender);
        idToMarketItem[tokenId].owner = payable(address(this));
        _itemsSold.decrement();

        _transfer(msg.sender, address(this), tokenId);
        idToMarketItem[tokenId].status = ItemStatus.AvailableItem;
        _itemsAvailable.increment();
    }

    function toggleItemToAvailable(uint256 tokenId) public {
        require(
            msg.sender == idToMarketItem[tokenId].owner,
            "Unauthorized user of this item. Please log in to the correct wallet."
        );
        require(
            idToMarketItem[tokenId].status == ItemStatus.SoldItem,
            "Please verify item before making it publicly for sale."
        );
        idToMarketItem[tokenId].status = ItemStatus.AvailableItem;
        _itemsAvailable.increment();
    }

    function getItemStatus(uint256 tokenId) public view returns (ItemStatus) {
        require(
            idToMarketItem[tokenId].status == ItemStatus.AvailableItem,
            "Item not available"
        );
        return idToMarketItem[tokenId].status;
    }

    /* Creates the sale of a marketplace item */
    /* Transfers ownership of the item, as well as funds between parties */
    function createMarketSale(uint256 tokenId) public payable {
        require(
            idToMarketItem[tokenId].status == ItemStatus.AvailableItem,
            "Not a valid item to be sold. Please verify item's validity."
        );
        uint256 price = idToMarketItem[tokenId].price;
        address seller = idToMarketItem[tokenId].seller;
        require(
            msg.value == price,
            "Please submit the asking price in order to complete the purchase"
        );
        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].sold = true;
        //idToMarketItem[tokenId].seller = payable(address(0));
        idToMarketItem[tokenId].seller = payable(msg.sender);
        _itemsSold.increment();
        _transfer(address(this), msg.sender, tokenId);
        payable(owner).transfer(listingPrice);
        payable(seller).transfer(msg.value);
        idToMarketItem[tokenId].status = ItemStatus.SoldItem;
        _itemsAvailable.decrement();
    }

    /* Returns all unsold market items */
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _tokenIds.current();
        //uint256 unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint256 availItem = _itemsAvailable.current();
        uint256 currentIndex = 0;
        MarketItem[] memory items = new MarketItem[](availItem);
        if (availItem > 0) {
            for (uint256 i = 0; i < itemCount; i++) {
                // if (
                //     idToMarketItem[i + 1].owner == address(this) &&
                //     idToMarketItem[i + 1].status == ItemStatus.AvailableItem
                // )
                if (idToMarketItem[i + 1].status == ItemStatus.AvailableItem) {
                    uint256 currentId = i + 1;
                    MarketItem storage currentItem = idToMarketItem[currentId];
                    items[currentIndex] = currentItem;
                    currentIndex += 1;
                }
            }
        }
        return items;
    }

    function fetchPendVerifyItems() public view returns (MarketItem[] memory) {
        require(
            authorizedVerifiers[msg.sender] == true,
            "Unauthorized viewing of items require pending verification."
        );
        uint256 itemCount = _tokenIds.current();
        //uint256 unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint256 pendingItem = _itemsPendingVerification.current();
        uint256 currentIndex = 0;
        MarketItem[] memory items = new MarketItem[](pendingItem);
        if (pendingItem > 0) {
            for (uint256 i = 0; i < itemCount; i++) {
                if (
                    idToMarketItem[i + 1].owner == address(this) &&
                    idToMarketItem[i + 1].status ==
                    ItemStatus.PendingVerification
                ) {
                    uint256 currentId = i + 1;
                    MarketItem storage currentItem = idToMarketItem[currentId];
                    items[currentIndex] = currentItem;
                    currentIndex += 1;
                }
            }
        }
        return items;
    }

    //Debugging function
    function fetchAllItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _tokenIds.current();
        uint256 unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        //uint256 pendingItem = _itemsPendingVerification.current();
        uint256 currentIndex = 0;
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            if (idToMarketItem[i + 1].owner == address(this)) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /* Returns only items that a user has purchased */
    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        if (itemCount == 0) {
            return items;
        }
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
            if (currentIndex == itemCount) {
                break;
            }
        }
        return items;
    }

    /* Returns only items a user has listed */
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchANFT(uint256 tokenID)
        public
        view
        returns (MarketItem memory)
    {
        return idToMarketItem[tokenID];
    }
}
// pragma solidity ^0.8.4;

// import "@openzeppelin/contracts/utils/Counters.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// import "hardhat/console.sol";

// contract NFTMarketplace is ERC721URIStorage {
//     using Counters for Counters.Counter;
//     Counters.Counter private _tokenIds;
//     Counters.Counter private _itemsSold;

//     uint256 listingPrice = 0.025 ether;
//     address payable owner;

//     mapping(uint256 => MarketItem) private idToMarketItem;

//     struct MarketItem {
//       uint256 tokenId;
//       address payable seller;
//       address payable owner;
//       uint256 price;
//       bool sold;
//     }

//     event MarketItemCreated (
//       uint256 indexed tokenId,
//       address seller,
//       address owner,
//       uint256 price,
//       bool sold
//     );

//     constructor() ERC721("Metaverse Tokens", "METT") {
//       owner = payable(msg.sender);
//     }

//     /* Updates the listing price of the contract */
//     function updateListingPrice(uint _listingPrice) public payable {
//       require(owner == msg.sender, "Only marketplace owner can update listing price.");
//       listingPrice = _listingPrice;
//     }

//     /* Returns the listing price of the contract */
//     function getListingPrice() public view returns (uint256) {
//       return listingPrice;
//     }

//     /* Mints a token and lists it in the marketplace */
//     function createToken(string memory tokenURI, uint256 price) public payable returns (uint) {
//       _tokenIds.increment();
//       uint256 newTokenId = _tokenIds.current();

//       _mint(msg.sender, newTokenId);
//       _setTokenURI(newTokenId, tokenURI);
//       createMarketItem(newTokenId, price);
//       return newTokenId;
//     }

//     function createMarketItem(
//       uint256 tokenId,
//       uint256 price
//     ) private {
//       require(price > 0, "Price must be at least 1 wei");
//       require(msg.value == listingPrice, "Price must be equal to listing price");

//       idToMarketItem[tokenId] =  MarketItem(
//         tokenId,
//         payable(msg.sender),
//         payable(address(this)),
//         price,
//         false
//       );

//       _transfer(msg.sender, address(this), tokenId);
//       emit MarketItemCreated(
//         tokenId,
//         msg.sender,
//         address(this),
//         price,
//         false
//       );
//     }

//     /* allows someone to resell a token they have purchased */
//     function resellToken(uint256 tokenId, uint256 price) public payable {
//       require(idToMarketItem[tokenId].owner == msg.sender, "Only item owner can perform this operation");
//       require(msg.value == listingPrice, "Price must be equal to listing price");
//       idToMarketItem[tokenId].sold = false;
//       idToMarketItem[tokenId].price = price;
//       idToMarketItem[tokenId].seller = payable(msg.sender);
//       idToMarketItem[tokenId].owner = payable(address(this));
//       _itemsSold.decrement();

//       _transfer(msg.sender, address(this), tokenId);
//     }

//     /* Creates the sale of a marketplace item */
//     /* Transfers ownership of the item, as well as funds between parties */
//     function createMarketSale(
//       uint256 tokenId
//       ) public payable {
//       uint price = idToMarketItem[tokenId].price;
//       address seller = idToMarketItem[tokenId].seller;
//       require(msg.value == price, "Please submit the asking price in order to complete the purchase");
//       idToMarketItem[tokenId].owner = payable(msg.sender);
//       idToMarketItem[tokenId].sold = true;
//       idToMarketItem[tokenId].seller = payable(address(0));
//       _itemsSold.increment();
//       _transfer(address(this), msg.sender, tokenId);
//       payable(owner).transfer(listingPrice);
//       payable(seller).transfer(msg.value);
//     }

//     /* Returns all unsold market items */
//     function fetchMarketItems() public view returns (MarketItem[] memory) {
//       uint itemCount = _tokenIds.current();
//       uint unsoldItemCount = _tokenIds.current() - _itemsSold.current();
//       uint currentIndex = 0;

//       MarketItem[] memory items = new MarketItem[](unsoldItemCount);
//       for (uint i = 0; i < itemCount; i++) {
//         if (idToMarketItem[i + 1].owner == address(this)) {
//           uint currentId = i + 1;
//           MarketItem storage currentItem = idToMarketItem[currentId];
//           items[currentIndex] = currentItem;
//           currentIndex += 1;
//         }
//       }
//       return items;
//     }

//     /* Returns only items that a user has purchased */
//     function fetchMyNFTs() public view returns (MarketItem[] memory) {
//       uint totalItemCount = _tokenIds.current();
//       uint itemCount = 0;
//       uint currentIndex = 0;

//       for (uint i = 0; i < totalItemCount; i++) {
//         if (idToMarketItem[i + 1].owner == msg.sender) {
//           itemCount += 1;
//         }
//       }

//       MarketItem[] memory items = new MarketItem[](itemCount);
//       for (uint i = 0; i < totalItemCount; i++) {
//         if (idToMarketItem[i + 1].owner == msg.sender) {
//           uint currentId = i + 1;
//           MarketItem storage currentItem = idToMarketItem[currentId];
//           items[currentIndex] = currentItem;
//           currentIndex += 1;
//         }
//       }
//       return items;
//     }

//     /* Returns only items a user has listed */
//     function fetchItemsListed() public view returns (MarketItem[] memory) {
//       uint totalItemCount = _tokenIds.current();
//       uint itemCount = 0;
//       uint currentIndex = 0;

//       for (uint i = 0; i < totalItemCount; i++) {
//         if (idToMarketItem[i + 1].seller == msg.sender) {
//           itemCount += 1;
//         }
//       }

//       MarketItem[] memory items = new MarketItem[](itemCount);
//       for (uint i = 0; i < totalItemCount; i++) {
//         if (idToMarketItem[i + 1].seller == msg.sender) {
//           uint currentId = i + 1;
//           MarketItem storage currentItem = idToMarketItem[currentId];
//           items[currentIndex] = currentItem;
//           currentIndex += 1;
//         }
//       }
//       return items;
//     }
// }
