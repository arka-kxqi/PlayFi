const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const fs = require('fs');

const jsonString = fs.readFileSync('../gui/whiteList.json', 'utf8');
const WhiteList = JSON.parse(jsonString);


const leaves = WhiteList.map((x) => keccak256(x));
const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const rootHash = '0x' + merkleTree.getRoot().toString('hex');

// 从命令行参数中获取钱包地址
const walletAddress = process.argv[2];
const leaf = keccak256(walletAddress);
const proof = merkleTree.getHexProof(leaf);
const isWhiteList = merkleTree.verify(proof, leaf, rootHash);

const result = {
    proof: proof.join(','),
    isWhiteList: isWhiteList
};

console.log(JSON.stringify(result));