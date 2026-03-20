/**
 * Hardhat deploy script — ReactiveWill on Somnia Testnet.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network somnia
 *
 * Make sure PRIVATE_KEY is set in .env before running.
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying ReactiveWill with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "STT"
  );

  const ReactiveWill = await ethers.getContractFactory("ReactiveWill");
  const will = await ReactiveWill.deploy();
  await will.waitForDeployment();

  const address = await will.getAddress();
  console.log("\n✅ ReactiveWill deployed to:", address);
  console.log(
    "   Explorer:",
    `https://shannon-explorer.somnia.network/address/${address}`
  );
  console.log("\nNext steps:");
  console.log("  1. Copy the address above");
  console.log("  2. Add it to .env:  VITE_WILL_CONTRACT_ADDRESS=" + address);
  console.log("  3. Run: npm run dev");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
