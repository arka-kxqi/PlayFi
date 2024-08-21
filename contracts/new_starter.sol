// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Importing necessary OpenZeppelin contracts
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PizzapadV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    // IDO token address
    IERC20 public rewardToken;
    // IDO token price : 0.000000116 BTC, 116000000000
    uint256 public joinIdoPrice = 116000000000;
    //     max token Amount for IDO , 2.1750 BTC , 2175000000000000000
    uint256 public rewardBTCAmount= 2900000000000000000;
    // default false
    bool public idoStart;
    // default no whitelist
    bool public idoWhiteAddr;
    // public sale opening time Jun 9,2024 20:00 UTC+8 : 1717934400
    uint256 public startTime;
    // endTime = startTime + idoTimeRange, default endTime is  Jun 11,2024 12:00 UTC+8 : 1718078400
    uint256 public idoTimeRange = 40 * 3600;
    // firstClaimDt = endTime + claimDt, default 1 days after idoCloseTime;
    uint256 public claimDt = 24 * 3600;
    // unlock token per day, 80 % in total 365 days
    uint256 public claimPeriod = 24 * 3600;
    // max buy amount per user 99 BTC
    uint256 public maxAmountPerUser = 99000000000000000000;
    // expect amount that user can get (will modify if over funded)
    mapping(address => uint256) private _balance;
    // total participant
    uint256 private _addrAmount;
    // user buy amount (if > rewardBTCAmount ,then is over funded)
    uint256 private _sumAmount;
    // total claim amount
    uint256 private totalClaimAmount;


    mapping(address => uint256) private _alreadyClaimAmount;
    mapping(address => bool) private _bClaimBTC;

    struct sJoinIdoPropertys {
        address addr;
        uint256 joinIdoAmount;
        uint256 time;
    }
    mapping(uint256 => sJoinIdoPropertys) private _joinIdoPropertys;
    uint256 private _sumCount;

    event JoinIdoCoins(address indexed user, uint256 amount, uint256 id);
    address public mFundAddress;



    constructor(
        address _rewardToken,
        address _mFundAddress
    ) Ownable(msg.sender){
        rewardToken = IERC20(_rewardToken);
        mFundAddress = _mFundAddress;
    }


    /* ========== VIEWS ========== */
    function sumCount() external view returns (uint256) {
        return _sumCount;
    }

    function sumAmount() external view returns (uint256) {
        return _sumAmount;
    }

    function addrAmount() external view returns (uint256) {
        return _addrAmount;
    }

    function balanceof(address account) external view returns (uint256) {
        return _balance[account];
    }

    function claimTokenAmount(address account) external view returns (uint256) {
        return _alreadyClaimAmount[account];
    }

    function bClaimBTC(address account) external view returns (bool) {
        return _bClaimBTC[account];
    }

    //read ido info
    function joinIdoInfo(uint256 iD)
    external
    view
    returns (
        address addr,
        uint256 joinIdoAmount,
        uint256 time
    )
    {
        require(iD <= _sumCount, "Pizzapad: exist num!");
        addr = _joinIdoPropertys[iD].addr;
        joinIdoAmount = _joinIdoPropertys[iD].joinIdoAmount;
        time = _joinIdoPropertys[iD].time;
        return (addr, joinIdoAmount, time);
    }
    //read ido infos
    function joinIdoInfos(uint256 fromId, uint256 toId)
    external
    view
    returns (
        address[] memory addrArr,
        uint256[] memory joinIdoAmountArr,
        uint256[] memory timeArr
    )
    {
        require(toId <= _sumCount, "Pizzapad: exist num!");
        require(fromId <= toId, "Pizzapad: exist num!");
        addrArr = new address[](toId - fromId + 1);
        joinIdoAmountArr = new uint256[](toId - fromId + 1);
        timeArr = new uint256[](toId - fromId + 1);
        uint256 i = 0;
        for (uint256 ith = fromId; ith <= toId; ith++) {
            addrArr[i] = _joinIdoPropertys[ith].addr;
            joinIdoAmountArr[i] = _joinIdoPropertys[ith].joinIdoAmount;
            timeArr[i] = _joinIdoPropertys[ith].time;
            i = i + 1;
        }
        return (addrArr, joinIdoAmountArr, timeArr);
    }



    //get account amount (if over-funded then modify the amount)
    function getExpectedAmount(address account) public view returns (uint256) {
        uint256 expectedAmount = _balance[account];
        if (expectedAmount == 0) return expectedAmount;
        // handle over-funded situation
        if (_sumAmount > rewardBTCAmount) {
            expectedAmount = (rewardBTCAmount * (expectedAmount)) / (_sumAmount);
        }
        return expectedAmount;
    }

    // get all parameters associated with account
    function getParameters(address account)
    public
    view
    returns (uint256[] memory)
    {
        uint256[] memory paraList = new uint256[](uint256(15));
        paraList[0] = 0;
        if (idoStart) paraList[0] = 1;
        paraList[1] = startTime; //start Time
        paraList[2] = startTime + idoTimeRange; //end Time
        paraList[3] = joinIdoPrice; //Token Price:
        paraList[4] = rewardBTCAmount; //max reward Amount
        paraList[5] = _addrAmount; //Total Participants
        paraList[6] = _sumAmount; //Total Committed
        paraList[7] = _balance[account]; //You committed
        uint256 expectedAmount = getExpectedAmount(account);
        uint256 refundAmount = _balance[account] - expectedAmount;
        expectedAmount = expectedAmount * (10**18) / (joinIdoPrice);
        paraList[8] = expectedAmount; //Expected token Amount
        paraList[9] = refundAmount; //refund Amount
        paraList[10] = _alreadyClaimAmount[account]; //Claim Amount
        paraList[11] = 0;
        if (_bClaimBTC[account] || refundAmount==0) paraList[11] = 1; //is Claim BTC
        uint256 coe = getIDOUnlockRatio();
        paraList[12] = coe; //can claim ratio
        paraList[13] = (expectedAmount * coe) / 10000; //can claim amount
        paraList[14] = totalClaimAmount; //total claim amount
        return paraList;
    }

    //---write---//
    //join Ido
    function joinIdo() external payable nonReentrant {
        require(idoStart, "Pizzapad: not Start!");
        require(
            block.timestamp < startTime + idoTimeRange,
            "Pizzapad: already end!"
        );

        require(10**8 <= msg.value, "Pizzapad:value sent is too small");
        require(
            _balance[msg.sender] + msg.value <= maxAmountPerUser,
            "Pizzapad:over maxAmountPerUser"
        );
        uint256 amount = msg.value;

        if (_balance[msg.sender] == 0) {
            _addrAmount = _addrAmount + 1;
        }
        _balance[msg.sender] = _balance[msg.sender] + amount;
        _sumAmount = _sumAmount + amount;
        _sumCount = _sumCount + 1;
        _joinIdoPropertys[_sumCount].addr = msg.sender;
        _joinIdoPropertys[_sumCount].joinIdoAmount = amount;
        _joinIdoPropertys[_sumCount].time = block.timestamp;

        emit JoinIdoCoins(msg.sender, amount, _sumCount);
    }

    // get unlock Ratio
    function getIDOUnlockRatio() public view returns (uint256) {
        if (block.timestamp < startTime + idoTimeRange + claimDt) return 0;
        if (block.timestamp < startTime + idoTimeRange + claimDt + claimPeriod) return 2000;
        // unlock 80% in 365 days
        uint256 period = (block.timestamp - startTime - idoTimeRange - claimDt) / claimPeriod;
        if (period > 365) return 10000;
        uint256 unlockRatio = 8000 * period / 365;
        return 2000 + unlockRatio;
    }

    //claim btc
    function claimBTC() external nonReentrant {
        require(idoStart, "Pizzapad: not Start!");
        require(
            block.timestamp > startTime + idoTimeRange,
            "Pizzapad: need end!"
        );

        require(_balance[msg.sender] > 0, "Pizzapad:balance zero");
        require(
            !_bClaimBTC[msg.sender],
            "Pizzapad:already claim btc"
        );
        uint256 expectedAmount = getExpectedAmount(msg.sender);
        uint256 refundAmount = _balance[msg.sender] - (expectedAmount);
        _bClaimBTC[msg.sender] = true;
        if (refundAmount > 0) payable(msg.sender).transfer(refundAmount);
    }

    //claim Token
    function claimToken() external nonReentrant {
        require(idoStart, "Pizzapad: not Start!");
        require(
            block.timestamp > startTime + idoTimeRange,
            "Pizzapad: need end!"
        );

        require(_balance[msg.sender] > 0, "Pizzapad:balance zero");
        require(
            block.timestamp > startTime + claimDt,
            "Pizzapad: need begin claim!"
        );

        uint256 coe = getIDOUnlockRatio();

        require(coe > 0, "Pizzapad: claim 0!");

        uint256 expectedAmount = getExpectedAmount(msg.sender);
        expectedAmount = (expectedAmount * (coe)) / 10000;
        expectedAmount = (expectedAmount * 10**18) / joinIdoPrice;
        require(
            expectedAmount > _alreadyClaimAmount[msg.sender],
            "Pizzapad: no token to be claimed!"
        );
        expectedAmount -= _alreadyClaimAmount[msg.sender];
        if (expectedAmount > 0)
            rewardToken.safeTransfer(msg.sender, expectedAmount);
        _alreadyClaimAmount[msg.sender] += expectedAmount;
        totalClaimAmount += expectedAmount;
    }



    //---write onlyOwner---//
    function setParameters(
        address rewardTokenAddr,
        uint256 joinIdoPrice0,
        uint256 rewardBTCAmount0
    ) external onlyOwner {
        require(!idoStart, "Pizzapad: already Start!");
        rewardToken = IERC20(rewardTokenAddr);

        joinIdoPrice = joinIdoPrice0;
        rewardBTCAmount = rewardBTCAmount0;
    }

    function setStart(bool bstart, uint256 startTime0) external onlyOwner {
        idoStart = bstart;
        startTime = startTime0;

    }

    // set Time
    function setDt(
        uint256 _idoTimeRange,
        uint256 _claimDt,
        uint256 period
    ) external onlyOwner {
        idoTimeRange = _idoTimeRange;
        claimDt = _claimDt;
        claimPeriod = period;
    }


    receive() external payable {}

    function withdraw(uint256 amount) external onlyOwner {
        (bool success, ) = payable(mFundAddress).call{value: amount}("");
        require(success, "Low-level call failed");
    }

    function withdrawToken(address tokenAddr, uint256 amount) external onlyOwner{
        IERC20 token = IERC20(tokenAddr);
        token.safeTransfer(mFundAddress, amount);
    }
}
