// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

contract TimeLockVault {
    address public owner;
    uint256 public unlockTime;

    struct Deposit {
        uint256 amount;
        uint256 timestamp;
        bool claimed;
    }

    mapping(address => Deposit[]) public deposits;
    mapping(address => uint256) public totalDeposited;

    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Claimed(address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
        unlockTime = block.timestamp + 6 hours;
    }

    function deposit() external payable {
        require(block.timestamp < unlockTime, "Deposit period has ended");
        require(msg.value > 0, "Deposit amount must be greater than 0");

        deposits[msg.sender].push(
            Deposit({
                amount: msg.value,
                timestamp: block.timestamp,
                claimed: false
            })
        );

        totalDeposited[msg.sender] += msg.value;

        emit Deposited(msg.sender, msg.value, block.timestamp);
    }

    function claim(uint256 index) external {
        require(block.timestamp >= unlockTime, "Funds are still locked");
        require(index < deposits[msg.sender].length, "Invalid deposit index");

        Deposit storage userDeposit = deposits[msg.sender][index];
        require(!userDeposit.claimed, "Already claimed");

        userDeposit.claimed = true;
        payable(msg.sender).transfer(userDeposit.amount);

        emit Claimed(msg.sender, userDeposit.amount);
    }

    function getDeposits(address user) external view returns (Deposit[] memory) {
        return deposits[user];
    }

    function getUnlockTime() external view returns (uint256) {
        return unlockTime;
    }

    function getTotalDeposited(address user) external view returns (uint256) {
        return totalDeposited[user];
    }
}
