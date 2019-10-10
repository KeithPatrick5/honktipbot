const amqp = require("amqplib/callback_api");

// Consumer
/** Deposit notification to user
 *
 */
module.exports.notification = bot => {
  amqp.connect("amqp://localhost", function(error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function(error1, channel) {
      if (error1) {
        throw error1;
      }

      var queue = "depositNotification";

      channel.assertQueue(queue, {
        durable: false
      });

      console.log(" [*] Waiting for new deposits messages in queue %s", queue);

      channel.consume(
        queue,
        function(msg) {
          const notificationData = JSON.parse(msg.content);
          console.log(" [x] New Deposit Received %s", msg.content.toString());

          bot.telegram.sendMessage(
            notificationData[0].userId,
            `New deposit received: ${notificationData[0].amount} HONK`
          );
        },
        {
          noAck: true
        }
      );
    });
  });
};
