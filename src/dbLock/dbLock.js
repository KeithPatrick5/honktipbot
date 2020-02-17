const { toggleLock } = require("./toggleLock");

/**
 * dbLock (database locks) set new lock for userId,
 * if userId have been locked previously,
 * wait until userId will be unlocked or timeout error.
 * @param ctx - context
 * @param {String} userId - id
 * @return {Promise}
 */
module.exports.dbLock = (ctx, userId) => {
  return new Promise((resolve, reject) => {
    const weight = +process.env.TIMEOUT;
    const timeout = Math.floor(Math.random() * weight) + weight;
    let waitTime = 0;

    const loop = () => {
      let lockedUsers = ctx.db.lockedUsers;
      let locked, isExists;

      for (const user of lockedUsers) {
        if (user.id === userId) {
          locked = user.locked;
          isExists = true;
          break;
        }
      }
      if (!locked || !isExists) {
        toggleLock(ctx, userId);
        resolve("dbLock success");
      } else if (timeout > waitTime) {
        setTimeout(() => {
          waitTime += 1000;
          loop();
        }, 1000);
      } else {
        console.log(`🗝 dbLock timeout`);
        console.table([{ userId: userId, message: ctx.message.text }]);
        const randTime = Math.floor(Math.random() * 10) + 1; 
        setTimeout(() => {
          console.log(`🗝 dbLock timeout, push through.`);
          resolve("dbLock timeout, push through.");
        }, randTime * weight);
      }
    };
    loop();
  });
};
