const { deploy } = require("@nomicfoundation/ignition-core");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const {getProofForAddress,getRootHash}= require("../merkel/verify_merkle.js");


describe("AIStarterPublicSale Contract", function () {
    let gldToken, aiStarterPublicSale;
    let owner, addr1, addr2, addrs;
    let gldTokenAddress, aiStarterPublicSaleAddress;
    let mFundAddress = "0xE8fD727fD0ede5f8Ff615c1EcD9EBBe159d47D51"; //example

    beforeEach(async function () {
        deployer = await hre.ethers.getSigners();
        owner = deployer[0];
        addr1 = deployer[1];

        mFundAddress= addr1.address
  
        // deploy GLDToken
        const GLDToken = await hre.ethers.getContractFactory("CLOTToken");
        gldToken = await GLDToken.deploy("10000000000000000000000");
        await gldToken.waitForDeployment();
        // deploy AIStarterPublicSale
        const rewardTokenAddress = await gldToken.getAddress().then((address) => {
            // console.log("GLDToken deployed to:", address);
            gldTokenAddress= address;
            return address;
        });
        const joinIdoPrice = "1000000000000000000";
        const rewardAmount = "5000000000000000000000";
        
        const root = getRootHash(); // Example of Merkle Tree Root
        const args = [
            rewardTokenAddress,
            joinIdoPrice,
            rewardAmount,
            mFundAddress,
            root
        ];
        const AIStarterPublicSale = await hre.ethers.getContractFactory("AIStarterPublicSale");
        aiStarterPublicSale = await AIStarterPublicSale.deploy(...args);
        await aiStarterPublicSale.waitForDeployment();
        await aiStarterPublicSale.getAddress().then((address) => {
            // console.log("AIStarterPublicSale deployed to:", address);
            aiStarterPublicSaleAddress= address;

             // GLDToken sends some tokens to AIStarterPublicSale
            const transferAmount = "5000000000000000000000"; // send 5000 GLD
            gldToken.connect(owner).transfer(address, transferAmount);
            return address;
        });
    });

    describe("1.Mul Joining IDO", function () {
        it("1.1 Should allow user to join IDO", async function () {
            // initialize contract conditions
            // addr1 is an address on the whitelist, obtain its Merkle proof
            const proof = getProofForAddress(owner.address)
            expect(proof).to.not.be.empty;
            // await console.log("proof:",proof);
            //
            await aiStarterPublicSale.setStart(true);
            // first time participating in IDO
            await aiStarterPublicSale.connect(owner).joinIdo(proof, { value: ethers.parseEther("1")});
            let parameters = await aiStarterPublicSale.connect(owner).getParameters(owner.address);
            expect(parameters[7]).to.equal(ethers.parseEther("1"));
            expect(parameters[8]).to.be.above(0); // Expected token Amount
            // second participation in IDO
            await aiStarterPublicSale.connect(owner).joinIdo(proof,{ value: ethers.parseEther("2")});
            // obtain the status after participation
            parameters = await aiStarterPublicSale.connect(owner).getParameters(owner.address);
            expect(parameters[7]).to.equal(ethers.parseEther("3")); // A total of 3 ETH have been submitted
            expect(parameters[8]).to.be.above(0); //  should be an expected number of tokens exceeding 0
        });
    });
    describe("2. Claiming Tokens", function () {
        it("2.1 Should allow user to claim tokens after IDO", async function () {
            const proof = getProofForAddress(owner.address);
            expect(proof).to.not.be.empty;
            // // 启动IDO
            await aiStarterPublicSale.setStart(true);
            // first time participating in IDO
            await aiStarterPublicSale.connect(owner).joinIdo(proof, { value: ethers.parseEther("1")});
            // set the claim time after IDO ends
            await aiStarterPublicSale.setDt(3600, 7200, 10800, 14400); 
            // ensure that the current time exceeds claimDt1
            await hre.network.provider.send("evm_increaseTime", [3600 + 7200]);
            await hre.network.provider.send("evm_mine");
            // claim tokens
            await aiStarterPublicSale.connect(owner).claimToken(proof);
            // check the number of tokens claimed
            const balanceAfterClaim = await gldToken.balanceOf(owner.address);
            expect(balanceAfterClaim).to.be.above(0); //  token balance is greater than 0
        });
    });



    
    describe("3. Claiming Refunds", function () {
        it("3.1 Should allow user to claim refunds if overfunded", async function () {
            const proof = getProofForAddress(owner.address);
            expect(proof).to.not.be.empty;
            await aiStarterPublicSale.setStart(true);
            // first time participating in IDO
            await aiStarterPublicSale.connect(owner).joinIdo(proof, { value: ethers.parseEther("1")});
            await aiStarterPublicSale.setDt(3600, 7200, 10800, 14400); // 设置不同阶段的时间
            // ensure that the current time exceeds claimDt1
            await hre.network.provider.send("evm_increaseTime", [3600 + 1]);
            await hre.network.provider.send("evm_mine");
            // user claims refund
            await aiStarterPublicSale.connect(owner).claimBTC(proof);
            // check the ETH balance after claiming and refunding
            expect(await hre.ethers.provider.getBalance(gldTokenAddress)).to.be.below(ethers.parseEther("1"));
        });
    });
    
    describe("4. Withdrawing Funds", function () {
        it("4.1 Should allow fund address to withdraw", async function () {
            const proof = getProofForAddress(owner.address);
            expect(proof).to.not.be.empty;
            await aiStarterPublicSale.setStart(true);
            await aiStarterPublicSale.connect(owner).joinIdo(proof, { value: ethers.parseEther("1")});

            // extract ETH from the contract to the fund address
            const initialBalance = await hre.ethers.provider.getBalance(mFundAddress);
            await aiStarterPublicSale.connect(addr1).withdraw(ethers.parseEther("1"));
            const finalBalance = await hre.ethers.provider.getBalance(mFundAddress);
            expect(finalBalance).to.be.above(initialBalance); // the balance of the fund address has increased
        });
    
        it("4.2 Should allow owner to withdraw ERC20 tokens", async function () {
            const proof = getProofForAddress(owner.address);
            expect(proof).to.not.be.empty;
            await aiStarterPublicSale.setStart(true);
            await aiStarterPublicSale.connect(owner).joinIdo(proof, { value: ethers.parseEther("1")});
            
            await aiStarterPublicSale.connect(owner).withdrawToken(gldTokenAddress, ethers.parseEther("1"));
            const balanceAfterWithdraw = await gldToken.balanceOf(addr1.address);
            expect(balanceAfterWithdraw).to.eq(ethers.parseEther("1")); // assert that the GLDToken balance of the fund address is 1
        });
    });
});

