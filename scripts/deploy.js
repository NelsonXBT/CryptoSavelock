const { ethers } = require("hardhat");

async function main() {
  const Vault = await ethers.getContractFactory("contracts/TimeLockVault.sol:TimeLockVault"); // ✅ specify full path

  const vault = await Vault.deploy(); // no constructor args

  await vault.waitForDeployment();

  console.log("Vault deployed to:", await vault.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
