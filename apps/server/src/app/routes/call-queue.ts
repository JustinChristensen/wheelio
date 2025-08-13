import { FastifyPluginAsync } from 'fastify';
import {
  cleanupOldDisconnectedCalls,
  removeShopperFromQueue,
  broadcastQueueUpdate
} from '../services/call-queue';

const callQueueRoutes: FastifyPluginAsync = async function (fastify) {
  // Manually clean up old disconnected calls
  fastify.delete('/call-queue/cleanup', async (request) => {
    const { maxAgeMinutes } = request.query as { maxAgeMinutes?: string };
    const maxAge = maxAgeMinutes ? parseInt(maxAgeMinutes, 10) : 30;
    
    const cleanedCount = cleanupOldDisconnectedCalls(maxAge);
    
    // Broadcast updated queue to sales reps
    broadcastQueueUpdate();
    
    return {
      message: `Cleaned up ${cleanedCount} old disconnected calls`,
      cleanedCount,
      maxAgeMinutes: maxAge
    };
  });

  // Manually remove a specific shopper from the queue
  fastify.delete('/call-queue/remove/:shopperId', async (request) => {
    const { shopperId } = request.params as { shopperId: string };
    
    const removed = removeShopperFromQueue(shopperId);
    
    if (removed) {
      // Broadcast updated queue to sales reps
      broadcastQueueUpdate();
      
      return {
        message: `Shopper ${shopperId} removed from queue`,
        shopperId
      };
    } else {
      return {
        message: `Shopper ${shopperId} not found in queue`,
        shopperId
      };
    }
  });
};

export default callQueueRoutes;
