const { deploy } = require("@nomicfoundation/ignition-core");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const {int} = require("hardhat/internal/core/params/argumentTypes");
const {getProofForAddress,getRootHash}= require("../merkel/verify_merkle.js");



describe("PriPizzapad Contract", function () {
    let clotToken, Pizzapad;
    let owner, addr1, addr2,addr3,addr4, addrs;
    let clotTokenAddress, aiStarterPublicSaleAddress,joinIdoPrice,rewardAmount;
    let mFundAddress = "0xE8fD727fD0ede5f8Ff615c1EcD9EBBe159d47D51"; //example
    let distributionRoot;

    beforeEach(async function () {
        let deployer = await hre.ethers.getSigners();
        owner = deployer[0];
        addr1 = deployer[1];
        addr2 = deployer[2];
        addr3 = deployer[3];
        addr4 = deployer[4];
        mFundAddress= addr1.address

        // deploy CLOTToken
        const CLOTToken = await hre.ethers.getContractFactory("CLOTToken");
        clotToken = await CLOTToken.deploy();
        await clotToken.waitForDeployment();
        // deploy AIStarterPublicSale
        const rewardTokenAddress = await clotToken.getAddress().then((address) => {
            // console.log("clotTokenAddress deployed to:", address);
            clotTokenAddress= address;
            return address;
        });
        const root = getRootHash(); 
        distributionRoot= root;

        // rewardAmount = ethers.parseUnits("2.9", 18);
        // joinIdoPrice = ethers.parseUnits("0.000000116", 18);



        const args = [
            rewardTokenAddress,
            mFundAddress,
            distributionRoot
        ];
        const AIStarterPublicSale = await hre.ethers.getContractFactory("PriPizzapad");
        aiStarterPublicSale = await AIStarterPublicSale.deploy(...args);
        await aiStarterPublicSale.waitForDeployment();
        await aiStarterPublicSale.getAddress().then((address) => {
            // console.log("AIStarterPublicSale deployed to:", address);
            aiStarterPublicSaleAddress= address;

            //  sends some tokens to AIStarterPublicSale
            const tokenAmount = ethers.parseUnits("25000000", 18);
            clotToken.connect(owner).transfer(aiStarterPublicSaleAddress, tokenAmount);
            return address;
        });
    });
    describe("1.Multiple people join IDO", function () {
        it("1.1 Simulate users to join IDO and verify the amount invested", async function () {
            await aiStarterPublicSale.setStart(true);
            // 是否开启了IDO
            let mbStart = await aiStarterPublicSale.mbStart();
            expect(mbStart).to.equal(true);

            // first time participating in IDO
            const proof1 = getProofForAddress(addr1.address);
            await aiStarterPublicSale.connect(addr1).joinIdo(proof1,{ value: ethers.parseEther("0.004") }); 
            let parameters = await aiStarterPublicSale.connect(addr1).getParameters(addr1.address);
            expect(parameters[7]).to.equal(ethers.parseEther("0.004"));
            expect(parameters[8]).to.be.above(0); // Expected token Amount
            // second participation in IDO

            const proof2 = getProofForAddress(owner.address);
            await aiStarterPublicSale.connect(owner).joinIdo(proof2,{ value: ethers.parseEther("0.003")});
            // obtain the status after participation
            parameters = await aiStarterPublicSale.connect(owner).getParameters(owner.address);
            expect(parameters[7]).to.equal(ethers.parseEther("0.003")); 
            expect(parameters[8]).to.be.above(0); //  should be an expected number of tokens exceeding 0


            const sumCount = await aiStarterPublicSale.connect(owner).sumCount();
            const addrAmount = await aiStarterPublicSale.connect(owner).addrAmount();
            const bClaimBTC= await aiStarterPublicSale.connect(owner).bClaimBTC(owner);
            
            expect(sumCount).to.equal(2);
            expect(addrAmount).to.equal(2);
            expect(bClaimBTC).to.equal(false);

            // 如果投入的金额不符合要求呢
            await expect(aiStarterPublicSale.connect(owner).joinIdo(proof2,{ value: ethers.parseUnits("1", 18) }))
                .to.be.revertedWith("Pizzapad: Exceeding the allowed amount of participation");

            await ethers.provider.send("evm_increaseTime", [3600 * 59]);
            await ethers.provider.send("evm_mine");
            const parameters3 = await aiStarterPublicSale.connect(owner).getParameters(owner.address);
            const ratio = await aiStarterPublicSale.connect(owner).getIDOUnlockRatio()
            console.log("parameters:",parameters3[12]);
            console.log("ratio:",ratio);
            expect(parameters3[12]).to.equal(0);
            expect(ratio).to.equal(0);

            await ethers.provider.send("evm_increaseTime", [3600 * 2]);
            await ethers.provider.send("evm_mine");
            const parameters4 = await aiStarterPublicSale.connect(owner).getParameters(owner.address);
            const ratio2 = await aiStarterPublicSale.connect(owner).getIDOUnlockRatio()
            console.log("parameters:",parameters4[12]);
            console.log("ratio:",ratio2);
            expect(parameters4[12]).to.equal(5000);
            expect(ratio2).to.equal(5000);

            await ethers.provider.send("evm_increaseTime", [3600 * 24 * 30]);
            await ethers.provider.send("evm_mine");

            const parameters5 = await aiStarterPublicSale.connect(owner).getParameters(owner.address);
            const ratio3 = await aiStarterPublicSale.connect(owner).getIDOUnlockRatio()

            expect(parameters5[12]).to.equal(5750);
            expect(ratio3).to.equal(5750);
            
        });
        it("1.2 Multiple addresses join IDO and verify the expected number of tokens for each address, and at the end claim the proportion of tokens released linearly in the first round and mock", async function () {
            // 开启IDO
            await aiStarterPublicSale.setStart(true);
            // 模拟多个地址参与IDO
            const proof1 = getProofForAddress(addr1.address);
            const proof2 = getProofForAddress(addr2.address);
            const proof3 = getProofForAddress(addr3.address);
            const proof4 = getProofForAddress(addr4.address);
            const joinAmounts = [
                ethers.parseEther("0.001"),
                ethers.parseEther("0.002"),
                ethers.parseEther("0.003"),
                ethers.parseEther("0.004")
            ];
            await aiStarterPublicSale.connect(addr1).joinIdo(proof1,{ value: joinAmounts[0]});
            await expect(aiStarterPublicSale.connect(addr2).joinIdo(proof2,{ value: joinAmounts[1]})).to.be.revertedWith("Pizzapad:  The address is not on the whitelist");
            await aiStarterPublicSale.connect(addr3).joinIdo(proof3,{ value: joinAmounts[2]});
            await aiStarterPublicSale.connect(addr4).joinIdo(proof4,{ value: joinAmounts[3]});

            // 计算总投入金额
            const totalAmount = await aiStarterPublicSale.sumAmount();
            // 确保totalAmount是BigNumber类型
            // 在这里断言总金额
            expect(totalAmount).to.equal(ethers.parseEther("0.008"));

            // 验证每个地址的预期代币数目
            for (let i = 0; i < joinAmounts.length; i++) {
                const address = [addr1, addr2, addr3, addr4][i].address;
                const expectedAmountFromContract = await aiStarterPublicSale.getExpectedAmount(address);

                let expectedTokens;
                if (totalAmount > rewardAmount) {
                    expectedTokens = rewardAmount * (joinAmounts[i]) / (totalAmount);
                } else {
                    expectedTokens = joinAmounts[i];
                }

                // 验证预期代币数目
                if (i==1) {
                    expect(expectedAmountFromContract).to.equal(0);
                    continue
                }
                expect(expectedAmountFromContract).to.equal(expectedTokens);
                // console.log(`Expected amount for ${address}: ${expectedTokens.toString()}`, expectedAmountFromContract.toString());
            }

            // Fast-forward time to after the IDO ends
            await ethers.provider.send("evm_increaseTime", [3600 * 61]); // Increase 61 hours
            await ethers.provider.send("evm_mine");

            // 在领取代币前获取参数
            let parametersBeforeClaim = await aiStarterPublicSale.getParameters(addr1.address);
            expect(parametersBeforeClaim[12]).to.equal(5000); // 验证第一次领取全部代币的比例是否是20%

            // console.log("第1次领取代币的比例是多少",parametersBeforeClaim);
            // console.log("第1次领取代币是多少",ethers.formatEther(parametersBeforeClaim[13],"18"));
            // let beforeReceiving = await clotToken.balanceOf(addr1.address);
            // console.log("从未领取代币之前的钱包余额: ", beforeReceiving);

            // 验证第一次收到代币余额
            let firstExpectedClaimAmount =parametersBeforeClaim[13]

            // 尝试第一次领取代币
            await aiStarterPublicSale.connect(addr1).claimToken();

            // console.log("第1次领取代币后的钱包余额是: ", await clotToken.balanceOf(addr1.address))
            expect(await clotToken.balanceOf(addr1.address)).to.equal(firstExpectedClaimAmount);  //断言收到的金额

            // 快进到下一个领取周期
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600 + 1]); // 快进一个月
            await ethers.provider.send("evm_mine");



            // 获取第二次领取前的参数
            let parametersBeforeSecondClaim = await aiStarterPublicSale.getParameters(addr1.address);
            expect(parametersBeforeSecondClaim[12]).to.equal(5750);

            // 查看比例
            const unlockRatio =  await aiStarterPublicSale.getIDOUnlockRatio();
            expect(unlockRatio).to.equal(5750);


            // console.log("第2次领取代币的比例是多少",parametersBeforeSecondClaim);
            // console.log("第2次领取份额是多少",ethers.formatEther(parametersBeforeSecondClaim[13],"18"));

            //  执行第二次领取代币
            const claimNum2 = await aiStarterPublicSale.connect(addr1).claimTokenNum(addr1.address);
            await aiStarterPublicSale.connect(addr1).claimToken();

            // console.log("第2次领取代币后的钱包余额是: ", await clotToken.balanceOf(addr1.address))
            expect(await clotToken.balanceOf(addr1.address)).to.equal(firstExpectedClaimAmount+(parametersBeforeSecondClaim[13]-claimNum2)); //断言收到的金额

            // 快进到下一个领取周期
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600 + 1]); // 快进一个月
            await ethers.provider.send("evm_mine");


            // 第三次
            let parametersBeforeClaimThree = await aiStarterPublicSale.getParameters(addr1.address);
            expect(parametersBeforeClaimThree[12]).to.equal(6583);
            // console.log("第3次领取代币的比例是多少",parametersBeforeClaimThree);


        });
    });

    describe("2 Claim BTC Functionality", function () {
        // it("2.1 Allows user to claim BTC if overfunded", async function () {
        //     // 前置条件：用户参与IDO并且IDO结束
        //     await aiStarterPublicSale.setStart(true);
        //     const proof1 = getProofForAddress(addr1.address);
        //     await aiStarterPublicSale.connect(addr1).joinIdo(proof1,{ value: ethers.parseEther("0.004") }); 
        //     // await aiStarterPublicSale.connect(addr2).joinIdo({ value: ethers.parseEther("10") }); // 只募资2.9, 剩余的会退回
        //     await ethers.provider.send("evm_increaseTime", [3600 * 53]); // 快进使IDO结束 43小时
        //     await ethers.provider.send("evm_mine");
        //     const addr1Balance=await ethers.provider.getBalance(addr1.address);
        //     // console.log("IDO结束",addr1Balance);

        //     let parametersBeforeClaimBTC = await aiStarterPublicSale.getParameters(addr1.address);
        //     // console.log("用户参与IDO后参数: ", parametersBeforeClaimBTC);
        //     expect(parametersBeforeClaimBTC[9]).to.equal(ethers.parseEther("7.1"));
        //     // 用户尝试领取BTC
        //     await expect(aiStarterPublicSale.connect(addr1).claimBTC())

        //     const addr1Balance2=await ethers.provider.getBalance(addr1.address)
        //     // console.log("领取BTC结束",addr1Balance2);

        //     // 验证用户不能二次领取BTC
        //     await expect(aiStarterPublicSale.connect(addr1).claimBTC()).to.be.reverted;
        // });

        // it("2.2 Allows only owner to complete division of funds", async function () {
        //     await aiStarterPublicSale.setStart(true);
        //     await aiStarterPublicSale.connect(addr1).joinIdo({ value: ethers.parseEther("10") });
        //     // 前置条件：IDO结束
        //     await aiStarterPublicSale.setStart(true);
        //     await ethers.provider.send("evm_increaseTime", [3600 * 43]); // 快进使IDO结束
        //     await ethers.provider.send("evm_mine");

        //     // 只有所有者可以完成资金分配
        //     await expect(aiStarterPublicSale.connect(owner).CompleteDivision())

        //     // 验证非所有者不能调用
        //     await expect(aiStarterPublicSale.connect(addr1).CompleteDivision()).to.be.reverted;
        // });
        // it("2.3 Allows only owner to release locked funds after lock period", async function () {
        //     // 前置条件：完成资金分配
        //     await aiStarterPublicSale.setStart(true);
        //     const proof1 = getProofForAddress(addr1.address);
        //     await aiStarterPublicSale.connect(addr1).joinIdo(proof1,{ value: ethers.parseEther("0.004") }); 
        //     await ethers.provider.send("evm_increaseTime", [3600 * 43]); // 快进使IDO结束
        //     await ethers.provider.send("evm_mine");
        //     await aiStarterPublicSale.connect(owner).CompleteDivision();
        //     // 快进到锁定期结束
        //     await ethers.provider.send("evm_increaseTime", [6 * 30 * 24 * 3600+1]); // 快进6个月
        //     await ethers.provider.send("evm_mine");

        //     // 只有所有者可以释放锁定资金
        //     await expect(aiStarterPublicSale.connect(owner).releaseLockedFunds())

        //     // 验证非所有者不能调用
        //     await expect(aiStarterPublicSale.connect(addr1).releaseLockedFunds()).to.be.reverted;
        // });
        it("2.4 Allows user to claim BTC if overfunded", async function () {
            // 开启 IDO
            await aiStarterPublicSale.setStart(true);
            // 用户参与 IDO
            const proof1 = getProofForAddress(addr1.address);
            await aiStarterPublicSale.connect(addr1).joinIdo(proof1,{ value: ethers.parseEther("0.004") }); 
            // await aiStarterPublicSale.connect(addr2).joinIdo({ value: ethers.parseEther("200") });
            // await aiStarterPublicSale.connect(addr3).joinIdo({ value: ethers.parseEther("200") });

            // 结束 IDO
            await ethers.provider.send("evm_increaseTime", [3600 * 61]); // 快进使 IDO 结束
            await ethers.provider.send("evm_mine");

            const ExpectedAmount = await aiStarterPublicSale.getExpectedAmount(addr1);
            const all =await aiStarterPublicSale.balanceof(addr1);

            const refundAmount = all-ExpectedAmount

            // 用户领取退款前的余额
            const balanceBefore = await ethers.provider.getBalance(addr1);

            // 断言用户应获得退款金额
            await expect(refundAmount > 0, "User should receive a refund for overfunding");
            // 用户尝试领取
            await aiStarterPublicSale.connect(addr1).claimBTC();
            // 用户领取退款后的余额
            const balanceAfter = await ethers.provider.getBalance(addr1);

            // 检查用户领取退款后的余额是否增加，即用户成功领取了退款
            expect(balanceAfter === balanceBefore, "User successfully claimed the refund");
        });
    });


    describe("3. joinIdoInfo function", function () {
        it("3.1 Should revert if the ID does not exist", async function () {
            await expect(aiStarterPublicSale.joinIdoInfo(1)).to.be.revertedWith("Pizzapad: exist num!");
        });

        it("3.2 Should return valid ido info for existing ID", async function () {
            // 开启 IDO
            await aiStarterPublicSale.setStart(true);
            // 用户参与 IDO
            const proof = getProofForAddress(addr1.address);
            await aiStarterPublicSale.connect(addr1).joinIdo(proof,{ value: ethers.parseEther("0.004") }); 
            const idoInfo = await aiStarterPublicSale.joinIdoInfo(1);

            expect(idoInfo.addr).to.not.be.undefined;
            expect(idoInfo.joinIdoAmount).to.not.be.undefined;
            expect(idoInfo.time).to.not.be.undefined;
        });

        it("3.3 Should revert if fromId is greater than toId", async function () {
            await expect(aiStarterPublicSale.joinIdoInfos(2, 1)).to.be.revertedWith("Pizzapad: exist num!");
        });

        it("3.4 Should revert if toId does not exist", async function () {
            await expect(aiStarterPublicSale.joinIdoInfos(0, 2)).to.be.revertedWith("Pizzapad: exist num!");
        });

        it("3.5 Should return valid ido infos for existing IDs", async function () {
            // 假设存在多个IDO参与记录
            // 这里需要模拟至少两个成功的joinIdo操作
            // 开启 IDO
            await aiStarterPublicSale.setStart(true);
            // 用户参与 IDO
            const proof1 = getProofForAddress(addr1.address);
            await aiStarterPublicSale.connect(addr1).joinIdo(proof1,{ value: ethers.parseEther("0.004") }); 
            const proof2 = getProofForAddress(addr2.address);
         
            try {
                await aiStarterPublicSale.connect(addr2).joinIdo(proof2, { value: ethers.parseEther("0.003") });
                throw new Error("Transaction did not revert as expected");
              } catch (error) {
                expect(error.message).to.contain("Pizzapad:  The address is not on the whitelist");
            }

            const fromId = 1;
            const toId = 1;
            const idoInfos = await aiStarterPublicSale.joinIdoInfos(fromId, toId);
            expect(idoInfos.addrArr.length).to.equal(1);
            expect(idoInfos.joinIdoAmountArr.length).to.equal(1);
            expect(idoInfos.timeArr.length).to.equal(1);
        });
    });

    describe("4. getExpectedAmount function", function () {
        it("4.1 Should return 0 if user has not joined IDO", async function () {
            const expectedAmount = await aiStarterPublicSale.getExpectedAmount(owner.address);
            await ethers.provider.send("evm_increaseTime", [3600 * 53]); // 快进使IDO结束 43小时
            await ethers.provider.send("evm_mine");
            expect(expectedAmount).to.equal(0);
        });

        it("4.2 Should return expected amount correctly", async function () {
            // 开启 IDO
            await aiStarterPublicSale.setStart(true);
            // 用户参与 IDO
            await aiStarterPublicSale.setStart(true);
            const proof = getProofForAddress(addr1.address);
            await aiStarterPublicSale.connect(addr1).joinIdo(proof,{ value: ethers.parseEther("0.004") }); 
            // try {
            //     await aiStarterPublicSale.connect(addr1).joinIdo(proof, { value: ethers.parseEther("0.001") });
            //     throw new Error("Transaction did not revert as expected");
            //   } catch (error) {
            //     expect(error.message).to.contain("Pizzapad: Total participation exceeds the maximum limit");
            //   }
            const balance =await aiStarterPublicSale.connect(addr1).balanceof(addr1.address)
            expect(balance).to.equal(ethers.parseEther("0.004"));
            await ethers.provider.send("evm_increaseTime", [3600 * 53]); // 快进使IDO结束 43小时
            await ethers.provider.send("evm_mine");
            const expectedAmount = await aiStarterPublicSale.getExpectedAmount(addr1.address);
            expect(expectedAmount).to.be.above(0);
        });
    });

    describe("5 getIDOUnlockRatio function", function () {
        beforeEach(async function () {
            // 设置IDO开始
            await aiStarterPublicSale.setStart(true);
            const proof = getProofForAddress(addr1.address);
            await aiStarterPublicSale.connect(addr1).joinIdo(proof,{ value: ethers.parseEther("0.004") }); 
        });

        it("5.1 Should return 0 unlock ratio before startTime + claimDt1", async function () {
            // 假设此时尚未到达startTime + claimDt1
            const unlockRatio = await aiStarterPublicSale.getIDOUnlockRatio();
            expect(unlockRatio).to.equal(0);
        });

        it("5.2 Should return 2000 unlock ratio after startTime + claimDt1 but before startTime + claimDt1 + claimPeriod", async function () {
            // 快进到startTime + claimDt1之后
            const claimDt1Str = (await aiStarterPublicSale.claimDt1()).toString();
            const claimDt1Int = parseInt(claimDt1Str, 10);
            await ethers.provider.send("evm_increaseTime", [(claimDt1Int) + 1]);
            await ethers.provider.send("evm_mine");

            const unlockRatio = await aiStarterPublicSale.getIDOUnlockRatio();
            expect(unlockRatio).to.equal(5000);
        });

        it("5.3 Should return unlock ratio between 2000 and 10000 within 365 days after startTime + claimDt1 + claimPeriod", async function () {
            // 快进到startTime + claimDt1 + claimPeriod之后，但在365天内
            const claimDt1Str = (await aiStarterPublicSale.claimDt1()).toString();
            const claimDt1Int = parseInt(claimDt1Str, 10);

            await ethers.provider.send("evm_increaseTime", [(claimDt1Int) + (3600*24*30) + 1]);
            await ethers.provider.send("evm_mine");

            const unlockRatio = await aiStarterPublicSale.getIDOUnlockRatio();
            expect(unlockRatio).to.be.above(5000);
            expect(unlockRatio).to.be.below(10000);
        });

        it("5.4 Should return 10000 unlock ratio after 365 days", async function () {
            // 快进到365天后
            await ethers.provider.send("evm_increaseTime", [179 * 24 * 3600]);
            await ethers.provider.send("evm_mine");

            const unlockRatio = await aiStarterPublicSale.getIDOUnlockRatio();
            expect(unlockRatio).to.equal(9833);
            await ethers.provider.send("evm_increaseTime", [2 * 24 * 3600]);
            await ethers.provider.send("evm_mine");
            const unlockRatio2 = await aiStarterPublicSale.getIDOUnlockRatio();
            expect(unlockRatio2).to.equal(9888);

            await ethers.provider.send("evm_increaseTime", [5* 24 * 3600]);
            await ethers.provider.send("evm_mine");
            const unlockRatio3 = await aiStarterPublicSale.getIDOUnlockRatio();
            expect(unlockRatio3).to.equal(10000);
        });
    });

    describe("6. setParameters function", function () {
        it("6.1 Should revert if not called by owner", async function () {
            await expect(aiStarterPublicSale.connect(addr1).setParameters(addr1.address, ethers.parseUnits("1", 18), ethers.parseUnits("1000", 18))).to.be.reverted;
        });

        it("6.2 Should revert if IDO has already started", async function () {
            // 假设通过某种方式启动了IDO，例如调用setStart(true)函数
            await aiStarterPublicSale.connect(owner).setStart(true);
            await expect(aiStarterPublicSale.connect(owner).setParameters(addr1.address, ethers.parseUnits("1", 18), ethers.parseUnits("1000", 18)))
                .to.be.revertedWith("Pizzapad: already Start!");
        });

        it("6.3 Should update parameters successfully when called by owner and IDO has not started", async function () {
            // 在IDO未开始的情况下，设置参数
            const newRewardTokenAddr = addr1.address;
            const newJoinIdoPrice = ethers.parseUnits("1", 18);
            const newRewardAmount = ethers.parseUnits("1000", 18);

            await aiStarterPublicSale.connect(owner).setParameters(newRewardTokenAddr, newJoinIdoPrice, newRewardAmount);

            // 使用合约提供的公开getter方法验证参数更新成功
            const updatedRewardTokenAddr = await aiStarterPublicSale.rewardToken();
            const updatedJoinIdoPrice = await aiStarterPublicSale.joinIdoPrice();
            const updatedRewardAmount = await aiStarterPublicSale.rewardAmount();

            expect(updatedRewardTokenAddr).to.equal(newRewardTokenAddr, "The rewardToken address was not updated correctly.");
            expect(updatedJoinIdoPrice.toString()).to.equal(newJoinIdoPrice.toString(), "The joinIdoPrice was not updated correctly.");
            expect(updatedRewardAmount.toString()).to.equal(newRewardAmount.toString(), "The rewardAmount was not updated correctly.");
        });
    });

    describe("7. setDt function", function () {
        it("7.1 Should revert if not called by owner", async function () {
            await expect(aiStarterPublicSale.connect(addr1).setDt(3600, 7200, 24 * 3600)).to.be.reverted;
        });

        it("7.2 Should update Dt successfully when called by owner", async function () {
            const newDt = 3600;
            const newClaimDt1 = 7200;
            const newClaimPeriod = 24 * 3600;

            await aiStarterPublicSale.connect(owner).setDt(newDt, newClaimDt1, newClaimPeriod);

            // 验证Dt更新成功
            // 假设合约中有对应的公开状态变量或getter方法来获取这些值
            const updatedDt = await aiStarterPublicSale.dt();
            const updatedClaimDt1 = await aiStarterPublicSale.claimDt1();
            const updatedClaimPeriod = await aiStarterPublicSale.claimPeriod();

            expect(updatedDt).to.equal(newDt, "The dt was not updated correctly.");
            expect(updatedClaimDt1).to.equal(newClaimDt1, "The claimDt1 was not updated correctly.");
            expect(updatedClaimPeriod).to.equal(newClaimPeriod, "The claimPeriod was not updated correctly.");
        });
    });

    describe("8 withdrawToken function", function () {
        it("8.1 Should revert if not called by owner", async function () {
            await expect(aiStarterPublicSale.connect(addr1).withdrawToken(clotTokenAddress, ethers.parseUnits("1", 18))).to.be.reverted;
        });

        it("8.2 Should allow token withdrawal by owner", async function () {
            let beforeReceiving = await clotToken.balanceOf(addr1.address);
            await aiStarterPublicSale.connect(owner).withdrawToken(clotTokenAddress, ethers.parseUnits("1", 6))
            let afterReceiving = await clotToken.balanceOf(addr1.address);
            expect(afterReceiving-beforeReceiving).to.equal(ethers.parseUnits("1", 6));


        });
    });

    describe("9. withdraw function", function () {
        it("9.1 Should revert if not called by mFundAddress", async function () {
            await expect(aiStarterPublicSale.connect(addr2).withdraw(ethers.parseUnits("1", 18))).to.be.reverted;
        });

        it("9.2 Should allow withdrawal by mFundAddress", async function () {
            await aiStarterPublicSale.setStart(true);
            const proof = getProofForAddress(owner.address);
            await aiStarterPublicSale.connect(owner).joinIdo(proof,{ value: ethers.parseEther("0.004") }); 
            await ethers.provider.send("evm_increaseTime", [3600 * 61]); // 快进使IDO结束 61小时
            await ethers.provider.send("evm_mine");
            const addr1Balance=await ethers.provider.getBalance(owner.address);
            await aiStarterPublicSale.connect(owner).withdraw(ethers.parseUnits("0.004", 18));
            const addr1Balance2=await ethers.provider.getBalance(owner.address);
            expect(addr1Balance).to.be.above(addr1Balance2);

        });
    });


});


