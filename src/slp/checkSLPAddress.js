const SLPSDK = require("slp-sdk");

/** Check SLP Address Format
 * 
 * @param {String} address - Transaction id.
 * @returns {Boolean} (boolean) checking result.
 */

//USED IN WITHDRAW

module.exports.checkSLPAddress = async address => {
  // Set NETWORK to either testnet or mainnet
  const NETWORK = process.env.NETWORK;

  // Instantiate SLP based on the network.
  let SLP;
  if (NETWORK === `mainnet`)
    SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` });
  else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` });

  try {
    const isSLPaddr = await SLP.Address.isSLPAddress(address);
    if (isSLPaddr) {
      let checkNetwork;
      if (NETWORK == "mainnet") {
        // boolean
        return await SLP.Address.isMainnetAddress(address);
      } else {
        return await SLP.Address.isTestnetAddress(address);
      }
    }
  } catch (error) {
    console.error("checkSLPAddress::Error:", error);
    return false;
  }
};
