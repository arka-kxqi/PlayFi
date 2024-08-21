// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "hardhat/console.sol";

contract Pizzapad is Ownable, ReentrancyGuard {
    address public mFundAddress;

    event EthDeposited(address indexed sender, uint256 amount);

    constructor(
        address _mFundAddress
    ) Ownable(msg.sender){
        mFundAddress = _mFundAddress;
    }

    receive() external payable {}

    function withdraw(uint256 amount) external onlyOwner{
        require(msg.sender == mFundAddress, "Pizzapad: not mFundAddress");
        (bool success, ) = payable(mFundAddress).call{value: amount}("");
        require(success, "Low-level call failed");
    }
    function depositETH() external payable {
        emit EthDeposited(msg.sender, msg.value);
    }
}

