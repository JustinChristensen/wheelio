import { FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
import {
  addSalesRepConnection,
  removeSalesRepConnection,
  assignCallToSalesRep,
  releaseCallFromSalesRep,
  getCallQueueSummary,
  broadcastQueueUpdate
} from '../services/call-queue';
import { SalesRepMessage } from '../types/call-queue';

const salesRepWebSocket: FastifyPluginAsync = async function (fastify) {
  fastify.get('/ws/calls/monitor', { websocket: true }, async (socket: WebSocket) => {
    let currentSalesRepId: string | null = null;

    socket.on('message', async (message: Buffer) => {
      try {
        const data: SalesRepMessage = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'connect': {
            currentSalesRepId = data.salesRepId;
            
            // Add sales rep to active connections
            addSalesRepConnection(data.salesRepId, socket);
            
            // Send current queue state to the newly connected sales rep
            const currentQueue = getCallQueueSummary();
            socket.send(JSON.stringify({
              type: 'queue_update',
              queue: currentQueue
            }));
            
            // Send connection confirmation
            socket.send(JSON.stringify({
              type: 'connected',
              salesRepId: data.salesRepId,
              message: 'Connected to sales rep queue service'
            }));
            
            fastify.log.info(`Sales rep ${data.salesRepId} connected to call queue`);
            break;
          }
            
          case 'claim_call': {
            if (data.shopperId && currentSalesRepId) {
              const assignment = assignCallToSalesRep(data.shopperId, currentSalesRepId);
              
              if (assignment) {
                // Send confirmation to sales rep
                socket.send(JSON.stringify({
                  type: 'call_claimed',
                  shopperId: data.shopperId,
                  salesRepId: currentSalesRepId
                }));
                
                // Broadcast updated queue to all sales reps
                broadcastQueueUpdate();
                
                fastify.log.info(`Sales rep ${currentSalesRepId} claimed call from shopper ${data.shopperId}`);
              } else {
                // Send error - call not found or already claimed
                socket.send(JSON.stringify({
                  type: 'error',
                  message: `Call from shopper ${data.shopperId} not found or already claimed`
                }));
              }
            }
            break;
          }
            
          case 'release_call': {
            if (data.shopperId && currentSalesRepId) {
              const release = releaseCallFromSalesRep(data.shopperId);
              
              if (release) {
                // Send confirmation to sales rep
                socket.send(JSON.stringify({
                  type: 'call_released',
                  shopperId: data.shopperId,
                  salesRepId: currentSalesRepId
                }));
                
                // Broadcast updated queue to all sales reps
                broadcastQueueUpdate();
                
                fastify.log.info(`Sales rep ${currentSalesRepId} released call from shopper ${data.shopperId}`);
              } else {
                // Send error - call not found
                socket.send(JSON.stringify({
                  type: 'error',
                  message: `Call from shopper ${data.shopperId} not found`
                }));
              }
            }
            break;
          }
            
          default:
            fastify.log.warn(`Unknown message type from sales rep: ${data.type}`);
        }
      } catch (error) {
        fastify.log.error(error, 'Error processing sales rep message:');
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    socket.on('close', () => {
      if (currentSalesRepId) {
        removeSalesRepConnection(currentSalesRepId);
        fastify.log.info(`Sales rep ${currentSalesRepId} disconnected from call queue`);
      }
    });

    socket.on('error', (error) => {
      fastify.log.error(error, 'Sales rep WebSocket error:');
      if (currentSalesRepId) {
        removeSalesRepConnection(currentSalesRepId);
      }
    });

    // Send initial connection acknowledgment
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to sales rep queue service'
    }));
  });
};

export default salesRepWebSocket;
