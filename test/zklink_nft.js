const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { getProofForAddress, getRootHash } = require("../merkel/verify_merkle.js");

describe("ZklinkNFT Contract", function () {
    let nftContract;
    let owner, addr1, addr2;
    let startTime, gtdEndTime, fcfsEndTime;
    let distributionRoot;

    beforeEach(async function () {
        // 获取测试账户
        [owner, addr1, addr2] = await hre.ethers.getSigners();

        // 设置测试开始和结束时间
        const block = await ethers.provider.getBlock("latest");
        startTime = block.timestamp;
        gtdEndTime = startTime + 1800; // GTD 结束时间
        fcfsEndTime = gtdEndTime + 1800; // FCFS 结束时间

        // 部署 NFT 合约
        const NFT = await hre.ethers.getContractFactory("ZklinkNFT");
        const root = getRootHash();
        distributionRoot = root;

        const args = [
            "zklink_NFT",
            "ZFT",
            distributionRoot,
            distributionRoot, // 使用相同的 Merkle Tree Root
            startTime, // GTD 开始时间
            gtdEndTime, // GTD 结束时间
            fcfsEndTime, // FCFS 结束时间
            3,          // FCFS 阶段最多mint 次数
        ];
        nftContract = await NFT.deploy(...args);
        await nftContract.waitForDeployment();
    });

    it("1. should set mint price correctly", async () => {
        const newPrice = ethers.parseEther("0.0002");
        await nftContract.connect(owner).setMintPrice(newPrice);
        const updatedPrice = await nftContract.mintPrice();
        expect(updatedPrice).to.equal(newPrice);
    });

    it("2. should set sale event time correctly", async () => {
        // let startTime, gtdEndTime, fcfsEndTime;
        const newGtdEndTime = gtdEndTime+ 1000;
        const newFcfsEndTime = fcfsEndTime+ 2000;
        await nftContract.connect(owner).setSaleEventTime(newGtdEndTime, newFcfsEndTime);
        const updatedEndTime = await nftContract.fcfsEndTime();
        expect(updatedEndTime).to.equal(newFcfsEndTime);
    });

    it("3. should set distribution root correctly", async () => {
        const newGtdRoot = getRootHash();
        const newFcfsRoot = getRootHash();
        await nftContract.connect(owner).setDistributionRoot(newGtdRoot, newFcfsRoot);
        const updatedGtdRoot = await nftContract.gtdDistributionRoot();
        const updatedFcfsRoot = await nftContract.fcfsDistributionRoot();
        expect(updatedGtdRoot).to.equal(newGtdRoot);
        expect(updatedFcfsRoot).to.equal(newFcfsRoot);
    });

    it("4. should mint NFT correctly for GTD phase", async () => {
        // Mock Merkle Proof for GTD whitelist
        const proof = getProofForAddress(addr1.address);
        await expect(nftContract.connect(addr1).mintNFT("uri", proof))
            .to.emit(nftContract, "NFTMinted")
            .withArgs(addr1.address, 1, "uri", "GTD");

            
    });

    it("5. should mint NFT correctly for FCFS phase", async () => {
        // Mock Merkle Proof for FCFS whitelist
        // 模拟时间流逝半小时，到FCFS环节
        await ethers.provider.send("evm_increaseTime", [1800 * 1 +1 ]); // 快进使结束 半小时小时
        await ethers.provider.send("evm_mine");

        const proof = getProofForAddress(addr1.address);
    
        await nftContract.connect(addr1).mintNFT("uri", proof);
        console.log(await nftContract.fcfsMintCount())
        expect(await nftContract.fcfsMintCount()).to.equal(1);
       
    });

    it("6. should mint NFT correctly for public phase", async () => {
        await ethers.provider.send("evm_increaseTime", [3600 * 1 +1 ]); // 快进使结束 1小时小时,到public阶段
        await ethers.provider.send("evm_mine");
        await nftContract.connect(owner).mintNFT("uri", [], { value:   ethers.parseEther("0.00015") });
        console.log(await nftContract.publicMintCount())
        expect(await nftContract.publicMintCount()).to.equal(1);
       
    });

    it("7. should get minted amounts correctly", async () => {
         const proof = getProofForAddress(addr1.address);
            await expect(nftContract.connect(addr1).mintNFT("uri", proof))
            .to.emit(nftContract, "NFTMinted")
            .withArgs(addr1.address, 1, "uri", "GTD");
            // -------------------
          // 模拟时间流逝半小时，到FCFS环节
          await ethers.provider.send("evm_increaseTime", [1800 * 1 +1 ]); // 快进使结束 半小时小时
          await ethers.provider.send("evm_mine");
          await nftContract.connect(addr1).mintNFT("uri", proof);
          expect(await nftContract.fcfsMintCount()).to.equal(1);

          await nftContract.connect(addr1).mintNFT("uri", proof);
          expect(await nftContract.fcfsMintCount()).to.equal(2);

          await nftContract.connect(addr1).mintNFT("uri", proof);
          expect(await nftContract.fcfsMintCount()).to.equal(3);

         // 超过fcfs的限制情况
         await expect(nftContract.connect(addr1).mintNFT("uri", proof)).to.be.rejectedWith("Exceeded FCFS mint limit");


          // 模拟时间流逝半小时，到PUBLIC环节
          await ethers.provider.send("evm_increaseTime", [3600 * 1 +1 ]); // 快进使结束 1小时小时,到public阶段
          await ethers.provider.send("evm_mine");
          await nftContract.connect(owner).mintNFT("uri", [], { value:   ethers.parseEther("0.00015") });
          console.log(await nftContract.publicMintCount())
          expect(await nftContract.publicMintCount()).to.equal(1);

        const [gtdCount, fcfsCount, publicCount] = await nftContract.getMintedAmounts();
        expect(gtdCount).to.equal(1);
        expect(fcfsCount).to.equal(3);
        expect(publicCount).to.equal(1);
    });
    it("8. should set FCFS mint limit correctly", async () => {
        const newLimit = 5;
        await nftContract.connect(owner).setFCFSMintLimit(newLimit);
        const updatedLimit = await nftContract.fcfsMintLimit();
        expect(updatedLimit).to.equal(newLimit);
    });
    
    it("9. should verify address in GTD whitelist correctly", async () => {
        const proof = getProofForAddress(addr1.address);
        const verified = await nftContract.verifyAddressInGTDWhitelist(addr1.address, proof);
        expect(verified).to.be.true;
    });
    
    it("10. should verify address in FCFS whitelist correctly", async () => {
        const proof = getProofForAddress(addr1.address);
        const verified = await nftContract.verifyAddressInFCFSWhitelist(addr1.address, proof);
        expect(verified).to.be.true;
    });
    
    it("11. should get GTD mint limit for an address correctly", async () => {
        const limit = await nftContract.getAddressGTDLimit(addr1.address);
        expect(limit).to.equal(0); 
    });
    
    it("12. should get FCFS mint limit for an address correctly", async () => {
        const limit = await nftContract.getAddressFCFSLimit(addr1.address);
        expect(limit).to.equal(0); 
    });
    
    it("13. should get public mint limit for an address correctly", async () => {
        const limit = await nftContract.getAddressPublicLimit(addr1.address);
        expect(limit).to.equal(0); 
    });
    
    it("14. should get current minting phase correctly", async () => {
        const phase = await nftContract.getCurrentPhase();
        expect(phase).to.equal("GTD"); 
    });
});