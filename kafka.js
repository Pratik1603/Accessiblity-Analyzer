const { Kafka } = require('kafkajs');
const kafka = new Kafka({
  clientId: 'accessibility-analyzer',
  brokers: ['localhost:9092'] // Your Kafka broker address
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'analyzer-group' });

module.exports= {
  producer,
  consumer
};
