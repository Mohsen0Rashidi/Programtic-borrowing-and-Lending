const { getNamedAccounts, ethers, network } = require("hardhat")
const { networkConfig, AMOUNT } = require("../helper-hardhat-config")

async function getWeth() {
    const { deployer } = await getNamedAccounts()

    const iWeth = await ethers.getContractAt(
        "IWeth",
        networkConfig[network.config.chainId].wethToken,
        deployer
    )

    const txResponse = await iWeth.deposit({ value: AMOUNT })
    await txResponse.wait(1)

    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Got ${wethBalance.toString()} Weth`)
}

module.exports = { getWeth }
