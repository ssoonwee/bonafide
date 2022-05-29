/* pages/resell-nft.js */
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import axios from 'axios'
import Web3Modal from 'web3modal'

import {
  marketplaceAddress
} from '../config'

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json'
import { list } from 'postcss'

export default function ViewNFT() {
  const [nft, setNft] = useState([])
  const [isSoldStatus, setSoldStatus] = useState(false)
  const [isAvailable, setAvailableStatus] = useState(false)
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [isOwner, setOwnerState] = useState(false)
  const [formInput, updateFormInput] = useState({ name: '', description: '', price: '', image: '' })
  const router = useRouter()
  const { id, tokenURI } = router.query
  const { name, status, description, image, listprice, tokenId } = formInput
  var mapStatus = {
          0 : 'Pending Verification',
          1: 'Rejected',
          2: 'Available',
          3: 'Hidden',
          4: 'Reserved',
          5: 'Sold',
          6: 'Unavailable'
      }
  useEffect(() => {
    fetchNFT()
  }, [id])

  async function fetchNFT() {
    if (!tokenURI) return
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const loggedOnAddress = await signer.getAddress()
    console.log(loggedOnAddress)
    let contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    let tokenInfo = contract.fetchANFT(id)
    let metaprice = await tokenInfo.then(result => result.price.toString())
    
    let price = ethers.utils.formatUnits(metaprice, 'ether')
    const meta = await axios.get(tokenURI)
    let status = await tokenInfo.then(result => result.status)
    let metaTokenId = await tokenInfo.then(result => result.tokenId.toString())
    let seller = await tokenInfo.then(result => result.seller)
    if(loggedOnAddress == seller){
      setOwnerState(true)
      if(status == 5){
        setSoldStatus(true)
      }
    }
    updateFormInput(state => ({ ...state, name: meta.data.name, image: meta.data.image, status: status, listprice: price, description: meta.data.description, tokenId: metaTokenId  }))
    let item = {
      price,
      tokenId: metaTokenId,
      seller: seller,
      owner: await tokenInfo.then(result => result.owner),
      image: meta.data.image,
      tokenURI,
      name: meta.data.name,
      status: status
    }
    setNft(item)
    setLoadingState('loaded')
    if(status == 2){
      setAvailableStatus(true)
    }
  }

  async function buyNFT() {
    /* needs the user to sign the transaction, so will use Web3Provider and sign it */
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    /* user will be prompted to pay the asking proces to complete the transaction */
    const price = ethers.utils.parseUnits(nft.price, 'ether')
    console.log(nft)   
    const transaction = await contract.createMarketSale(nft.tokenId, {
      value: price
    })
    await transaction.wait()
    loadNFTs()
  }

  async function resellNFT() {
    /* needs the user to sign the transaction, so will use Web3Provider and sign it */
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    let listingPrice = await contract.getListingPrice()

    /* user will be prompted to pay the asking proces to complete the transaction */
    const price = ethers.utils.parseUnits(nft.price, 'ether')
    console.log(price)
    const transaction = await contract.resellToken(nft.tokenId, price, {value: listingPrice})
    await transaction.wait()
    loadNFTs()
  }

  async function loadNFTs() {
    const web3Modal = new Web3Modal({
      network: 'mainnet',
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    const data = await contract.fetchItemsListed()

    const items = await Promise.all(data.map(async i => {
      const tokenUri = await contract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenUri)
      console.log(meta)
      let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
      let item = {
        price,
        tokenId: i.tokenId.toNumber(),
        seller: i.seller,
        owner: i.owner,
        image: meta.data.image,
        name: meta.data.name
      }
      return item
    }))}
  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <p className="text-2xl font-bold text-black">Name: {name}</p>
        <p className="text-2xl font-bold text-black">Price: {listprice} MATIC</p>
        <p className="text-2xl font-bold text-black">Description: {description} </p>
        <p className="text-2xl font-bold text-black">Status: {mapStatus[status]}</p>
        <p className="text-2xl font-bold text-black">Image:</p>
        {
          image && (
            <img className="rounded mt-4" width="350" src={image} />
          )
        }
        {
          (!isOwner && isAvailable) && (
        <button onClick={buyNFT} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
          Buy
        </button>
          )
        }
        {
          isSoldStatus && (
        <button onClick={resellNFT} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
          Resell
        </button>
          )
        }
      </div>
    </div>
  )
}

//To-DO:
//1. Add view-item page for individual NFT. (About done)
//2. Add authorize feature for verifier to verify NFT. -> Ensure homepage is able to load all verified NFT. (About done)
//3. Fix MarketSale function as it does not seem to transfer ownershiup successfully. 