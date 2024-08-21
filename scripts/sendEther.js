const hre = require("hardhat");
const { ethers, network } = require("hardhat");

async function main() {
    const [deployer, addr1, addr2] = await hre.ethers.getSigners(); // 获取部署者账户
    const targetContractAddress = "0xaEE762Ed710DA0DBC31c2f6E877055328143f6f7"; // 替换为你的目标合约地址
    // const targetContractAddress = "0xc9d994e2e2614be1218afb55104723c2c2b8aa13";


    const tx = await addr1.sendTransaction({
        to: targetContractAddress,
        value: hre.ethers.parseEther("9.0") // 1 Ether
    });


    await tx.wait();
    console.log(`Sent 1 Ether to ${targetContractAddress}`);

    const messageHash = "0x1fd06650b7adddbf74cf5813c60af5d77b09cf604b55ee8bef4c91eb268303ad"

    // 用addr1签名
    const signature1 = await addr1.signMessage(messageHash);
    console.log(`addr1 signed message hash: ${messageHash}`);
    console.log(`addr1 signature: ${signature1}`);

    // 用addr2签名
    const signature2 = await addr2.signMessage(messageHash);
    console.log(`addr2 signed message hash: ${messageHash}`);
    console.log(`addr2 signature: ${signature2}`);

    // 去掉signature2开头的0x并拼接
    const combinedSignature = `${signature1}${signature2.slice(2)}`;
    console.log(`Combined signature: ${combinedSignature}`);
    // 手动触发挖矿
    await network.provider.send("evm_mine");

    // 获取地址的余额
    const balance =  await ethers.provider.getBalance(targetContractAddress);
    console.log(`Balance of ${targetContractAddress}: ${ethers.formatEther(balance)} Ether`);




}
// npx hardhat run scripts/sendEther.js --network localhost
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });