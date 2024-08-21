const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const {getProofForAddress,getRootHash}= require("../merkel/verify_merkle.js");

describe("NFTContract", function () {
    let nftContract,nftContractAddress;
    let owner, addr1, addr2 ;
    let startTime, endTime;
    let distributionRoot;

    beforeEach(async function () {
        // Get test accounts
        [owner, addr1, addr2,addr3,addr4,addr5,addr6,addr7] = await hre.ethers.getSigners();

        // Set test start and end time
        const block = await ethers.provider.getBlock("latest");
        startTime= block.timestamp;
        endTime = startTime + 86400; // 24 hours later

        // Deploy NFT contract
        const NFT = await hre.ethers.getContractFactory("NFTContract");
        const root = getRootHash(); // Example of Merkle Tree Root
        distributionRoot= root;

        const args = [
            "DAP_NFT",
            "DAP_NFT",
            distributionRoot,
            startTime,
            endTime,
            3000,
        ];
        nftContract = await NFT.deploy(...args);
        await nftContract.waitForDeployment();
    });

    describe("1. Initialization Test", function () {
        it("1.1 Contract should correctly set sale event time after deployment", async function () {
            expect(await nftContract.startTime()).to.equal(startTime);
            expect(await nftContract.endTime()).to.equal(endTime);
        });
    });

    describe("2. Minting NFTs", function () {
        it("2.1 Non-whitelisted users cannot mint NFTs during whitelist time", async function () {
            // Assume Merkle proof for non-whitelisted user
            const badProof = ["0x0000000000000000000000000000000000000000000000000000000000000000"];
            await expect(nftContract.connect(addr7).mintNFT("uri", badProof,{ value: ethers.parseEther("0.00015") })).to.be.revertedWith("The address is not on the whitelist");
        });

        it("2.2 Whitelisted users can mint NFTs during whitelist time", async function () {
            // Assume Merkle proof for whitelisted user, replace with actual proof
            const correctProof = getProofForAddress(owner.address)
            expect(correctProof).to.not.be.empty;
            // Simulate whitelisted user minting NFT
            await expect(nftContract.connect(owner).mintNFT("uri", correctProof,{ value: ethers.parseEther("0.00015")})).to.emit(nftContract, "NFTMinted");
        });

        it("2.3 Non-whitelisted users can mint NFTs by paying ETH after whitelist time ends", async function () {
            // Increase time to after whitelist ends
            await ethers.provider.send("evm_increaseTime", [86400 + 1]);
            await ethers.provider.send("evm_mine");

            // Check if greater than end time
            const block = await ethers.provider.getBlock("latest");
            expect(block.timestamp).to.be.greaterThan(endTime);

            // Mint NFT and pay ETH
            await expect(nftContract.connect(addr7).mintNFT("uri", [], { value: ethers.parseEther("0.00015")})).to.emit(nftContract, "NFTMinted");
        });

    });

    describe("3. Owner Operations", function () {
        it("3.1 Owner can update minting price", async function () {
            const newMintPrice = ethers.parseEther("0.0002");
            await nftContract.setMintPrice(newMintPrice);
            expect(await nftContract.mintPrice()).to.equal(newMintPrice);
        });

        it("3.2 Owner can update sale event time, minting should be blocked at that time", async function () {
            const newStartTime = startTime + 3600; // Update start time to 1 hour ahead
            const newEndTime = newStartTime + 86400; // Update end time to 24 hours after start

            await nftContract.setSaleEventTime(newStartTime, newEndTime);

            expect(await nftContract.startTime()).to.equal(newStartTime);
            expect(await nftContract.endTime()).to.equal(newEndTime);

            // Minting NFT should fail
            const proof = getProofForAddress(owner.address);
            await expect(nftContract.connect(addr1).mintNFT("uri", proof)).to.be.revertedWith("Time has not started yet");
        });

        it("3.3 Owner can update Merkle tree root", async function () {
            const newRoot = getRootHash();
            const wlLengthCount = 3001;
            await nftContract.setDistributionRoot(newRoot,wlLengthCount);
            expect(await nftContract.distributionRoot()).to.equal(newRoot);
        });
    });
    describe("4. Change in NFT Counts", function () {
        it("4.1 Whitelisted user minting NFT should correctly increase minting count", async function () {
            const initialWlMintCount = await nftContract.wlMintCount();
            const correctProof = getProofForAddress(owner.address);
            await nftContract.connect(owner).mintNFT("uri", correctProof);
            const updatedWlMintCount = await nftContract.wlMintCount();
            expect(updatedWlMintCount).to.equal(parseInt(initialWlMintCount) + 1);
        });

        it("4.2 Paid user minting NFT should correctly increase minting count", async function () {
            const initialPaidMintCount = await nftContract.paidMintCount();
            // mock time
            await ethers.provider.send("evm_increaseTime", [86400 + 1]);
            await ethers.provider.send("evm_mine");

            await nftContract.connect(addr7).mintNFT("uri", [], { value: ethers.parseEther("0.00015") });
            
            const updatedPaidMintCount = await nftContract.paidMintCount();
            expect(updatedPaidMintCount).to.equal(parseInt(initialPaidMintCount) + 1);
        });
    });
    describe("5. Whitelist Limitations", function () {
        it("5.1 Setting VIP address limit should correctly update the limit", async function () {
            const vipAddresses = [addr1.address, addr2.address];
            const amount = 3; // Set limit for each VIP address to 3
            await nftContract.setVipAddressLimit(vipAddresses, amount);

            expect(await nftContract.getAddressLimit(addr1.address)).to.equal(1 - amount);
            expect(await nftContract.getAddressLimit(addr2.address)).to.equal(1 - amount);
        });

        it("5.2 VIP address limit should take effect during minting, and after whitelist time can still mint up to 2", async function () {
            const vipAddresses = [addr1.address];
            const amount = 2; // Set limit for each VIP address to 2
            await nftContract.setVipAddressLimit(vipAddresses, amount);

            // VIP address addr1 mints more than the limit
            const correctProof = getProofForAddress(addr1.address);
            await nftContract.connect(addr1).mintNFT("uri", correctProof);
            await nftContract.connect(addr1).mintNFT("uri", correctProof);
            const addr1NFTCount = await nftContract.balanceOf(addr1.address);
            expect(addr1NFTCount).to.equal(2); // VIP address addr1 should have 2 NFTs


            // Check if less than end time
            const block = await ethers.provider.getBlock("latest");
            expect(block.timestamp).to.be.lte(endTime)

            // Third minting should fail
            await expect(nftContract.connect(addr1).mintNFT("uri", correctProof)).to.be.revertedWith("The opportunity for this address to be on the whitelist is insufficient");

            // Simulate can still mint up to 2 after whitelist time
            await ethers.provider.send("evm_increaseTime", [86400 + 1]);
            await ethers.provider.send("evm_mine");

            // Fourth minting should succeed
            await nftContract.connect(addr1).mintNFT("uri", correctProof);
            await nftContract.connect(addr1).mintNFT("uri", correctProof);

            // Fifth minting should fail
            await expect(nftContract.connect(addr1).mintNFT("uri", correctProof)).to.be.revertedWith("Each address can only mint up to 2 NFTs after end time");
            const addr1NFTCountTWO = await nftContract.balanceOf(addr1.address);
            expect(addr1NFTCountTWO).to.equal(4); // VIP address addr1 should have 4 NFTs
        });
    });

    describe("6. Whitelist Verification", function () {
        it("6.1 Whitelisted user's Merkle proof verification should return correct result", async function () {
            const proof = getProofForAddress(owner.address);
            const isWhitelisted = await nftContract.checkIfUserIsWhitelisted(owner.address, proof);
            expect(isWhitelisted).to.be.true;
        });

        it("6.2 Non-whitelisted user's Merkle proof verification should return incorrect result", async function () {
            const badProof = getProofForAddress(owner.address);
            const isWhitelisted = await nftContract.checkIfUserIsWhitelisted(addr7.address, badProof);
            expect(isWhitelisted).to.be.false;
        });
    });
});