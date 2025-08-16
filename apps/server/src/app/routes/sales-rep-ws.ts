import { FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
import {
  addSalesRepConnection,
  removeSalesRepConnection,
  assignCallToSalesRep,
  releaseCallFromSalesRep,
  getCallQueueSummary,
  broadcastQueueUpdate,
  getCallQueueEntry,
  requestCollaboration,
  getShopperSocket
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
              const assignment = assignCallToSalesRep(data.shopperId, currentSalesRepId, data.sdpOffer);
              
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

          case 'ice_candidate': {
            if (data.shopperId && data.iceCandidate && currentSalesRepId) {
              // Find the shopper's entry to ensure this sales rep is assigned to the call
              const shopperEntry = getCallQueueEntry(data.shopperId);
              
              if (shopperEntry?.assignedSalesRepId === currentSalesRepId) {
                // Forward the ICE candidate to the shopper
                if (shopperEntry.shopperSocket && shopperEntry.shopperSocket.readyState === 1) { // WebSocket.OPEN
                  try {
                    shopperEntry.shopperSocket.send(JSON.stringify({
                      type: 'ice_candidate',
                      salesRepId: currentSalesRepId,
                      shopperId: data.shopperId,
                      iceCandidate: data.iceCandidate
                    }));
                    
                    fastify.log.info(`Forwarded ICE candidate from sales rep ${currentSalesRepId} to shopper ${data.shopperId}`);
                  } catch (error) {
                    fastify.log.error(error, `Failed to forward ICE candidate to shopper ${data.shopperId}:`);
                  }
                } else {
                  fastify.log.warn(`Shopper ${data.shopperId} not connected or socket not ready`);
                }
              } else {
                fastify.log.warn(`Sales rep ${currentSalesRepId} not assigned to shopper ${data.shopperId} for ICE candidate exchange`);
                socket.send(JSON.stringify({
                  type: 'error',
                  message: `Not assigned to shopper ${data.shopperId}`
                }));
              }
            }
            break;
          }

          case 'request_collaboration': {
            if (data.shopperId && currentSalesRepId) {
              // Request collaboration session
              const collaborationSession = requestCollaboration(data.shopperId, currentSalesRepId);
              
              if (collaborationSession) {
                // Get shopper's socket to send the request
                const shopperSocket = getShopperSocket(data.shopperId);
                
                if (shopperSocket && shopperSocket.readyState === 1) { // WebSocket.OPEN
                  try {
                    // Send collaboration request to shopper
                    shopperSocket.send(JSON.stringify({
                      type: 'collaboration_request',
                      shopperId: data.shopperId,
                      salesRepId: currentSalesRepId,
                      salesRepName: `Sales Rep ${currentSalesRepId.slice(-8)}` // Simplified name
                    }));
                    
                    // Send confirmation to sales rep
                    socket.send(JSON.stringify({
                      type: 'collaboration_status',
                      shopperId: data.shopperId,
                      salesRepId: currentSalesRepId,
                      status: 'pending'
                    }));
                    
                    fastify.log.info(`Sales rep ${currentSalesRepId} requested collaboration with shopper ${data.shopperId}`);
                  } catch (error) {
                    fastify.log.error(error, `Failed to send collaboration request to shopper ${data.shopperId}:`);
                    socket.send(JSON.stringify({
                      type: 'error',
                      message: 'Failed to send collaboration request'
                    }));
                  }
                } else {
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Shopper is not connected'
                  }));
                }
              } else {
                socket.send(JSON.stringify({
                  type: 'error',
                  message: 'Cannot request collaboration - call not found or request already pending'
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
