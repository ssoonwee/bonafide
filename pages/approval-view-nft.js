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

export default function ApprovalViewNFT() {
  const [nft, setNft] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
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
    let contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    let tokenInfo = contract.fetchANFT(id)
    let metaprice = await tokenInfo.then(result => result.price.toString())
    let price = ethers.utils.formatUnits(metaprice, 'ether')
    const meta = await axios.get(tokenURI)
    let status = await tokenInfo.then(result => result.status)
    let metaTokenId = await tokenInfo.then(result => result.tokenId.toString())
    updateFormInput(state => ({ ...state, name: meta.data.name, image: meta.data.image, status: status, listprice: price, description: meta.data.description, tokenId: metaTokenId  }))
    // const item = await Promise.all(tokenInfo.map(async i => {
    //   const tokenURI = await marketplaceContract.tokenURI(i.tokenId)
    //   const meta = await axios.get(tokenURI)
    //   let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
    //   let item = {
    //     price,
    //     tokenId: i.tokenId.toNumber(),
    //     seller: i.seller,
    //     owner: i.owner,
    //     image: meta.data.image,
    //     tokenURI,
    //     name: meta.data.name,
    //     status: mapStatus[i.status]
    //   }
    //   return item
    // }
    //setNft(item)
    //setLoadingState('loaded') 
  }
    // let listPrice = ethers.utils.formatUnits(tokenInfo[3].toString, 'ether')
    // let status = await tokenInfo.then(result => result.status)
    // console.log(listPrice)
  //
  //}

  async function approveNFTForSale() {
    if (!tokenId) return
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    //const priceFormatted = ethers.utils.parseUnits(formInput.price, 'ether')
    let contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    let transaction = contract.approveVerification(tokenId)
    //let listingPrice = await contract.getListingPrice()

    //listingPrice = listingPrice.toString()
    //let transaction = await contract.resellToken(id, priceFormatted, { value: listingPrice })

    router.push('/')
  }

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
        <button onClick={approveNFTForSale} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
          Approve Verification
        </button>
      </div>
    </div>
  )
}