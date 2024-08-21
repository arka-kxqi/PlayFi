// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract NFTContract is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 public mintPrice = 0.00015 ether;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public paidMintCount;
    uint256 public tokenId;
    uint256 public wlMintCount;
    bytes32 public distributionRoot;
    uint256 public wlLength;

    // VIP address can mint quantity
    mapping(address => int256) mintAccountMap;

    // feat: After the whitelist time ends, each address has a maximum of 2 mint
    mapping(address => uint256) public mintCountAfterEndTime;

    uint256 private _totalSupply; // Currently issued NFT, including NFT purchased through VIP and non-VIP channels

    event SaleEventTimeUpdated(uint256 startTime, uint256 endTime);
    event MintPriceUpdated(uint256 newPrice);
    event DistributionRootUpdated(bytes32 root);
    event VipAddressLimitSet(address[] addresses, int256 amount);
    event NFTMinted(address indexed owner, uint256 tokenId, string uri, bool isWhitelisted);

    constructor(string memory name, string memory symbol, bytes32 root, uint256 startTimeStamp, uint256 endTimeStamp,uint256 wlLengthCount) ERC721(name, symbol) Ownable(msg.sender) {
        require(endTimeStamp > startTimeStamp, "End time must be after start time");
        distributionRoot = root;
        _totalSupply = 5222;
        tokenId = 0;
        startTime = startTimeStamp;
        endTime =  endTimeStamp;
        wlLength = wlLengthCount;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    function setSaleEventTime(uint256 startTimeStamp, uint256 endTimeStamp) public onlyOwner {
        require(startTimeStamp < endTimeStamp, "End time must be after start time");
        startTime = startTimeStamp;
        endTime = endTimeStamp;
        emit SaleEventTimeUpdated(startTimeStamp, endTimeStamp);
    }

    function setDistributionRoot(bytes32 root,uint256 wlLengthCount) public onlyOwner {
        distributionRoot = root;
        wlLength=wlLengthCount;
        emit DistributionRootUpdated(root);
    }

    function verifyAddressInWhitelist(address account, bytes32[] memory proof) public view returns (bool) {
        bytes32 encodedAccount = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, distributionRoot, encodedAccount);
    }

    function checkIfUserIsWhitelisted(address user, bytes32[] memory proof) public view returns (bool) {
        return verifyAddressInWhitelist(user, proof);
    }

    function setVipAddressLimit(address[] memory addresses, int256 amount) external onlyOwner {
        require(addresses.length > 0, "Addresses array is empty");
        require(amount > 1, "Amount must be greater than or equal to 1");

        for (uint256 i = 0; i < addresses.length; i++) {
            mintAccountMap[addresses[i]] = 1 - amount;
        }

        emit VipAddressLimitSet(addresses, amount);
    }

    function getAddressLimit(address addr) view external onlyOwner returns (int256) {
        return mintAccountMap[addr];
    }

    function mintNFT(string memory uri, bytes32[] memory proof) public payable nonReentrant {
        require(block.timestamp > startTime, "Time has not started yet");
        require(wlMintCount + paidMintCount <= totalSupply(), "Maximum supply reached");
        if (block.timestamp < endTime) {
            require(mintAccountMap[msg.sender] < 1 , "The opportunity for this address to be on the whitelist is insufficient");
        }

        bool isWlUser = checkIfUserIsWhitelisted(msg.sender, proof);

        if (block.timestamp <= endTime) {
            require(isWlUser,"The address is not on the whitelist");
        }

        // feat: reserve 3000 for white list users to get through
        if (block.timestamp <= endTime && paidMintCount > _totalSupply-wlLength ) { 
            require(isWlUser,"The whitelist quota has been used up");
        }

        // feat: After the whitelist time ends, each address has a maximum of 2 mint
        if (block.timestamp > endTime) {
            require(mintCountAfterEndTime[msg.sender] < 2, "Each address can only mint up to 2 NFTs after end time");
        }

        // Within Wl USER reserved mint time window
        if (isWlUser) {
            wlMintCount++;
        } else {
            require(msg.value >= mintPrice, "Insufficient sent");

            (bool sent, ) = payable(owner()).call{value: msg.value}("");
            require(sent, "Failed to send");
            paidMintCount++;
        }

        if (block.timestamp > endTime) {
            mintCountAfterEndTime[msg.sender] += 1;
        }
        mintAccountMap[msg.sender]++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit NFTMinted(msg.sender, tokenId, uri, isWlUser);
        tokenId++;
    }

    function getMintedAmounts() public onlyOwner view returns (uint256, uint256) {
        return (wlMintCount, paidMintCount);
    }
}
