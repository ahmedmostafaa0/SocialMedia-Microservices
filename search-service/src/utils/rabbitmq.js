const amqp = require("amqplib");
const logger = require('./logger')

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URI);
    channel = await connection.createChannel();

    channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ successfully!");
  } catch (error) {
    logger.error(`Failed connected to RabbitMQ: ${error}`)
    throw error
  }
}

async function consumeEvent(routingKey, cb){
    if(!channel){
        await connectToRabbitMQ()
    }
    const q = await channel.assertQueue('', {exclusive: true})
    await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey)

    channel.consume(q.queue, (msg) => {
        if(msg){
            const content = JSON.parse(msg.content.toString())
            cb(content)
            channel.ack(msg)
        }
    })
    logger.info(`Subscribed to event: ${routingKey}`)
}

module.exports = {connectToRabbitMQ, consumeEvent}