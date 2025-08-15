import { FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
import {
  addShopperToQueue,
  markShopperDisconnected,
  removeShopperFromQueue,
  broadcastQueueUpdate,
  getShopperQueuePosition
} from '../services/call-queue';
import { ShopperMessage } from '../types/call-queue';

const shopperWebSocket: FastifyPluginAsync = async function (fastify) {
  fastify.get('/ws/call', { websocket: true }, async (socket: WebSocket) => {
    let currentShopperId: string | null = null;

    socket.on('message', async (message: Buffer) => {
      try {
        const data: ShopperMessage = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'join_queue': {
            currentShopperId = data.shopperId;
            
            // Determine if microphone is available based on media capabilities
            const hasMicrophone = data.mediaCapabilities?.hasAudioInput === true;
            
            // Add shopper to queue with media capabilities
            addShopperToQueue(data.shopperId, socket, {
              hasMicrophone,
              mediaCapabilities: data.mediaCapabilities || {
                hasAudioInput: false,
                audioInputDevices: 0,
                detectionError: 'No capabilities provided',
                detectedAt: new Date()
              }
            });
            
            // Calculate position in queue
            const position = getShopperQueuePosition(data.shopperId);
            
            // Send confirmation to shopper
            socket.send(JSON.stringify({
              type: 'queue_joined',
              shopperId: data.shopperId,
              position,
              hasMicrophone
            }));
            
            // Broadcast update to sales reps
            broadcastQueueUpdate();
            
            fastify.log.info(`Shopper ${data.shopperId} joined queue at position ${position} (microphone: ${hasMicrophone ? 'yes' : 'no'})`);
            break;
          }
            
          case 'leave_queue': {
            if (data.shopperId) {
              removeShopperFromQueue(data.shopperId);
              
              // Send confirmation to shopper
              socket.send(JSON.stringify({
                type: 'queue_left',
                shopperId: data.shopperId
              }));
              
              // Broadcast update to sales reps
              broadcastQueueUpdate();
              
              fastify.log.info(`Shopper ${data.shopperId} left the call queue`);
            }
            break;
          }

          default:
            fastify.log.warn(`Unknown message type from shopper: ${data.type}`);
        }
      } catch (error) {
        fastify.log.error(error, 'Error processing shopper message:');
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    socket.on('close', () => {
      if (currentShopperId) {
        // Mark shopper as disconnected but keep in queue
        markShopperDisconnected(currentShopperId);
        
        // Broadcast update to sales reps
        broadcastQueueUpdate();
        
        fastify.log.info(`Shopper ${currentShopperId} disconnected from call queue`);
      }
    });

    socket.on('error', (error) => {
      fastify.log.error(error, 'Shopper WebSocket error:');
      if (currentShopperId) {
        markShopperDisconnected(currentShopperId);
        broadcastQueueUpdate();
      }
    });

    // Send initial connection acknowledgment
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to shopper queue service'
    }));
  });
};

export default shopperWebSocket;
