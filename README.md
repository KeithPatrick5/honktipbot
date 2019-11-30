# Honk Tip Bot

## About

This is a telegram bot that allow you tip other users in telegram with a [HONK](https://honkhonk.io) Token. 
Add [@Honktipbot](https://t.me/honktipbot) to your group.
Then make your tip to other user by replying on their messages with "[NUMBER] honk" (e.g. "10 honk").

Users can deposit and withdraw their tokens.
You could also setup notification for new deposits with separate service [checkDeposits](https://github.com/KeithPatrick5/checkDeposits).

This bot powered with Telegraf library.

### Supported commands:

- **/start**
- **/help**
- **/balance**
- **/deposit**
- **/withdraw**

## Installation and local launch

1. Clone this repo:
    ```bash
    git clone https://github.com/KeithPatrick5/honktipbot
    ```

2. Create AWS DynamoDB tables: 
- Bot-Session (primary key: *SessionKey* [string])
- Bot-checkDeposit (primary key: *address* [string])

3. [AWS configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)

4. Create `.env` file with the environment variables listed in `.env.example`

5. Install `NodeJS 10x` && `npm 6x`

6. Run in the root folder 
    ```bash
    npm install
    ```
8. Run a local instance of RabbitMQ
    ```bash
    sudo docker run -p 5672:5672 -d --hostname my-rabbit --name some-rabbit rabbitmq:3
    ```
7. Run
    ```bash
    npm start
    ```


Creator: [pytour](https://github.com/pytour)
