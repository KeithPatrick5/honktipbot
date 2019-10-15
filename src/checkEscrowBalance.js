const { getBalance } = require("./slp/getBalance");
const { getSession, saveSession } = require("./dynamoDB");

/** Check escrow balances
 *  after each 10 transaction.
 *  note:escrow wallet SessionKey - 'escrow'
 * @return {Object} balances
 * @return {String} balances.address - SLPaddress
 * @return {String} balances.bchBalance - cash satoshis balance
 * @return {String} balances.tokens - token balance
 * */
module.exports.checkEscrowBalance = async () => {
  // Session
  const escrowId = process.env.BOT_ID;
  const session = await getSession(escrowId);
  const totalWithdraws = parseInt(session.totalWithdraws);

  if (totalWithdraws % 1 == 0) {
    // Update escrow balance
    const balances = await getBalance(process.env.ESCROW_WALLET_MNEMONIC);
    session.wallet.bchSatoshi = balances.bchBalance;
    session.wallet.honkPoints = balances.tokens;
    await saveSession(escrowId, session);

    balances.address = session.wallet.SLPaddress;
    return balances;
  } else {
    // return balance
    const balances = {
      tokens: session.wallet.honkPoints,
      bchBalance: session.wallet.bchSatoshi,
      address: session.wallet.SLPaddress
    };
    return balances;
  }
};

/** Add new withdraw to totalWithdraws
 *
 */
module.exports.withdrawCounter = async () => {
  const escrowId = process.env.BOT_ID;
  const session = await getSession(escrowId);
  session.totalWithdraws += 1;
  await saveSession(escrowId, session);
};
