const fs = require('fs');
const csv = require('csv-parser');
const moment = require('moment');

// 1. 发起合约调用并记录交易
// 调用合约函数成功后有个回调, 获得了钱包地址和调用时间
const walletAddress = '0xc6a96692cd5f1ce76c569cabb8a5316842d989d8';  // example
const callTime = new Date().toUTCString();

// 2. 将交易记录写入CSV文件,如果地址存在则更新调用时间
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: 'claim_check.csv',
    header: [
        {id: 'walletAddress', title: 'Wallet Address'},
        {id: 'callTime', title: 'Call Time'}
    ]
});

const writeTransactionToCsv = (data) => {
    csvWriter.writeRecords(data)
        .then(() => console.log('Transaction recorded successfully'))
        .catch(err => console.error('Error writing transaction to CSV:', err));
};

// 检查CSV文件是否存在，如果不存在则创建新文件
if (!fs.existsSync('claim_check.csv')) {
    fs.writeFileSync('claim_check.csv', '');
}

const data = [
    { walletAddress, callTime }
];

writeTransactionToCsv(data);


// 3. 读取CSV文件并验证时间
fs.createReadStream('claim_check.csv')
    .pipe(csv())
    .on('data', (row) => {
        const timeDiff = moment().diff(moment(new Date(row.callTime)), 'days');
        if (timeDiff > 30 && row.walletAddress === walletAddress) {
            console.log('You can claim again.');
        } else {
            console.log('Cannot claim yet.');
        }
    })
    .on('end', () => {
        console.log('CSV file processed');
    });