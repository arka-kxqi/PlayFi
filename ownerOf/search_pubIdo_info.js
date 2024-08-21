const ethers = require('ethers');
const fs = require('fs');
const XLSX = require('xlsx');

const NodeUrl = 'https://b2-mainnet.alt.technology';
const provider = new ethers.getDefaultProvider(NodeUrl)

const contractAddress = '0xE495303eA2463a0604c31B8f8239DFFad18765a3';
const contractABI = JSON.parse(fs.readFileSync('./public_fund_abi.json', 'utf-8'));

const nftContract = new ethers.Contract(contractAddress, contractABI, provider);

let tokenOwners = [];

async function fetchTokenOwners() {
    for (let tokenId = 1; tokenId < 39; tokenId++) {
        try {
            const arr = await nftContract.joinIdoInfo(tokenId.toString());

            const [address, joinIdoAmount, time] = arr;
            console.log(`Token ID: ${tokenId}, Address: ${address}, JoinIdoAmount: ${joinIdoAmount}, Time: ${time}`)


            const joinIdoAmountInEther = ethers.formatEther(joinIdoAmount);


            const timeNumber = Number(time);
            const timestamp = timeNumber * 1000;
            const formattedTime = new Date(timestamp).toLocaleString();


            tokenOwners.push([address, joinIdoAmountInEther, formattedTime]);
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
    const wsData = [['address', 'joinIdoAmount', 'time'], ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    XLSX.utils.book_append_sheet(wb, ws, wsName);

    const exportFileName = 'pubIdo_info.xlsx';
    XLSX.writeFile(wb, exportFileName);
    console.log(`Data written successfully to ${exportFileName}`);
}

fetchTokenOwners().then(() => console.log('Done'));
