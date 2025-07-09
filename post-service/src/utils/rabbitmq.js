const amqp = require('amqplib');
const logger = require('./logger')

let connection = null
let channel = null

const EXCHANGE_NAME = 'facebook_events'

async function connectToRabbitMQ() {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URI)
        channel = await connection.createChannel()

        await channel.assertExchange(EXCHANGE_NAME, 'topic', {durable: false})
        logger.info('connected to rabbit mq.')
    } catch (error) {
        logger.error('Failed to connect to rabbit mq!', error)
    }
}

async function publishEvent(routingKey, message){
    if(!channel){
        await connectToRabbitMQ()
    }
    channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(message)))
    logger.info(`Event published: ${routingKey}`)
}

module.exports = {connectToRabbitMQ, publishEvent}