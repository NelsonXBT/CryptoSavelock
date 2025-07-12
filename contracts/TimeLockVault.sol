// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

contract TimeLockVault {
    address public owner;
    uint256 public unlockTime;
    uint256 public startTime;
    uint256 public userCount;

    struct Deposit {
        uint256 amount;
        uint256 timestamp;
        bool claimed;
    }

    mapping(address => Deposit[]) public deposits;
    mapping(address => uint256) public totalDeposited;
    mapping(address => bool) public hasDepositedBefore;

    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Claimed(address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
        startTime = block.timestamp;
        unlockTime = block.timestamp + 10 days;
    }

    function deposit() external payable {
        require(block.timestamp < unlockTime, "Deposit period has ended");
        require(msg.value > 0, "Deposit amount must be greater than 0");

        // Track unique users
        if (!hasDepositedBefore[msg.sender]) {
            hasDepositedBefore[msg.sender] = true;
            userCount++;
        }

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

    function claimAll() external {
        require(block.timestamp >= unlockTime, "Funds are still locked");

        Deposit[] storage userDeposits = deposits[msg.sender];
        uint256 totalToClaim = 0;

        for (uint256 i = 0; i < userDeposits.length; i++) {
            if (!userDeposits[i].claimed) {
                totalToClaim += userDeposits[i].amount;
                userDeposits[i].claimed = true;
            }
        }

        require(totalToClaim > 0, "No unclaimed deposits");
        payable(msg.sender).transfer(totalToClaim);

        emit Claimed(msg.sender, totalToClaim);
    }

    function getDeposits(address user) external view returns (Deposit[] memory) {
        return deposits[user];
    }

    function getUnlockTime() external view returns (uint256) {
        return unlockTime;
    }

    function getStartTime() external view returns (uint256) {
        return startTime;
    }

    function getTotalDeposited(address user) external view returns (uint256) {
        return totalDeposited[user];
    }

    function getUserCount() external view returns (uint256) {
        return userCount;
    }
}
