const { expect } = require("chai");
const { ethers } = require("hardhat");

/* test/sample-test.js */
describe("NFTMarket", function() {
  it("Should create and execute market sales", async function() {
    /* deploy the marketplace */
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace")
    const nftMarketplace = await NFTMarketplace.deploy()
    await nftMarketplace.deployed()

    let listingPrice = await nftMarketplace.getListingPrice()
    listingPrice = listingPrice.toString()

    const auctionPrice = ethers.utils.parseUnits('1', 'ether')

    /* create two tokens */
    await nftMarketplace.createToken("https://www.mytokenlocation.com", auctionPrice, { value: listingPrice })
    await nftMarketplace.createToken("https://www.mytokenlocation2.com", auctionPrice, { value: listingPrice })

    const [owner, addr1, buyerAddress, ...addrs] = await ethers.getSigners()
    const [a, approverAddress] = await ethers.getSigners()
    
    /* Add an authenticator to approve tokens */
    await nftMarketplace.addAuthorizedVerifiers(addr1.address)
    await nftMarketplace.connect(addr1).approveVerification(1)

    /* execute sale of token to another user */
    await nftMarketplace.connect(buyerAddress).createMarketSale(1, { value: auctionPrice })
    
    await nftMarketplace.connect(buyerAddress).toggleItemToAvailable(1)

    //await nftMarketplace.connect(buyerAddress).getItemStatus(1)

    /* resell a token */
    //await nftMarketplace.connect(buyerAddress).resellToken(1, auctionPrice, { value: listingPrice })

    /* query for and return the unsold items */
    items = await nftMarketplace.fetchMarketItems()
    items = await Promise.all(items.map(async i => {
      const tokenUri = await nftMarketplace.tokenURI(i.tokenId)
      let item = {
        price: i.price.toString(),
        tokenId: i.tokenId.toString(),
        seller: i.seller,
        owner: i.owner,
        tokenUri,
        status: i.status
      }
      return item
    }))
    console.log('items: ', items)
    /* Query for those items that are not verified using addr1 as approver address viewing */
    pendingItems = await nftMarketplace.connect(addr1).fetchPendVerifyItems()
    pendingItems = await Promise.all(pendingItems.map(async i => {
      const tokenUri = await nftMarketplace.tokenURI(i.tokenId)
      let item = {
        price: i.price.toString(),
        tokenId: i.tokenId.toString(),
        seller: i.seller,
        owner: i.owner,
        tokenUri,
        status: i.status
      }
      return item
    }))
    console.log('items pending verification: ', pendingItems)
    allItems = await nftMarketplace.fetchAllItems()
    allItems = await Promise.all(allItems.map(async i => {
      const tokenUri = await nftMarketplace.tokenURI(i.tokenId)
      let item = {
        price: i.price.toString(),
        tokenId: i.tokenId.toString(),
        seller: i.seller,
        owner: i.owner,
        tokenUri,
        status: i.status
      }
      return item
    }))
    console.log('All items: ', allItems)
    })
    
})
