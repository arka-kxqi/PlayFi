const hre = require("hardhat");



async function main() {
    const [deployer] = await hre.ethers.getSigners(); // Obtain deployer account
    // Deploy  GLDToken
    const GLDToken = await hre.ethers.getContractFactory("GLDToken");
    const gldToken = await GLDToken.deploy("10000000000000000000000"); // Assuming an initial supply of 10000 GLD
    await gldToken.waitForDeployment();
    // Deploy AIStarterPublicSale
    const rewardTokenAddress = await gldToken.getAddress().then((address) => {
        console.log("GLDToken deployed to:", address);
        return address;
    });
    const joinIdoPrice = "1000000000000000000"; // Assuming the IDO price is 1 token, use wei as the unit
    const rewardAmount = "5000000000000000000000"; // Assuming the reward amount is 5000 tokens, use wei as the unit
    const mFundAddress = "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097"; // Example of funding address
    const root = "0xfabf435885093061c20b6df39024235df5d84fe9ad8bf25f56f02979dbb969d8"; // An example of Merkle tree root, which needs to be of type bytes32
    const args = [
        rewardTokenAddress,
        joinIdoPrice,
        rewardAmount,
        mFundAddress,
        root
    ];
    const AIStarterPublicSale = await hre.ethers.getContractFactory("AIStarterPublicSale");
    const aiStarterPublicSale = await AIStarterPublicSale.deploy(...args);
    await aiStarterPublicSale.waitForDeployment();
    await aiStarterPublicSale.getAddress().then((address) => {
        console.log("AIStarterPublicSale deployed to:", address);
        return address;
    });


    // GLDToken sends some tokens to AIStarterPublicSale
    const transferAmount = "5000000000000000000000"; // send 5000 GLD
    const transferTx = await gldToken.connect(deployer).transfer(aiStarterPublicSale, transferAmount);
    await transferTx.wait(); // 等待交易确认

    console.log(`Transferred ${transferAmount} GLD to AIStarterPublicSale`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });