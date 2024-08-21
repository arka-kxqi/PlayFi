const ethers = require('ethers');
const fs = require('fs');
const XLSX = require('xlsx');

const NodeUrl = 'https://b2-mainnet.alt.technology';
const provider = new ethers.getDefaultProvider(NodeUrl)

const contractAddress = '0x483371489f0cBea9a717630F469515dD6D169Ebb';
const contractABI = JSON.parse(fs.readFileSync('./new_starter_abi.json', 'utf-8'));

const nftContract = new ethers.Contract(contractAddress, contractABI, provider);

let tokenOwners = [];

async function fetchTokenOwners() {
    for (let tokenId = 1; tokenId < 433; tokenId++) {
        try {
            const arr = await nftContract.joinIdoInfo(tokenId.toString());

            const [address, joinIdoAmount, time] = arr;



            const joinIdoAmountInEther = ethers.formatEther(joinIdoAmount);


            const timeNumber = Number(time);
            const timestamp = timeNumber * 1000;
            const formattedTime = new Date(timestamp).toLocaleString();

            const paraList = await nftContract.getParameters(address);
            console.log(`Token ID: ${tokenId}, Address: ${address}, JoinIdoAmount: ${joinIdoAmount}, Time: ${time} ,paraList[8]: ${ ethers.formatEther(paraList[8])}`)


            tokenOwners.push([address, joinIdoAmountInEther, formattedTime,  ethers.formatEther(paraList[8]),  ethers.formatEther(paraList[10])]);
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
    const wsData = [['address', 'joinIdoAmount', 'time','should obtain','received'], ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    XLSX.utils.book_append_sheet(wb, ws, wsName);

    const exportFileName = 'CLOT_ido_info.xlsx';
    XLSX.writeFile(wb, exportFileName);
    console.log(`Data written successfully to ${exportFileName}`);
}

fetchTokenOwners().then(() => console.log('Done'));
