# Sushiswap for Tether Gold (XAUt)

Yesterday, after Uniswap blocked some tokens from their official interface, it came to light that XAUt token was removed because it didn't work with the current implementation of Uniswap.  
The contract is not a standard ERC20 as the `transfer` function doesn't return `true` if the transfer was successful.

So I forked the Sushiswap contracts and changed the `transfer` calls to `transferFrom` as it conforms to the ERC20 standard.

1. `yarn install`
2. Create `.env` file. Check `.env.sample` for more info.
3. `yarn test` to test on Forked Mainnet
