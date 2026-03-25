const saveContractAddress = require("../scripts/shared/saveContractAddress");
const verifyContract = require("../scripts/shared/verifyContract");

async function rcMarketDeploy() {
  // RC Token address - this is the mainnet RC token address
  const rcTokenAddress = process.env.RC_TOKEN_ADDRESS;
  
  if (!rcTokenAddress) {
    throw new Error("RC_TOKEN_ADDRESS environment variable is required");
  }

  const RCMarket = await ethers.getContractFactory("RCMarket");

  const rcMarket = await RCMarket.deploy(rcTokenAddress);

  saveContractAddress("RCMarket", rcMarket.target);

  console.log(`RCMarket address ${rcMarket.target}`);

  await verifyContract(rcMarket, "RCMarket");

  return { rcMarket };
}

module.exports = rcMarketDeploy;