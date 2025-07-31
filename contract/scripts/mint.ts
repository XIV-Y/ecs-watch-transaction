import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "";
  const TO_ADDRESS = "";

  const TOKEN_URI = "";

  console.log("Minting NFT...");
  
  const NFT = await ethers.getContractFactory("NFT");
  const nft = NFT.attach(CONTRACT_ADDRESS) as any;

  const tx = await nft.mint(TO_ADDRESS, TOKEN_URI);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Minted successfully! Block:", receipt.blockNumber);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
