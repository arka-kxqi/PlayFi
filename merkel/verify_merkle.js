const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const fs = require('fs');
const { log } = require('console');


// const jsonString = fs.readFileSync('./whiteList.json', 'utf8');
// const jsonString = fs.readFileSync('./merkel/hardhat_dev_account.json', 'utf8');
// const WhiteList = JSON.parse(jsonString);
// const leaves = WhiteList.map((x) => keccak256(x));
// const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
// const rootHash = '0x' + merkleTree.getRoot().toString('hex');
// const testAddress = '0x7A9367e4C7ddFCaCa96DB65bae68F1d267299A6C';  //example
// const leaf = keccak256(testAddress);
// const proof = merkleTree.getHexProof(leaf);
// const isWhiteList = merkleTree.verify(proof, leaf, rootHash);

// console.log('rootHash:: ', rootHash);
// console.log('proof:: ', proof);  // Contract input, double quotes instead of single quotes
// console.log('verify:: ', isWhiteList);

// 0xbadffe5799a1044a9ada03bcc0df25f3e0bd44a0d17fa1b2caa98a3e86eac8f5
// rootHash::  0xdff7a01af376abaa117ac57da22baa08186ac496092f361dac874c415e830105
// proof::  [
//     '0x9b9ff418d32e54492d0a9b35667c925c5f7a91e4d2a0439b71c2908ce16b3885',
//     '0xff162d960f4caf2e5a8de3efc743ad90c93181749b857143659e9c2f1228a249',
//     '0x3aeb79a31076e66f62e676367aa8db3011c65153271a778216e99e9265a9b0b7',
//     '0x4ef58ff57761410a9913e2dec4c58fbb62155a15a2fe6cd5fc3dd9415ae93a5d',
//     '0x99e98f2a73c8513b64af8fbde12d58d595d856f7b68c2e42c99c666bebbe32fb',
//     '0x6bec86e293cb5bf6e1dfeff2f8581b0d500e8a5a5ad2b0c7cff3b0e38890aa57',
//     '0x1cad2533fb40d25cc9eeaa6157529c7e772d362e841174d97a27be605f5cbdc0',
//     '0x670baa386a97d13429534378ed2a9e3d29cbeed80e9ed42ecc84353814d757dc',
//     '0x0a0ffa7676c9cf43d05a74a304cbc5ff84e961f92194e274de44658f5f18375b',
//     '0xd3cb825253ebd5af58a1c7c5a3f3ea14612ebf21f007385478f6e03dd5bfbe41',
//     '0x427a10177f798b0a7005076a8c4e4bb2279e22d66b06e14a68387b3dc2613108',
//     '0xd5a1d614996847cc64ac9ef721279ad464b5509f15f43e8ad1b15670d1309e16',
//     '0x698b5d2a02cc5e5bd373d7c84e1bc900113c96cad0cae90ec9837e08033da50f'
// ]
// verify::  true


// Read whitelist addresses and create Merkle trees
function createMerkleTree() {
    const jsonString = fs.readFileSync('./merkel/hardhat_dev_account.json', 'utf8');
    const WhiteList = JSON.parse(jsonString);

    const leaves = WhiteList.map(x => keccak256(x));
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    return merkleTree;
}
// The function for generating Merkle tree roots
function getRootHash() {
    const merkleTree = createMerkleTree();
    const rootHash = '0x' + merkleTree.getRoot().toString('hex');
    return rootHash;
}

// Obtain Merkle proof based on wallet address
function getProofForAddress(address) {
    const merkleTree = createMerkleTree();
    const leaf = keccak256(address);
    const proof = merkleTree.getHexProof(leaf);
    return proof;
}

module.exports = { getProofForAddress,getRootHash };


// B²  mainnet
// DAP_NFT: 0x3FdaCd1C4fCbF43568C5f3d9E674aE9C9ba30847
// IDO: 0x483371489f0cBea9a717630F469515dD6D169Ebb