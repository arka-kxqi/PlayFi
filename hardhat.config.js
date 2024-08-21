require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 8000000,
      blockGasLimit: "auto",
    },
    NovaTestnet: {
      url: "https://sepolia.rpc.zklink.io",
      gas: 8000000,
      chainId: 810181,
      blockGasLimit: "auto",
    },
    merlinTestnet: {
      url: "https://testnet-rpc.merlinchain.io",
      chainId: 686868,
      // accounts: [process.env.ACCOUNT_PRIVATE_KEY], 
    },
     merlinMainnet: {
      url: "https://rpc.merlinchain.io", 
      chainId: 4200,
      // accounts: [process.env.ACCOUNT_PRIVATE_KEY], 
    }
  },
  etherscan: {
    apiKey: {
      merlinTestnet: "ad1bfaac-5743-4262-8deb-1b319bcdac92",
      merlinMainnet: "ad1bfaac-5743-4262-8deb-1b319bcdac92",
    },
    customChains: [
      {
        network: "merlinTestnet",
        chainId: 686868,
        urls: {
          apiURL: "https://testnet-scan.merlinchain.io/api", 
          browserURL: "https://testnet-scan.merlinchain.io"
        }
      },
      {
        network: "merlinMainnet",
        chainId: 4200,
        urls: {
          apiURL: "https://scan.merlinchain.io/api", 
          browserURL: "https://scan.merlinchain.io"
        }
      }
    ]
  },
};
