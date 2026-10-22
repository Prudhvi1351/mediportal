const hre = require("hardhat");

async function main() {
  const EHR = await hre.ethers.getContractFactory("EHR_AccessControl");
  const ehr = await EHR.deploy();
  await ehr.waitForDeployment();

  const address = await ehr.getAddress();
  console.log("EHR_AccessControl deployed to:", address);

  const fs = require("fs");
  fs.writeFileSync("../backend/contract_address.txt", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
