/* pages/create-nft.js */
import { useState } from 'react'
import { ethers } from 'ethers'
import { create as ipfsHttpClient } from 'ipfs-http-client'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

import {
  marketplaceAddress
} from '../config'

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json'

export default function AddVerifier() {
  //const [formInput, updateFormInput] = useState({ price: '', name: '', description: '' })
  const [formInput, updateFormInput] = useState({ address: '' })
  const router = useRouter()

  async function addVerifier() {
    const { address } = formInput
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const verifierAddress = ethers.utils.getAddress(address)

    /* create the NFT */
    //const price = ethers.utils.parseUnits(formInput.price, 'ether')
    let contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    //let listingPrice = await contract.getListingPrice()
    //listingPrice = listingPrice.toString()
    //let transaction = await contract.createToken(url, price, { value: listingPrice })
    let transaction = await contract.addAuthorizedVerifiers(verifierAddress);
    await transaction.wait()
    console.log(transaction)
    router.push('/')
  }

  async function removeVerifier() {
    const { address } = formInput
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const verifierAddress = ethers.utils.getAddress(address)

    /* create the NFT */
    //const price = ethers.utils.parseUnits(formInput.price, 'ether')
    let contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    //let listingPrice = await contract.getListingPrice()
    //listingPrice = listingPrice.toString()
    //let transaction = await contract.createToken(url, price, { value: listingPrice })
    let transaction = await contract.removeAuthorizedVerifiers(verifierAddress);
    await transaction.wait()
    console.log(transaction)
    router.push('/')
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input 
          placeholder="Verifier Address"
          className="mt-8 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, address: e.target.value })}
        />
        <button onClick={addVerifier} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
          Add Verifier
        </button>
        <button onClick={removeVerifier} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
          Remove Verifier
        </button>
      </div>
    </div>
  )
}