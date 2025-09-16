// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
var fs = require("fs");
const educationCenterDeploy = require("../migrations/1_educationCenter.deploy.js");
const sintropAppStoreDeploy = require("../migrations/2_sintropAppStore.deploy.js");
const globalPlantCatalogDeploy = require("../migrations/3_globalPlantCatalog.js");
const humansPeaceTreatyDeploy = require("../migrations/5_humansPeaceTreaty.js");
const whitepaperDeploy = require("../migrations/6_whitepaperCenter.js");

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

async function startDeployAlert() {
  const etherscanVerificationEnabled = process.env["ETHERSCAN_VERIFICATION_ENABLED"];
  const etherscanVerifyEnabledText = etherscanVerificationEnabled == 'true' ? "HABILITADA" : 'DESABILITADA'
  const deployStartSeconds = process.env["DEPLOY_START_SECONDS"] || 1;

  console.log(`-------------------  REDE ${hre.network.name} (CTRL + C para cancelar) -------------------`);

  console.log(`VERIFICAÇÃO DOS CONTRATOS ESTÁ ${etherscanVerifyEnabledText}`);
  

  for (let i = deployStartSeconds; i > 0; i--) {
    await sleep(1000);
    console.log(`-------------------  DEPLOY INICIANDO EM ${i} SEGUNDOS -------------------`);
  }

  console.log("------------------- DEPLOY INICIADO -------------------");
}

function showDeployedAddress() {
  const filepath = `deployed_contracts/${hre.network.name}`;
  var files = fs.readdirSync(filepath);

  files.forEach((filename) => {
    const data = fs.readFileSync(`${filepath}/${filename}`, "utf8");
    object = JSON.parse(data);

    console.log();
    console.log(object["name"]);
    console.log(object["address"]);
    console.log();
  });
}

async function main() {
  await startDeployAlert();

  // await educationCenterDeploy();
  // await sintropAppStoreDeploy();
  // await globalPlantCatalogDeploy();
  // await humansPeaceTreatyDeploy();
  // await whitepaperDeploy();

//  await afterDeploy();

  // showDeployedAddress();
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
