const { ethers } = require("ethers");
const hre = require("hardhat");

// 配置你的私钥
const privateKey = "98110d6402509e6b9a5b18869b56c38e3740b9183cf492466694caeff2a9f258";

async function main() {
    // 连接到以太坊网络
    const provider = await hre.ethers.JsonRpcProvider("https://sepolia.rpc.zklink.io");
    const wallet = new ethers.Wallet(privateKey, provider);

    // 部署 GLDToken 合约
    const GLDToken = await hre.ethers.getContractFactory("SimpleNFT");
    const gldToken = await GLDToken.connect(wallet).deploy();
    await gldToken.waitForDeployment();

    // // 获取 SimpleNFT 合约地址
    // const gldTokenAddress = gldToken.address;
    // console.log("SimpleNFT deployed to:", gldTokenAddress);


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });