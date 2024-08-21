// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract ZklinkNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 public mintPrice = 0.00015 ether;
    uint256 public startTime;
    uint256 public gtdEndTime;
    uint256 public fcfsEndTime;
    uint256 public publicStartTime;
    uint256 public paidMintCount;
    uint256 public tokenId = 1;
    uint256 public gtdMintCount;
    uint256 public fcfsMintCount;
    uint256 public publicMintCount;
    uint256 public totalSupply = 5000;
    uint256 public fcfsMintLimit;

    bytes32 public gtdDistributionRoot;
    bytes32 public fcfsDistributionRoot;

    mapping(address => int256) gtdMintAccountMap;
    mapping(address => int256) fcfsMintAccountMap;
    mapping(address => int256) publicMintAccountMap;

    event SaleEventTimeUpdated(uint256 startTime, uint256 endTime);
    event MintPriceUpdated(uint256 newPrice);
    event DistributionRootUpdated(bytes32 gtdRoot, bytes32 fcfsRoot);
    event VipAddressLimitSet(address[] addresses, int256 amount);
    event NFTMinted(address indexed owner, uint256 tokenId, string uri, string mintPhase);
    event FCFSMintLimitSet(uint256 newLimit);

    constructor(string memory name, string memory symbol, bytes32 gtdRoot, bytes32 fcfsRoot, uint256 gtdStartTime, uint256 gtdEnd, uint256 fcfsEnd,uint256 mintLimit) ERC721(name, symbol) Ownable(msg.sender) {
        require(gtdEnd > gtdStartTime, "End time must be after start time");
        require(fcfsEnd > gtdEnd, "FCFS end time must be after GTD end time");

        gtdDistributionRoot = gtdRoot;
        fcfsDistributionRoot = fcfsRoot;
        startTime = gtdStartTime;
        gtdEndTime = gtdEnd;
        fcfsEndTime = fcfsEnd;
        publicStartTime = fcfsEnd + 1; // Public phase starts right after FCFS phase
        fcfsMintLimit = mintLimit;
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    function setSaleEventTime(uint256 gtdEnd, uint256 fcfsEnd) public onlyOwner {
        require(gtdEnd > startTime, "GTD end time must be after start time");
        require(fcfsEnd > gtdEnd, "FCFS end time must be after GTD end time");

        gtdEndTime = gtdEnd;
        fcfsEndTime = fcfsEnd;
        publicStartTime = fcfsEnd + 1; // Update public mint start time
        emit SaleEventTimeUpdated(startTime, fcfsEnd);
    }

    function setFCFSMintLimit(uint256 limit) external onlyOwner {
        fcfsMintLimit = limit;
        emit FCFSMintLimitSet(limit);
    }

    function setDistributionRoot(bytes32 gtdRoot, bytes32 fcfsRoot) public onlyOwner {
        gtdDistributionRoot = gtdRoot;
        fcfsDistributionRoot = fcfsRoot;
        emit DistributionRootUpdated(gtdRoot, fcfsRoot);
    }

    function verifyAddressInGTDWhitelist(address account, bytes32[] memory proof) public view returns (bool) {
        bytes32 encodedAccount = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, gtdDistributionRoot, encodedAccount);
    }

    function verifyAddressInFCFSWhitelist(address account, bytes32[] memory proof) public view returns (bool) {
        bytes32 encodedAccount = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, fcfsDistributionRoot, encodedAccount);
    }

    function mintNFT(string memory uri, bytes32[] memory proof) public payable nonReentrant {
        require(block.timestamp >= startTime, "Minting has not started yet");
        require(tokenId <= totalSupply, "Maximum supply reached");

        if (block.timestamp < gtdEndTime) {
            require(verifyAddressInGTDWhitelist(msg.sender, proof), "Address is not in GTD whitelist");
            gtdMintAccountMap[msg.sender]++;
            gtdMintCount++;
            emit NFTMinted(msg.sender, tokenId, uri, "GTD");
        } else if (block.timestamp < fcfsEndTime) {
            require(verifyAddressInFCFSWhitelist(msg.sender, proof), "Address is not in FCFS whitelist");
            require(fcfsMintCount <= fcfsMintLimit-1, "Exceeded FCFS mint limit");
            fcfsMintAccountMap[msg.sender]++;
            fcfsMintCount++;
            emit NFTMinted(msg.sender, tokenId, uri, "FCFS");
        } else if (block.timestamp < publicStartTime) {
            revert("Public minting has not started yet");
        } else {
            require(msg.value >= mintPrice, "Insufficient payment");

            (bool sent, ) = payable(owner()).call{value: msg.value}("");
            require(sent, "Failed to send payment");
            publicMintAccountMap[msg.sender]++;
            publicMintCount++;
            emit NFTMinted(msg.sender, tokenId, uri, "PUBLIC");
        }

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        tokenId++;
    }

    function getMintedAmounts() public  view returns (uint256, uint256, uint256) {
        return (gtdMintCount, fcfsMintCount, publicMintCount);
    }

    function getAddressGTDLimit(address addr) view external  returns (int256) {
        return gtdMintAccountMap[addr];
    }

    function getAddressFCFSLimit(address addr) view external  returns (int256) {
        return fcfsMintAccountMap[addr];
    }

    function getAddressPublicLimit(address addr) view external  returns (int256) {
        return publicMintAccountMap[addr];
    }
    function getCurrentPhase() public view returns (string memory) {
        if (block.timestamp < startTime) {
            return "NOT STARTED";
        } else if (block.timestamp < gtdEndTime) {
            return "GTD";
        } else if (block.timestamp < fcfsEndTime) {
            return "FCFS";
        } else  {
            return "PUBLIC";
        }
    }
}
