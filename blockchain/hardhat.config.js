require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  // A rede "localhost" (http://127.0.0.1:8545, criada por `npm run node`) e a
  // rede "hardhat" (em memoria, usada nos testes) ja existem por padrao.
};
