/* pages/my-nfts.js */
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from 'web3modal'
import { useRouter } from 'next/router'

import {
  marketplaceAddress
} from '../config'

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json'

export default function PendingApprovalAssets() {
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const router = useRouter()
  useEffect(() => {
    loadNFTs()
  }, [])
  async function loadNFTs() {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    const marketplaceContract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    const data = await marketplaceContract.fetchPendVerifyItems()
    console.log(data)

    const items = await Promise.all(data.map(async i => {
      const tokenURI = await marketplaceContract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenURI)
      let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
      var mapStatus = {
          0 : 'Pending Verification',
          1: 'Rejected',
          2: 'Available',
          3: 'Hidden',
          4: 'Reserved',
          5: 'Sold',
          6: 'Unavailable'
      }
      let item = {
        price,
        tokenId: i.tokenId.toNumber(),
        seller: i.seller,
        owner: i.owner,
        image: meta.data.image,
        tokenURI,
        name: meta.data.name,
        status: mapStatus[i.status]
      }
      return item
    }))
    setNfts(items)
    setLoadingState('loaded') 
  }

  function viewNFT(nft) {
    router.push(`/approval-view-nft?id=${nft.tokenId}&tokenURI=${nft.tokenURI}`)  
  }
  if (loadingState === 'loaded' && !nfts.length) return (<h1 className="py-10 px-20 text-3xl">No NFTs pending verification</h1>)
  return (
    <div className="flex justify-center">
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <img src={nft.image} className="rounded" />
                <div className="p-4 bg-black">
                  <p className="text-2xl font-bold text-white">{nft.name}</p>
                  <p className="text-2xl font-bold text-white">Price - {nft.price} MATIC</p>
                  <p className="text-2xl font-bold text-white">Status - {nft.status}</p>
                  <button className="mt-4 w-full bg-pink-500 text-white font-bold py-2 px-12 rounded" onClick={() => viewNFT(nft)}>View</button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}