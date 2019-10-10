const { checkSLPAddress } = require("../../slp/checkSLPAddress");
const { sendToken } = require("../../slp/send-token");
const { getSession, saveSession } = require("../../dynamoDB");
// const { getBalance } = require("../../slpdb/getBalance");
const { checkEscrowBalance, withdrawCounter } = require("../../checkEscrowBalance");
const admin = require("../../admin");

module.exports.withdraw = async ctx => {
  let msg = "";
  const args = ctx.state.command.splitArgs;

  if (args.length == 2) {
    //check amount and address
    const withdrawLimit = process.env.WITHDRAW_LIMIT;
    const withdrawMaximum = process.env.WITHDRAW_MAXIMUM;
    const withdrawDelayTime = process.env.WITHDRAW_DELAY_TIME;
    const amount = +args[0];
    const destSLPaddr = args[1];
    const session = await getSession(ctx.from.id);
    const wallet = session.wallet;
    let delta;

    if (session.lastWithdraw) {
      delta = (Date.now() - session.lastWithdraw) / 60000;
    } else {
      delta = withdrawDelayTime;
    }

    if (
      Number.isInteger(amount) &&
      wallet.honkPoints >= amount &&
      amount >= withdrawLimit &&
      amount <= withdrawMaximum &&
      delta >= withdrawDelayTime
    ) {
      // Typing action while wait transaction processing
      ctx.replyWithChatAction("typing");

      const withdrawResult = await withdrawValidation(
        ctx,
        session,
        amount,
        destSLPaddr
      );

      console.log(withdrawResult);
      msg += withdrawResult;
    } else {
      if (amount < withdrawLimit) {
        msg += `Withdraw limit : ${withdrawLimit}`;
      } else if (wallet.honkPoints < amount) {
        //Not enough
        msg += `Wrong amount ${args[0]}, you don't have enough tokens:${
          wallet.honkPoints
        }`;
      } else if (delta < withdrawDelayTime) {
        const left = (withdrawDelayTime - delta).toFixed(2);
        msg += `Sorry, you can't withdraw tokens during: ${left} min.\nPlease wait.`;
      } else if (amount > withdrawMaximum) {
        msg += `Sorry, you can't withdraw more than ${withdrawMaximum} tokens.`;
      } else {
        //Wrong amount
        msg += `Wrong amount: ${args[0]}`;
      }
    }
  } else {
    // Wrong command format! to withdraw tokens use follow format
    msg += `
🤡*HOW TO WITHDRAW*🤡\nTo withdraw tokens the proper syntax is:\n\n*/withdraw "amount" "simpleledger address"*
\n\nExample:\n\n/withdraw 10 simpleledger:123456abcdefg123456abcdefg123456abcdefg`;
  }

  ctx.replyWithMarkdown(msg);
};

const withdrawTokens = async (session, amount, destSLPaddr) => {
  // Main withdraw process
  // Update Session Balance

  session.wallet.honkPoints -= amount;
  session.lastWithdraw = Date.now();
  await saveSession(session.from.id, session);
  try {
    await sendToken(amount, destSLPaddr);
    await withdrawCounter()
    return true;
  } catch (err) {
    console.log("Withdraw error at sendToken.js :\n", err);
    return;
  }
};

const withdrawValidation = async (ctx, session, amount, destSLPaddr) => {
  // Check SLP address
  const isSLPAddr = await checkSLPAddress(destSLPaddr);

  if (isSLPAddr) {
    // Need to check escrow balance
    const balances = await checkEscrowBalance();
    const tokenBalance = balances.tokens;
    const bchBalance = balances.bchBalance;
    console.log('Escrow balance:\n',JSON.stringify(balances, null, 2));

    if (tokenBalance < amount) {
      // Escrow wallet doesn't have enough HONK tokens to make transaction
      let warnMsg =
        "ALERT! Escrow wallet doesn't have enough HONK tokens to make transaction";
      warnMsg += `\nEscrow balance: ${tokenBalance}HONK; ${amount}`;
      admin.alert(ctx, warnMsg);
      console.log(warnMsg);
      return `Sorry! We currently can't process this transaction. Please try later.`;
    } else if (bchBalance < process.env.MINIMUM_ESCROW_BALANCE) {
      // Escrow wallet doesn't have enough BCH to pay for transaction FEE
      let warnMsg =
        "ALERT! Escrow wallet doesn't have enough BCH to pay for transaction FEE";
      admin.alert(ctx, warnMsg);
      console.log(warnMsg);
      return `Sorry! We currently can't process this transaction. Please try later.`;
    }

    admin.notification(ctx, balances);
    // Final withdraw
    const withdrawResult = await withdrawTokens(session, amount, destSLPaddr);

    if (withdrawResult) {
      return `Successfuly withdraw *${amount}* to SLPaddress:\n*${destSLPaddr}*`;
    } else {
      return `Sorry! We can't process this transaction. Please try later.`;
    }
  } else {
    return `Wrong SLP address! Check your address:\n*${destSLPaddr}*`;
  }
};
