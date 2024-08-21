const ethers = require('ethers');


// https://rpc.bsquared.network
// https://b2-mainnet.alt.technology
// https://b2-mainnet-public.s.chainbase.com
const NodeUrl = 'https://b2-mainnet-public.s.chainbase.com';
const provider = new ethers.providers.JsonRpcProvider(NodeUrl);

// 获取区块高度
provider.getBlockNumber().then((blockNumber) => {
    console.log('当前区块高度：', blockNumber);
}).catch((error) => {
    console.error('获取区块高度失败：', error);
});