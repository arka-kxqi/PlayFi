const ethers = require('ethers');
const fs = require('fs');
const XLSX = require('xlsx');

const NodeUrl = 'https://b2-mainnet.alt.technology';
const provider = new ethers.getDefaultProvider(NodeUrl);

const walletPrivateKey = 'YOUR_PRIVATE_KEY'; // 请替换为您的以太坊钱包私钥
const wallet = new ethers.Wallet(walletPrivateKey, provider);

const contractAddress = 'contractAddress';
const contractABI = JSON.parse(fs.readFileSync('./eon_abi.json', 'utf-8'));

const eonContract = new ethers.Contract(contractAddress, contractABI, wallet);



const workbook = XLSX.readFile('EON IDO Airdrop.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const range = XLSX.utils.decode_range(worksheet['!ref']);

let continueProcessing = true;
for (let i = range.s.r; i <= range.e.r && continueProcessing; i++) {
    const cellA = worksheet[XLSX.utils.encode_cell({ r: i, c: 0 })]; // A 列
    const cellD = worksheet[XLSX.utils.encode_cell({ r: i, c: 3 })]; // D 列

    if (i < 3 ) {
        console.log('skip section' , i);
        continue;
    }

    if (!cellA || !cellA.v || !ethers.isAddress(cellA.v)) {
        console.log('A The column address does not conform to the Ethereum address format');
        continue;
    }

    let address = cellA.v;

    let valueInEther = parseFloat(cellD.v);
    let valueInWei = ethers.parseEther(valueInEther.toString());

    console.log('A value:', address);
    console.log('D value:', valueInWei.toString());



    // 发送代币交易
    eonContract.transfer(address, valueInWei)
        .then((tx) => {
            console.log(address,'--walllet-- --Transaction Hash:', tx.hash);
            setTimeout(() => {
            }, 20000);

        })
        .catch((error) => {
            console.error('Error sending tokens:', error);
            continueProcessing = false;
        });
}

