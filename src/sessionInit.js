const { saveSession, getSession } = require("./dynamoDB");
const { saveToDepositsTable } = require("./depositsTable");
const { createWallet } = require("./slp/create-wallet");


/** Session Initialization for new users
 *  or update ctx.session with existed session form DB
 */
module.exports.sessionInit = async ctx => {
  const session = await getSession(ctx.from.id);
  if (!session.from) await newSession(ctx);
  if (!ctx.session.from) ctx.session = session;
};


/** Session Initialization for replyed users
 *  used in case when you tipped to person
 *  that not in DB
 */
module.exports.sessionInitByData = async (from, amount) => {
  // from => ctx.message.reply_to_message.from
  const session = await newSessionByData(from, amount);
  return session;
};


const newSession = async ctx => {
  console.log("Session Initialization for: ");
  console.log(ctx.from);
  const keysObj = createWallet();

  ctx.session = {
    from: ctx.from,
    startedAt: Date.now(),
    wallet: {
      honkPoints: 0,
      SLPaddress: keysObj.slpAddress,
      keys: keysObj,
      transferedDeposits: {
        totalReceived: 0,
        txAppearances: 0,
        transactions : []
      }
    }
  };

  await saveToDepositsTable(keysObj.slpAddress, ctx.from.id);
  await saveSession(ctx.from.id, ctx.session);
};

const newSessionByData = async (from, amount) => {
  console.log("Session Initialization By Id for: ");
  console.log(from.id);
  const keysObj = createWallet();
  
  const session = {
    from: from,
    startedAt: Date.now(),
    wallet: {
      honkPoints: amount,
      SLPaddress: keysObj.slpAddress,
      keys: keysObj,
      transferedDeposits: {
        totalReceived: 0,
        txAppearances: 0,
        transactions : []
      }
    }
  };

  await saveToDepositsTable(keysObj.slpAddress, from.id);
  await saveSession(from.id, session);
  return session;
};
