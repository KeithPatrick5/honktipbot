/*
  Check the BCH and SLP token balances for the wallet created with the
  create-wallet example app.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = process.env.NETWORK;

const SLPSDK = require("slp-sdk");

// Instantiate SLP based on the network.
let SLP;
if (NETWORK === `mainnet`)
  SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` });
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` });

/**
 * Get balance from bitcoin.com.
 *
 * @param {Object} mnemonic - Wallet mnemonic key.
 * @returns {Object} balances - Balance object.
 * @returns {number} balances.bchBalance - BCH Balance.
 * @returns {Object} balances.tokens - SLP Token Balances.
 */
module.exports.getBalance = async mnemonicString => {
  // Open the wallet generated with create-wallet.
  let mnemonicKey;
  try {
    mnemonicKey = mnemonicString;
  } catch (err) {
    console.log(`You need to add wallet mnemonic key.`);
    return;
  }

  try {
    const mnemonic = mnemonicKey;

    // root seed buffer
    const rootSeed = SLP.Mnemonic.toSeed(mnemonic);
    // master HDNode
    let masterHDNode;
    if (NETWORK === `mainnet`) masterHDNode = SLP.HDNode.fromSeed(rootSeed);
    else masterHDNode = SLP.HDNode.fromSeed(rootSeed, "testnet"); // Testnet

    // HDNode of BIP44 account
    const account = SLP.HDNode.derivePath(masterHDNode, "m/44'/145'/0'");

    const change = SLP.HDNode.derivePath(account, "0/0");

    // get the cash address
    const cashAddress = SLP.HDNode.toCashAddress(change);
    const slpAddress = SLP.Address.toSLPAddress(cashAddress);

    // balances object
    const balances = {};
    // first get BCH balance
    const balance = await SLP.Address.details(cashAddress);
    balances.bchBalance = balance.balanceSat;

    // console.log(`BCH Balance information for ${slpAddress}:`);
    // console.log(balance);
    console.log(`SLP Token information:`);

    // get token balances
    try {
      const tokens = await SLP.Utils.balancesForAddress(slpAddress);
      balances.tokens = tokens[0].balance;

      console.log(JSON.stringify(tokens, null, 2));
    } catch (error) {
      if (error.message === "Address not found")
        console.log(`No tokens found.`);
      else console.log(`Error: `, error);
    }

    return balances;
  } catch (err) {
    console.error(`Error in getBalance: `, err);
    console.log(`Error message: ${err.message}`);
    throw err;
  }
};
