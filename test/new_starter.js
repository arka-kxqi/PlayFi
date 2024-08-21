const { deploy } = require("@nomicfoundation/ignition-core");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");



describe("Pizzapad Contract", function () {
    let clotToken, aiStarterPublicSale;
    let owner, addr1, addr2,addr3,addr4, addrs;
    let clotTokenAddress, aiStarterPublicSaleAddress,joinIdoPrice,rewardAmount;
    let mFundAddress = "0xE8fD727fD0ede5f8Ff615c1EcD9EBBe159d47D51"; //example

    beforeEach(async function () {
        let deployer = await hre.ethers.getSigners();
        owner = deployer[0];
        addr1 = deployer[1];
        addr2 = deployer[2];
        addr3 = deployer[3];
        addr4 = deployer[4];
        // mFundAddress= addr1.address

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

        rewardAmount = ethers.parseUnits("25000000", 18);
        joinIdoPrice = ethers.parseUnits("0.000000116", 18);



        const args = [
            rewardTokenAddress,
            mFundAddress,
        ];
        const AiStarterPublicSale = await hre.ethers.getContractFactory("PizzapadV2");
        aiStarterPublicSale=await AiStarterPublicSale.deploy(...args);
        await aiStarterPublicSale.waitForDeployment();
        await aiStarterPublicSale.getAddress().then((address) => {
            // console.log("AIStarterPublicSale deployed to:", address);
            aiStarterPublicSaleAddress= address;

            //  sends some tokens to AIStarterPublicSale
            clotToken.connect(owner).transfer(address,25000000);
            return address;
        });
    });
    describe("1.Multiple people join IDO", function () {
        // it("1.1 Simulate users to join IDO and verify the amount invested", async function () {
        //     // 获取当前时间的时间戳（毫秒），然后转换为秒
        //     const currentTimeStampInSeconds = Math.floor(Date.now() / 1000);
        //     // 使用当前时间戳调用合约函数
        //     await aiStarterPublicSale.setStart(true, currentTimeStampInSeconds);

        //     // 是否开启了IDO
        //     let mbStart = await aiStarterPublicSale.idoStart();
        //     expect(mbStart).to.equal(true);

        //     // first time participating in IDO
        //     await aiStarterPublicSale.connect(owner).joinIdo({ value: ethers.parseEther("1")});
        //     let parameters = await aiStarterPublicSale.connect(owner).getParameters(owner.address);
        //     expect(parameters[7]).to.equal(ethers.parseEther("1"));
        //     expect(parameters[8]).to.be.above(0); // Expected token Amount
        //     // second participation in IDO
        //     await aiStarterPublicSale.connect(owner).joinIdo({ value: ethers.parseEther("2")});
        //     // obtain the status after participation
        //     parameters = await aiStarterPublicSale.connect(owner).getParameters(owner.address);
        //     expect(parameters[7]).to.equal(ethers.parseEther("3")); // A total of 3 ETH have been submitted
        //     expect(parameters[8]).to.be.above(0); //  should be an expected number of tokens exceeding 0

        //     // 如果投入的金额不符合要求呢
        //     await expect(aiStarterPublicSale.connect(owner).joinIdo({ value: ethers.parseUnits("1", 7) }))
        //         .to.be.revertedWith("Pizzapad:value sent is too small");
        // });
        // it("1.2 Multiple addresses join IDO and verify the expected number of tokens for each address, and at the end claim the proportion of tokens released linearly in the first round and mock", async function () {
        //     // 开启IDO
        //     const currentTimeStampInSeconds = Math.floor(Date.now() / 1000);
        //     // 使用当前时间戳调用合约函数
        //     await aiStarterPublicSale.setStart(true, currentTimeStampInSeconds);
        //     // 模拟多个地址参与IDO
        //     const joinAmounts = [
        //         ethers.parseEther("0.1"),
        //         ethers.parseEther("0.2"),
        //         ethers.parseEther("0.3"),
        //         ethers.parseEther("0.4")
        //     ];
        //     await aiStarterPublicSale.connect(addr1).joinIdo({ value: joinAmounts[0]});
        //     await aiStarterPublicSale.connect(addr2).joinIdo({ value: joinAmounts[1]});
        //     await aiStarterPublicSale.connect(addr3).joinIdo({ value: joinAmounts[2]});
        //     await aiStarterPublicSale.connect(addr4).joinIdo({ value: joinAmounts[3]});

        //     // 计算总投入金额
        //     const totalAmount = await aiStarterPublicSale.sumAmount();
        //     // 确保totalAmount是BigNumber类型
        //     // 在这里断言总金额
        //     expect(totalAmount).to.equal(ethers.parseEther("1"));

        //     // 验证每个地址的预期代币数目
        //     for (let i = 0; i < joinAmounts.length; i++) {
        //         const address = [addr1, addr2, addr3, addr4][i].address;
        //         const expectedAmountFromContract = await aiStarterPublicSale.getExpectedAmount(address);

        //         let expectedTokens;
        //         if (totalAmount > rewardAmount) {
        //             expectedTokens = rewardAmount.mul(joinAmounts[i]).div(totalAmount);
        //         } else {
        //             expectedTokens = joinAmounts[i];
        //         }

        //         // 验证预期代币数目
        //         expect(expectedAmountFromContract).to.equal(expectedTokens);
        //         console.log(`Expected amount for ${address}: ${expectedTokens.toString()}`, expectedAmountFromContract.toString());
        //     }

        //     // Fast-forward time to after the IDO ends
        //     await ethers.provider.send("evm_increaseTime", [3600 * 63+1]); // Increase 44 hours
        //     await ethers.provider.send("evm_mine");

        //     // 在领取代币前获取参数
        //     let parametersBeforeClaim = await aiStarterPublicSale.getParameters(addr1.address);
        //     expect(parametersBeforeClaim[12]).to.equal(20); // 验证第一次领取代币的比例是否是20%

        //     console.log("开始领取份额是多少",ethers.formatEther(parametersBeforeClaim[13],"18"));

        //     let beforeReceiving = await clotToken.balanceOf(addr1.address);
        //     // console.log("从未领取代币之前: ", beforeReceiving);


        //     // 验证第一次收到代币余额
        //     let firstExpectedClaimAmount = parametersBeforeClaim[8]  * BigInt(20) / BigInt(100); // 预期领取量为预期总量的20%
        //     console.log("第一次领取量: ", ethers.formatEther(firstExpectedClaimAmount,"18"));

        //     // 尝试领取代币
        //     await aiStarterPublicSale.connect(addr1).claimToken();

        //     expect(await clotToken.balanceOf(addr1.address)).to.equal(beforeReceiving+firstExpectedClaimAmount);

        //     // console.log("第一次领取代币后的钱包余额是: ", beforeReceiving+firstExpectedClaimAmount)

        //     // 快进到下一个领取周期
        //     await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600 + 1]); // 快进一个月
        //     await ethers.provider.send("evm_mine");

        //     // 获取第二次领取前的参数
        //     let parametersBeforeSecondClaim = await aiStarterPublicSale.getParameters(addr1.address);

        //     // 执行第二次领取代币
        //     await aiStarterPublicSale.connect(addr1).claimToken();

        //     // 验证第二次领取后的代币余额
        //     let afterSecondClaimBalance = await clotToken.balanceOf(addr1.address);
        //     let monthsPassed = 1; // 假设已经过去了一个月
        //     let totalReleasablePercentage = BigInt(20) + (BigInt(80) * BigInt(monthsPassed)) / BigInt(12); // 计算总释放比例

        //     expect(parametersBeforeSecondClaim[12]).to.equal(totalReleasablePercentage); // 验证第二次领取的比例
        //     let expectedSecondClaimAmount = parametersBeforeSecondClaim[8]* BigInt(totalReleasablePercentage) / BigInt(100);// 第二次应领取的数量
        //     // console.log("第二次领取量: ", expectedSecondClaimAmount);


        //     expect(parametersBeforeSecondClaim[13]).to.equal(expectedSecondClaimAmount);
        //     // console.log("第二次领取代币后的钱包余额是: ", afterSecondClaimBalance)

        //     // 验证已领取次数是否正确更新
        //     let parametersAfterSecondClaim = await aiStarterPublicSale.getParameters(addr1.address);
        //     expect(parametersAfterSecondClaim[10]).to.equal(monthsPassed + 1); // 验证已领取次数是否正确
        // });
    });

    describe("2 Claim BTC Functionality", function () {
        // it("2.1 Allows user to claim BTC if overfunded", async function () {
        //     // 前置条件：用户参与IDO并且IDO结束
        //     // 获取当前时间的时间戳（毫秒），然后转换为秒
        //     const currentTimeStampInSeconds = Math.floor(Date.now() / 1000);
        //     // 使用当前时间戳调用合约函数
        //     await aiStarterPublicSale.setStart(true, currentTimeStampInSeconds);
            
        //     await aiStarterPublicSale.connect(addr1).joinIdo({ value: ethers.parseEther("10") });
        //     await ethers.provider.send("evm_increaseTime", [3600 * 43]); // 快进使IDO结束
        //     await ethers.provider.send("evm_mine");
        //     // 用户尝试领取BTC
        //     await expect(aiStarterPublicSale.connect(addr1).claimBTC())

        //     // 验证用户不能二次领取BTC
        //     await expect(aiStarterPublicSale.connect(addr1).claimBTC()).to.be.reverted;
        // });
        it("2.4 Allows user to claim BTC if overfunded", async function () {
            // 开启 IDO
            await aiStarterPublicSale.connect(owner).setStart(true, 1718100254);
            // 用户参与 IDO
            await aiStarterPublicSale.connect(addr1).joinIdo({ value: ethers.parseEther("2") });
            await aiStarterPublicSale.connect(addr2).joinIdo({ value: ethers.parseEther("2") });
            await aiStarterPublicSale.connect(addr3).joinIdo({ value: ethers.parseEther("2.9") });

            // 结束 IDO
            await ethers.provider.send("evm_increaseTime", [3600 * 53]); // 快进使 IDO 结束
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
});


