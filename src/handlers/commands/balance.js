const Markup = require("telegraf/markup");
const { getSession } = require("../../dynamoDB");
const { sessionInit } = require("../../sessionInit");

module.exports.balance = async ctx => {
  const session = await getSession(ctx.from.id);
  
  if (!session.wallet.honkPoints) await sessionInit(ctx);

  const honkPoints = session.wallet.honkPoints;

  ctx.replyWithMarkdown(
    `*${ctx.from.first_name}* your balance: *${honkPoints}* 🤡*HONK*🤡`,
    Markup.keyboard([["/balance", "/help"], ["/deposit", "/withdraw"]])
      .oneTime()
      .resize()
      .extra()
  );
};
