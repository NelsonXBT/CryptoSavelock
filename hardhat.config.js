require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.26",
  networks: {
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
    }
  },
  etherscan: {
    // Use the new V2 config: just one key for all supported networks
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
