# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
# bonafide
## Getting Started
To run this project locally, follow these steps.

1. Clone the project locally, change into the directory, and install the dependencies
```bash

git clone https://github.com/edenchew12/bonafide-phase1.git

cd bonafide-phase1

# install using NPM or Yarn
npm install

# or

yarn
```
2. Create / add in .secret file with your private key (IMPT: NOT TO COMMIT TO GIT REPO)

3. Start the local Hardhat node
```
npx hardhat node
```
4. With the network running, deploy the contracts to the local network in a separate terminal window
```
npx hardhat run scripts/deploy.js --network localhost
```
Then copy paste NFTMarket and NFT address and replace the place holder on config.js

5. Start the app
```
npm run dev
```
Deploy Testnet Configuration
1. To deploy to Polygon test or main networks, update the configurations located in hardhat.config.js to use a private key and, optionally, deploy to a private RPC like Infura.

2. Add the following Mumbai Testnet Network to your Metamask wallet
```
Network Name: Mumbai TestNet
New RPC URL: https://rpc-mumbai.matic.today
Chain ID: 80001
Currency Symbol: Matic
```
3. To deploy to Matic, run the following command:
```
npx hardhat run scripts/deploy.js --network mumbai
```
Then copy paste NFTMarket and NFT address and replace the place holder on config.js
