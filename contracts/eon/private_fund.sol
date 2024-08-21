// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Importing necessary OpenZeppelin contracts
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract PriPizzapad is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    // IDO token address
    IERC20 public rewardToken;
    // IDO token price: joinIdoPrice:  757500000000  (0.0000007575 btc)
    uint256 public joinIdoPrice = 757500000000;
    // max token Amount for IDO: 757500000000000000 (0.7575 btc)
    uint256 public rewardAmount= 757500000000000000;
    // default false
    bool public mbStart;
    // public sale opening time
    uint256 public startTime;
    // endTime = startTime + dt;
    uint256 public dt = 57 * 3600;

    uint256 public endTimeAfterClaim=  3 * 3600;
    // first claim = endtime + claimDt1
    uint256 public claimDt1;

    // unlock token per day, 50 % in total 180 days
    uint256 public claimPeriod = 24 * 3600;

    // expect amount that user can get (will modify if over funded)
    mapping(address => uint256) private _balance;
    // total participant
    uint256 private _addrAmount;
    // user buy amount (if > rewardAmount ,then is over funded)
    uint256 private _sumAmount; // Total amount
    uint256 private _sumCount;  // Total number of addresses

    // total claim amount
    uint256 private totalClaimAmount;

    bytes32 public distributionRoot;
    uint256 public whitelistMaxAmount = 0.0303 ether;




    mapping(address => uint256) private _alreadyClaimNumArr;
    mapping(address => bool) private _bClaimBTC;
    struct sJoinIdoPropertys {
        address addr;
        uint256 joinIdoAmount;
        uint256 time;
    }
    mapping(uint256 => sJoinIdoPropertys) private _joinIdoPropertys;


    event JoinIdoCoins(address indexed user, uint256 amount, uint256 id);
    event DistributionRootUpdated(bytes32 root);
    address public mFundAddress;


    constructor(
        address _rewardToken,
        address _mFundAddress,
        bytes32 _root
    ) Ownable(msg.sender){
        // default claim time can be modify if needed
        claimDt1 = dt + endTimeAfterClaim;

        rewardToken = IERC20(_rewardToken);
        mFundAddress = _mFundAddress;
        distributionRoot = _root;
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

    function claimTokenNum(address account) external view returns (uint256) {
        return _alreadyClaimNumArr[account];
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
        uint256 ExpectedAmount = _balance[account];
        if (ExpectedAmount == 0) return ExpectedAmount;
        // handle over-funded situation
        if (_sumAmount > rewardAmount) {
            ExpectedAmount = (rewardAmount * (ExpectedAmount)) / (_sumAmount);
        }
        return ExpectedAmount;
    }

    // get unlock Ratio
    function getIDOUnlockRatio() public view returns (uint256) {
        if (block.timestamp < startTime + claimDt1) return 0;
        if (block.timestamp < startTime + claimDt1 + claimPeriod) return 5000;
        // unlock 50% in 180 days
        uint256 period = (block.timestamp - startTime - dt - claimDt1) / claimPeriod;
        if (period > 180) return 10000;
        uint256 unlockRatio = 5000 * period / 180;
        return 5000 + unlockRatio;
    }


    // get all parameters associated with account
    function getParameters(address account)public view returns (uint256[] memory) {
        uint256[] memory paraList = new uint256[](uint256(16));
        paraList[0] = 0;
        if (mbStart) paraList[0] = 1;
        paraList[1] = startTime; // start Time
        paraList[2] = startTime + dt; // end Time
        paraList[3] = joinIdoPrice; // Token Price
        paraList[4] = rewardAmount; // max reward Amount
        paraList[5] = _addrAmount; // Total Participants
        paraList[6] = _sumAmount; // Total Committed
        paraList[7] = _balance[account]; // You committed
        uint256 expectedAmount = getExpectedAmount(account);
        uint256 refundAmount = _balance[account] > expectedAmount ? _balance[account] - expectedAmount : 0;
        paraList[8] = expectedAmount * (10**18) / (joinIdoPrice); // Expected token Amount
        paraList[9] = refundAmount; // refund Amount
        paraList[10] = _alreadyClaimNumArr[account]; // Claim num
        paraList[11] = _bClaimBTC[account] ? 1 : 0; // is Claim BTC

        uint256 coe = getIDOUnlockRatio();
        expectedAmount = (expectedAmount * (coe)) / 10000;
        expectedAmount = (expectedAmount * 10**18) / joinIdoPrice;
        paraList[12] = coe; //can claim ratio
        paraList[13] = expectedAmount; //can claim amount
        paraList[14] = totalClaimAmount; //total claim amount

        return paraList;
    }

    //---write---//
    //join Ido
    function joinIdo(bytes32[] memory proof) external payable nonReentrant {
        require(mbStart, "Pizzapad: not Start!");
        require(
            block.timestamp < startTime + dt,
            "Pizzapad: already end!"
        );

        require(_sumAmount < rewardAmount, "Pizzapad: Total participation exceeds the reward amount limit");

        bool isWhitelisted = verifyAddressInWhitelist(msg.sender, proof);
        require(isWhitelisted,"Pizzapad:  The address is not on the whitelist");

        require(msg.value <= whitelistMaxAmount, "Pizzapad: Exceeding the allowed amount of participation");
        require(_balance[msg.sender] + msg.value <= whitelistMaxAmount, "Pizzapad: Total participation exceeds the maximum limit");

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

    //claim Token
    function claimToken() external nonReentrant {
        require(mbStart, "Pizzapad: not Start!");
        require(
            block.timestamp > startTime + dt,
            "Pizzapad: need end!"
        );
        require(_balance[msg.sender] > 0, "Pizzapad:balance zero");
        require(
            block.timestamp > startTime + claimDt1,
            "Pizzapad: need begin claim!"
        );
        uint256 coe = getIDOUnlockRatio();

        require(coe > 0, "Pizzapad: claim 0!");

        uint256[] memory paraList =getParameters(msg.sender);
        uint256 canClaimAmount = paraList[13];

        require(
            canClaimAmount > _alreadyClaimNumArr[msg.sender],
            "Pizzapad: no token to be claimed!"
        );
        canClaimAmount -= _alreadyClaimNumArr[msg.sender];
        if (canClaimAmount > 0)
            rewardToken.safeTransfer(msg.sender, canClaimAmount);
        _alreadyClaimNumArr[msg.sender] += canClaimAmount;
        totalClaimAmount += canClaimAmount;
    }


    //claim btc
    function claimBTC() external nonReentrant {
        require(mbStart, "Pizzapad: not Start!");
        require(
            block.timestamp > startTime + dt,
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

    //---write onlyOwner---//
    function setParameters(
        address rewardTokenAddr,
        uint256 newJoinIdoPrice,
        uint256 newrewardAmount
    ) external onlyOwner {
        require(!mbStart, "Pizzapad: already Start!");
        rewardToken = IERC20(rewardTokenAddr);

        joinIdoPrice = newJoinIdoPrice;
        rewardAmount = newrewardAmount;
    }

    function setStart(bool bstart) external onlyOwner {
        mbStart = bstart;
        startTime = block.timestamp;
    }

    // set Time
    function setDt(
        uint256 tDt,
        uint256 tDt1,
        uint256 period
    ) external onlyOwner {
        dt = tDt;
        claimDt1 = tDt1;
        claimPeriod = period;

    }

    function setDistributionRoot(bytes32 root) public onlyOwner {
        distributionRoot = root;
        emit DistributionRootUpdated(root);
    }

    function verifyAddressInWhitelist(address account, bytes32[] memory proof) public view returns (bool) {
        bytes32 encodedAccount = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, distributionRoot, encodedAccount);
    }

    function checkIfUserIsWhitelisted(address user, bytes32[] memory proof) public view returns (bool) {
        return verifyAddressInWhitelist(user, proof);
    }


    function setWhitelistMaxAmount(uint256 _amount) public onlyOwner {
        whitelistMaxAmount = _amount;
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
