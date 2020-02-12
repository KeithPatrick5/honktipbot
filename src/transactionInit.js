const { getSession, saveSession } = require("./dynamoDB");
const { sessionInitByData } = require("./sessionInit");

// fromUser - user that want to make transaction to "toUser"
// toUser - destination user
// amount - number of points to send

module.exports.transactionInit = async (amount, ctx, toUser) => {
  // Check destination user: toUser
  // Get toUser session by id
  let toUserSession = await getSession(toUser.id);

  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }
  if (isEmpty(toUserSession)) toUserSession = null;

  if (toUserSession) {
    // make trx
    return await pushTransaction(amount, ctx, toUserSession);
  } else {
    // add session for user: 'toUser'
    toUserSession = await sessionInitByData(toUser, 0);
    // make trx
    return await pushTransaction(amount, ctx, toUserSession);
  }
};

const pushTransaction = async (amount, ctx, toUserSession) => {
  console.log(
    `TransactionInit:: pushTransaction started from: ${
      ctx.session.from.id
    } to: ${toUserSession.from.id}`
  );

  let fromUserSession = await getSession(ctx.from.id);
  //ctx.session = fromUserSession;

  if (!fromUserSession.wallet) {
    console.log("TransactionInit:: pushTransaction failed !");
    await sessionInitByData(ctx.from, 0);
    return false;
  }

  const fromUserPoints = fromUserSession.wallet.honkPoints;

  if (fromUserPoints >= amount && amount !== 0) {
    fromUserSession.wallet.honkPoints -= amount;
    // Save fromUser session to dynamoDB
    await saveSession(fromUserSession.from.id, fromUserSession);

    toUserSession.wallet.honkPoints = toUserSession.wallet.honkPoints + amount;
    // Save toUser session to dynamoDB
    await saveSession(toUserSession.from.id, toUserSession);

    console.log(
      `${ctx.from.first_name} sent ${amount} HONK to ${toUserSession.from.first_name}`
    );
    return true;
  } else {
    console.log("TransactionInit:: pushTransaction failed !");
    return false;
  }
};
