// Implanta o RegistroProtocolos na rede escolhida (npm run deploy usa a rede local).
//
// Contas usadas (as de teste do Hardhat, SEM valor real):
//   conta 0 -> dono do contrato (implanta e pode trocar o registrador)
//   conta 1 -> registrador (a "conta de servico" que, no futuro, seria a API)
//
// O endereco fica em deployments/<rede>.json para o demo.js encontrar.

const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;
  const [dono, registrador] = await ethers.getSigners();

  const Fabrica = await ethers.getContractFactory("RegistroProtocolos");
  const contrato = await Fabrica.deploy(registrador.address);
  await contrato.waitForDeployment();
  const endereco = await contrato.getAddress();

  const pasta = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(
    path.join(pasta, `${network.name}.json`),
    JSON.stringify({ rede: network.name, contrato: endereco, dono: dono.address, registrador: registrador.address }, null, 2)
  );

  console.log(`Rede ............ ${network.name}`);
  console.log(`Contrato ........ ${endereco}`);
  console.log(`Dono ............ ${dono.address}`);
  console.log(`Registrador ..... ${registrador.address}`);
  console.log(`Endereco salvo em deployments/${network.name}.json`);
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
