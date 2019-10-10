// Admin functions

/**Alert notification to all admins
 *
 */
module.exports.alert = (ctx, message) => {
  sendMessageToAdmins(ctx, message);
};

/** Check escrow wallet balance
 *  and sends warning to admin
 *  if low amount of tokens left
 */
module.exports.notification = (ctx, balances) => {
  let message = "";
  const bchSat = balances.bchBalance;
  const tokens = balances.tokens;
  const slpAddress = balances.address;
  const minBchSat = process.env.WARNING_MINIMUM_ESCROW_BALANCE;
  const minTokens = process.env.WARNING_MINIMUM_ESCROW_TOKEN_BALANCE;
  
  let balance = `Escrow wallet:\n${bchSat} BCH Satoshi\n${tokens} HONK`;
  balance += `\ncashAddress: ${slpAddress}\nhttps://explorer.bitcoin.com/bch/address/${slpAddress}`;

  if (bchSat < minBchSat) {
    message +=
      `Warning! Minimum BCH Satoshi amount (${minBchSat}) reached:\n` + balance;
    sendMessageToAdmins(ctx, message);
  } else if (tokens < minTokens) {
    message +=
      `Warning! Minimum HONK amount (${minTokens}) reached:\n` + balance;
    sendMessageToAdmins(ctx, message);
  }
};

const sendMessageToAdmins = (ctx, message) => {
  // Notification to all admins
  const admins = process.env.ADMIN_IDS.split(",");

  admins.forEach(adminId => {
    ctx.telegram.sendMessage(adminId, message);
  });
};
