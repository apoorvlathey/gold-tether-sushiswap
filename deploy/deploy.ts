import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { utils } from "ethers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const WETHInstance = await deploy("WETH9", {
    from: deployer,
    log: true,
  });

  const factoryInstance = await deploy("UniswapV2Factory", {
    args: [deployer.address],
    from: deployer,
    log: true,
  });

  await deploy("UniswapV2Router02", {
    args: [factoryInstance.address, WETHInstance.address],
    from: deployer,
    log: true,
  });

  await deploy("TetherToken", {
    args: ["1000000000", "Gold Tether", "XAUt", 6], // 1000 initial
    from: deployer,
    log: true,
  });
};
export default func;
func.tags = ["WETH9", "UniswapV2Factory", "UniswapV2Router02"];
