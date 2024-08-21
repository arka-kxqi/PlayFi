const XLSX = require('xlsx');
const _ = require('lodash');


const workbook = XLSX.readFile('finalResult.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];


let data = XLSX.utils.sheet_to_json(sheet);

data = _.sortBy(data, ['Token ID']);

const newSheet = XLSX.utils.json_to_sheet(data);
const newWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sorted Data');

// 写入新的Excel文件
XLSX.writeFile(newWorkbook, 'newResult.xlsx');