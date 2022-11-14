const { getNamedAccounts, ethers, network } = require("hardhat")
const { networkConfig, AMOUNT } = require("../helper-hardhat-config")
const { getWeth } = require("../scripts/getWeth")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const lendingPool = await getLendingPool(deployer)
    const wethAddress = networkConfig[network.config.chainId].wethToken
    await approveErc20(wethAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing Weth...")
    await lendingPool.deposit(wethAddress, AMOUNT, deployer, 0)
    console.log("Deposited!")
    // Getting your borrowing stats
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
        lendingPool,
        deployer
    )
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow =
        availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    const amountDaiToBorrowWei = ethers.utils.parseEther(
        amountDaiToBorrow.toString()
    )
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
    await borrowDai(
        networkConfig[network.config.chainId].daiToken,
        lendingPool,
        amountDaiToBorrowWei,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
    await repay(
        networkConfig[network.config.chainId].daiToken,
        amountDaiToBorrowWei,
        lendingPool,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
}

async function repay(daiAddress, amount, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const txRepay = await lendingPool.repay(daiAddress, amount, 1, account)
    await txRepay.wait(1)
    console.log("repaied!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
    const txBorrow = await lendingPool.borrow(
        daiAddress,
        amountDaiToBorrow,
        1,
        0,
        account
    )
    txBorrow.wait(1)
    console.log("You've borrowed!")
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} Worth of ETH deposeted.`)
    console.log(`You have ${totalDebtETH} Worth of ETH Borrowed.`)
    console.log(`You have ${availableBorrowsETH} Worth of ETH .`)
    return { availableBorrowsETH, totalDebtETH }
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config.chainId].daiEthPriceFeed
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}

async function approveErc20(erc20Address, spenderAddress, amount, signer) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        signer
    )
    const txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
    console.log("Approved!")
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].ILendingPoolAddressesProvider,
        account
    )
    const lendingPoolAddress =
        await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    )
    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
