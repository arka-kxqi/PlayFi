const ethers = require('ethers');
const fs = require('fs');
const XLSX = require('xlsx');
const axios = require('axios');

const NodeUrl = 'https://b2-mainnet-public.s.chainbase.com';
const provider = new ethers.getDefaultProvider(NodeUrl);

const contractAddress = '0x3FdaCd1C4fCbF43568C5f3d9E674aE9C9ba30847';
const contractABI = JSON.parse(fs.readFileSync('./nft_abi.json', 'utf-8'));

const nftContract = new ethers.Contract(contractAddress, contractABI, provider);

let tokenOwners = [];

async function fetchTokenOwnersWithMintTime() {
    const response = await axios.get('https://explorer.bsquared.network/api/?module=logs&action=getLogs&address=0x3FdaCd1C4fCbF43568C5f3d9E674aE9C9ba30847&fromBlock=2239514&toBlock=2256564&page=6&offset=1000&topic0=0xc6968bf6c0171f55b87087ceecec6075320b774e7f6cca631eb41fcf8da17b68&api_key=Bearer 291afe4e-a798-4075-8422-60755a8cfdf3');

    if (response.data.status === "1") {
        const transactions = response.data.result;
        for (const transaction of transactions) {
            const transactionHash = transaction.transactionHash;
            const eventLog = await provider.getTransactionReceipt(transactionHash);

            const nftMintedEvent = nftContract.interface.getEvent("Transfer");  //Transfer(address, address, uint256)
            const topic = ethers.utils.id(nftMintedEvent.name + "(" + nftMintedEvent.inputs.map(i => i.type).join(",") + ")");

            for (const log of eventLog.logs) {
                if (log.topics.includes(topic)) {

                    const address = ethers.BigNumber.from(log.topics[2]).toHexString();
                    const tokenId = ethers.BigNumber.from(log.topics[3]).toNumber();
                    console.log("tokenId:",tokenId,"address:", address);

                    tokenOwners.push([tokenId, address]);

                }
            }
        }

        writeToExcel(tokenOwners);
        console.log('已完成获取NFT拥有者信息并写入Excel。');
    } else {
        console.log('接口请求失败。');
    }
}

function writeToExcel(data) {
    const wb = XLSX.utils.book_new();
    const wsName = 'Token';
    const wsData = [['Token ID', 'Minter'], ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    XLSX.utils.book_append_sheet(wb, ws, wsName);

    const exportFileName = `TokenIdMinter.xlsx`;
    XLSX.writeFile(wb, exportFileName);
    console.log(`数据成功写入到 ${exportFileName}`);
}

fetchTokenOwnersWithMintTime().then(() => {
    console.log('开始...');
});