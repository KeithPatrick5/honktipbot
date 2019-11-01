const DynamoDBSession = require("telegraf-session-dynamodb");

const dynamoSession = new DynamoDBSession({
  dynamoDBConfig: {
    params: {
      TableName: process.env.AWS_DYNAMODB_TABLE
    },
    getSessionKey: ctx => ctx.from && `${ctx.from.id}`,
    region: process.env.AWS_REGION
  }
});

/** Retrieve session from DynamoDB
 *  by session key (ctx.from.id)
 */
module.exports.getSession = async key => {
  let session;
  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  try {
    session = await dynamoSession.getSession(key.toString());

    if (session.from)
      console.log("dynamoDB:: getSession for userId: ", session.from.id);

    if (isEmpty(session)) session = false;
  } catch (err) {
    console.log(err);
    session = false;
  }

  return session;
};

module.exports.saveSession = async (key, session) => {
  // Save session state
  if (session.from)
    console.log("dynamoDB:: saveSession for userId:", session.from.id);
  await dynamoSession.saveSession(key.toString(), session);
};
