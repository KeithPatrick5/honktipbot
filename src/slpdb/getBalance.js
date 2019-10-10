// Get SLP address balance
const btoa = require("btoa");
const axios = require("axios").default;

/** Get Balance from fountainhead
 * @param {String} SLPaddress
 * @return {Object} balances
 * @return {String} balances.tokenDetails.tokenIdHex - Token ID
 * @return {String} balances.address - SLPaddress
 * @return {String} balances.satoshis_balance - cash satoshis balance
 * @return {String} balances.token_balance - token balance
 */
module.exports.getBalance = async SLPaddress => {
  const query = {
    v: 3,
    q: {
      find: {
        address: SLPaddress
      },
      limit: 10
    }
  };

  url = "https://slpdb.fountainhead.cash/q/" + btoa(JSON.stringify(query));

  // console.log(btoa(JSON.stringify(query)));
  // Check token id 
  const tokenId = process.env.TOKENID;

  try {
    const res = await axios.get(url);
    const balances = res.data.a[0];
    console.log('GetBalance:: ',balances);
    return balances;
  } catch (err) {
    console.log(err);
    return;
  }
};
