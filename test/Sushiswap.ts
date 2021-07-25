import { ethers, network, waffle } from "hardhat";
import { parseEther } from "@ethersproject/units";
import { AddressZero, MaxUint256, HashZero } from "@ethersproject/constants";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { solidity } from "ethereum-waffle";
import chai from "chai";

chai.use(solidity);
const { expect } = chai;
const { deployContract } = waffle;

const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

// artifacts
import UniswapV2FactoryArtifact from "../artifacts/contracts/UniswapV2Factory.sol/UniswapV2Factory.json";
import UniswapV2Router02Artifact from "../artifacts/contracts/UniswapV2Router02.sol/UniswapV2Router02.json";
import UniswapV2PairArtifact from "../artifacts/contracts/UniswapV2Pair.sol/UniswapV2Pair.json";
import ERC20Artifact from "../artifacts/contracts/interfaces/IERC20.sol/IERC20Uniswap.json";

// types
import {
  UniswapV2Factory,
  UniswapV2Router02,
  UniswapV2Pair,
  UniswapV2ERC20,
  IERC20Uniswap,
} from "../typechain";

describe("Sushiswap", () => {
  let factory: UniswapV2Factory;
  let router: UniswapV2Router02;

  let deployer: SignerWithAddress;
  let user: Signer;

  // mainnet user to impersonate as user
  const XAUtHolder = "0xF511af2Ded82e9E24fF011824575F9B175c95572";

  // tokens
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const XAUt = "0x4922a015c4407F87432B179bb209e125432E4a2A";
  let xautWethLP: UniswapV2ERC20;
  let XAUtToken: IERC20Uniswap;

  before(async () => {
    [deployer] = await ethers.getSigners();
    // impersonate
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [XAUtHolder],
    });
    user = await ethers.provider.getSigner(XAUtHolder);

    // deploy contracts
    factory = (await deployContract(deployer, UniswapV2FactoryArtifact, [
      deployer.address,
    ])) as UniswapV2Factory;
    router = (await deployContract(deployer, UniswapV2Router02Artifact, [
      factory.address,
      WETH,
    ])) as UniswapV2Router02;

    XAUtToken = (await ethers.getContractAt(
      ERC20Artifact.abi,
      XAUt
    )) as IERC20Uniswap;
  });

  describe("Interact with XAUt-WETH Pool", () => {
    before(async () => {
      // deploy pool
      await factory.connect(deployer).createPair(XAUt, WETH);

      const xautWethLPAddress = await factory.getPair(XAUt, WETH);
      xautWethLP = (await ethers.getContractAt(
        UniswapV2PairArtifact.abi,
        xautWethLPAddress
      )) as UniswapV2Pair;

      // give infinite approval to router
      await XAUtToken.connect(user).approve(router.address, MAX_UINT256);
      await xautWethLP.connect(user).approve(router.address, MaxUint256);
    });

    it("should provide liquidity", async () => {
      const preLPBalance = await xautWethLP.balanceOf(XAUtHolder);

      const xautAmt = "1000000";
      const ethAmt = parseEther("1");
      await router
        .connect(user)
        .addLiquidityETH(
          XAUt,
          xautAmt,
          xautAmt,
          ethAmt,
          XAUtHolder,
          MAX_UINT256,
          { value: ethAmt }
        );
      const postLPBalance = await xautWethLP.balanceOf(XAUtHolder);
      expect(postLPBalance).to.be.gt(preLPBalance);
    });

    it("should sell XAUt", async () => {
      const preXAUtBalance = await XAUtToken.balanceOf(XAUtHolder);
      const preETHBalance = await user.getBalance();

      const xautAmt = "100000";
      await router
        .connect(user)
        .swapExactTokensForETH(
          xautAmt,
          0,
          [XAUt, WETH],
          XAUtHolder,
          MaxUint256
        );

      const postXAUtBalance = await XAUtToken.balanceOf(XAUtHolder);
      const postETHBalance = await user.getBalance();

      expect(postXAUtBalance).to.be.lt(preXAUtBalance);
      expect(postETHBalance).to.be.gt(preETHBalance);
    });

    it("should buy XAUt", async () => {
      const preXAUtBalance = await XAUtToken.balanceOf(XAUtHolder);
      const preETHBalance = await user.getBalance();

      const ethAmt = parseEther("0.1");
      await router
        .connect(user)
        .swapExactETHForTokens(0, [WETH, XAUt], XAUtHolder, MaxUint256, {
          value: ethAmt,
        });

      const postXAUtBalance = await XAUtToken.balanceOf(XAUtHolder);
      const postETHBalance = await user.getBalance();

      expect(postXAUtBalance).to.be.gt(preXAUtBalance);
      expect(postETHBalance).to.be.lt(preETHBalance);
    });

    it("should remove liquidity", async () => {
      const preLPBalance = await xautWethLP.balanceOf(XAUtHolder);
      const preXAUtBalance = await XAUtToken.balanceOf(XAUtHolder);
      const preETHBalance = await user.getBalance();

      await router
        .connect(user)
        .removeLiquidityETH(XAUt, preLPBalance, 0, 0, XAUtHolder, MaxUint256);

      const postLPBalance = await xautWethLP.balanceOf(XAUtHolder);
      const postXAUtBalance = await XAUtToken.balanceOf(XAUtHolder);
      const postETHBalance = await user.getBalance();

      expect(postLPBalance).to.be.lt(preLPBalance);
      expect(postXAUtBalance).to.be.gt(preXAUtBalance);
      expect(postETHBalance).to.be.gt(preETHBalance);
    });
  });
});
