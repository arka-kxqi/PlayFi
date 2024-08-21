const ethers = require('ethers');
const fs = require('fs');
const XLSX = require('xlsx');



const NodeUrl = 'https://b2-mainnet.alt.technology';
const provider = new ethers.getDefaultProvider(NodeUrl)



const contractAddress = '0x3FdaCd1C4fCbF43568C5f3d9E674aE9C9ba30847';

const contractABI = JSON.parse(fs.readFileSync('./nft_abi.json', 'utf-8'));

// 创建合约实例
const nftContract = new ethers.Contract(contractAddress, contractABI, provider);

let tokenOwners = [];

async function fetchTokenOwners() {
    for (let tokenId = 0; tokenId < 5223; tokenId++) {
        try {
            const owner = await nftContract.ownerOf(tokenId.toString());
            console.log(`Token ID: ${tokenId}, Owner: ${owner}`);
            tokenOwners.push([tokenId, owner]);
        } catch (error) {
            console.error(`Failed to fetch owner for token ID ${tokenId}: ${error.message}`);
        }
    }
    writeToExcel(tokenOwners);
    console.log('Finished fetching all token owners and writing to Excel.');
}

function writeToExcel(data) {
    const wb = XLSX.utils.book_new();
    const wsName = 'Token Owners';
    const wsData = [['Token ID', 'Owner Address'], ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);


    XLSX.utils.book_append_sheet(wb, ws, wsName);

    const exportFileName = 'TokenOwners.xlsx';
    XLSX.writeFile(wb, exportFileName);
    console.log(`Data written successfully to ${exportFileName}`);
}


fetchTokenOwners().then(r => console.log('Done') );