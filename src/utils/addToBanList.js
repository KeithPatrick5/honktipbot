const fs = require("fs");

module.exports.addToBanList = id => {
  console.log(`Adding to ban list user: ${id}`);
  let bannedUsers;
  try {
    bannedUsers = fs.readFileSync("./bannedUsers.json");
    bannedUsers = JSON.parse(bannedUsers);
  } catch (error) {
    bannedUsers = { ids: [] };
  }
  bannedUsers.ids.push(+id)
  
  return fs.writeFileSync("./bannedUsers.json", JSON.stringify(bannedUsers, null. 2))
};
