/**
 * Locks database for userId if it wasn't locked
 * and vice-versa unlock.
 * 
 * If userId doen't exists in ctx.db.lockedUsers array, 
 * then lock it.
 * @param ctx - context
 * @param {String} userId - id
 */
module.exports.toggleLock = (ctx, userId) => {
  let lockedUsers = ctx.db.lockedUsers;
  let locked, isExists;
  let index = 0;

  for (const user of lockedUsers) {
    if (user.id === userId) {
      locked = user.locked ? false : true;
      isExists = true;
      break;
    }
    index++;
  }

  if (isExists) {
    lockedUsers[index].locked = locked;
  } else {
    // add new lock
    lockedUsers.push({
      id: userId,
      locked: true
    });
  }
  ctx.db.lockedUsers = lockedUsers;
};
