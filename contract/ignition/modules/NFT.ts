const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const NFTModule = buildModule("NFTModule", (m: any) => {
  const name = m.getParameter("name", "YNFT");
  const symbol = m.getParameter("symbol", "YOWAI");

  const NFT = m.contract("NFT", [name, symbol]);

  return { NFT };
});

module.exports = NFTModule;
