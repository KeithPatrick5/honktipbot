const debug = require("debug")("telegraf:ratelimit");
const MemoryStore = require("./memory-store.js");

module.exports = function limit(options) {
  const config = Object.assign(
    {
      window: 1000,
      limit: 1,
      keyGenerator: function(ctx) {
        return ctx.from && ctx.from.id;
      },
      onLimitExceeded: () => {}
    },
    options
  );
  const store = new MemoryStore(config.window);
  return (ctx, next) => {
    // check if message addressed to bot
    if (ctx.message && ctx.message.text) {
      if (ctx.chat.type == "private") {
        const commands = ["/balance", "/withdraw", "/deposit", "/help"];
        if (commands.includes(ctx.message.text)) {
          const key = config.keyGenerator(ctx);
          if (!key) {
            return next();
          }
          const hit = store.incr(key);
          debug("key stats", key, hit);
          return hit <= config.limit
            ? next()
            : console.log(
                `limit exceed (hits:${hit}) in private chat for user: ${ctx.from.id} msg: ${ctx.message.text}`
              );
        } else {
          next();
        }
      } else if (ctx.chat.type == "group" || "supergroup") {
        if (ctx.message.reply_to_message) {
          const key = config.keyGenerator(ctx);
          if (!key) {
            return next()
          }
          const hit = store.incr(key);
          if (hit <= 5) {
            return console.log(
              `limit exceed (hits:${hit}) in group chat for user: ${ctx.from.id} msg: ${ctx.message.text}`
            );
          } else {
            // add to ban after 5 hits
            return console.log(
              `USER WILL BE BANNED! limit exceed (hits:${hit}) in group chat for user: ${ctx.from.id} msg: ${ctx.message.text}`
            );
          }
        } else {
          next();
        }
      } else {
        next();
      }
    } else {
      next();
    }
  };
};
