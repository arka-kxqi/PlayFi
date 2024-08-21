const ethers = require('ethers');
const fs = require('fs');
const XLSX = require('xlsx');


// https://rpc.bsquared.network
// https://b2-mainnet.alt.technology
// https://b2-mainnet-public.s.chainbase.com
const NodeUrl = 'https://b2-mainnet-public.s.chainbase.com';
const provider = new ethers.getDefaultProvider(NodeUrl);

const contractAddress = '0x3FdaCd1C4fCbF43568C5f3d9E674aE9C9ba30847';
const contractABI = JSON.parse(fs.readFileSync('./nft_abi.json', 'utf-8'));

const nftContract = new ethers.Contract(contractAddress, contractABI, provider);

let tokenOwners = [];

async function fetchTokenOwnersWithMintTime(startBlockNumber, endBlockNumber) {
    const nftMintedEvent = nftContract.interface.getEvent("NFTMinted");  //NFTMinted  Transfer
    const topic = ethers.utils.id(nftMintedEvent.name + "(" + nftMintedEvent.inputs.map(i => i.type).join(",") + ")");

    const filter = {
        address: contractAddress,
        topics: [topic],
        fromBlock: startBlockNumber,
        toBlock: endBlockNumber,
    };
    console.log("开始监听...",topic)
    nftContract.on(filter, (owner, tokenId, uri, isWhitelisted, event) => {
        const blockNumber = event.blockNumber;
        console.log(`已扫描完一个块，Token ID: ${tokenId.toString()}, 拥有者: ${owner}, URI: ${uri}, 是否在白名单: ${isWhitelisted}, 区块号: ${blockNumber}`);
        tokenOwners.push([tokenId.toString(), owner, uri, isWhitelisted, blockNumber]);

        if (blockNumber >= endBlockNumber) {
            nftContract.removeAllListeners(filter);
            writeToExcel(tokenOwners);
            console.log('已完成获取NFT拥有者信息并写入Excel。');
        }
    });
}

function writeToExcel(data) {
    const wb = XLSX.utils.book_new();
    const wsName = 'Token';
    const wsData = [['Token ID', 'Owner', 'URI', 'Whitelisted', 'Block Number'], ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    XLSX.utils.book_append_sheet(wb, ws, wsName);

    const exportFileName = `Token-${startBlockNumber}-${endBlockNumber}.xlsx`;
    XLSX.writeFile(wb, exportFileName);
    console.log(`数据成功写入到 ${exportFileName}`);
}

// 指定起始和结束区块号                          2432473
const startBlockNumber = 2239514;  //    2239514
const endBlockNumber = 2432472;    //    2256564

fetchTokenOwnersWithMintTime(startBlockNumber, endBlockNumber).then(() => {
    console.log('开始...');
});