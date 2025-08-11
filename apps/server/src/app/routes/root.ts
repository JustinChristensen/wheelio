import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async function () {
    return { 
      message: 'Wheelio API Server',
      version: '1.0.0',
      endpoints: {
        cars: '/cars',
        health: '/health'
      }
    };
  });

  fastify.get('/health', async function () {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
