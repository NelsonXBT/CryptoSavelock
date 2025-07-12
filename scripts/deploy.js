const { ethers } = require("hardhat");

async function main() {
  const Vault = await ethers.getContractFactory("contracts/TimeLockVault.sol:TimeLockVault");

  const vault = await Vault.deploy();

  await vault.waitForDeployment(); // ✅ correct method in latest Hardhat versions

  console.log("✅ Vault deployed to:", await vault.getAddress());
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
