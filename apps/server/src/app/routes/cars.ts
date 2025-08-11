import { FastifyInstance } from 'fastify';
import { mockCars } from 'car-data';

export default async function (fastify: FastifyInstance) {
  fastify.get('/cars', async function () {
    // Add a small delay to simulate network latency for demo purposes
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { 
      success: true,
      data: mockCars,
      count: mockCars.length 
    };
  });
}
