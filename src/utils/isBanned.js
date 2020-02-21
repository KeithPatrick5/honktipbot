const fs = require("fs");

module.exports.isBanned = id => {
  let bannedUsers;
  try {
    bannedUsers = fs.readFileSync("./bannedUsers.json");
    bannedUsers = JSON.parse(bannedUsers)
  } catch (error) {
    bannedUsers = { ids: [] };
  }
  //console.log(bannedUsers);
  
  return bannedUsers.ids.includes(+id)
};