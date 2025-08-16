import { FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
import {
  addShopperToQueue,
  markShopperDisconnected,
  removeShopperFromQueue,
  broadcastQueueUpdate,
  getShopperQueuePosition,
  getCallQueueEntry,
  getSalesRepSocket
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

          case 'sdp_answer': {
            console.log('DATA', data);
            if (data.shopperId && data.sdpAnswer) {
              // Find the shopper's entry to get the assigned sales rep
              const shopperEntry = getCallQueueEntry(data.shopperId);
              
              if (shopperEntry?.assignedSalesRepId) {
                // Forward the SDP answer to the assigned sales rep
                const salesRepSocket = getSalesRepSocket(shopperEntry.assignedSalesRepId);
                
                if (salesRepSocket && salesRepSocket.readyState === 1) { // WebSocket.OPEN
                  try {
                    salesRepSocket.send(JSON.stringify({
                      type: 'sdp_answer',
                      salesRepId: shopperEntry.assignedSalesRepId,
                      shopperId: data.shopperId,
                      sdpAnswer: data.sdpAnswer
                    }));
                    
                    fastify.log.info(`Forwarded SDP answer from shopper ${data.shopperId} to sales rep ${shopperEntry.assignedSalesRepId}`);
                  } catch (error) {
                    fastify.log.error(error, `Failed to forward SDP answer to sales rep ${shopperEntry.assignedSalesRepId}:`);
                    
                    // Send error back to shopper
                    socket.send(JSON.stringify({
                      type: 'error',
                      message: 'Failed to establish connection with sales representative'
                    }));
                  }
                } else {
                  fastify.log.warn(`Sales rep ${shopperEntry.assignedSalesRepId} not connected or socket not ready`);
                  
                  // Send error back to shopper
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Sales representative is not available'
                  }));
                }
              } else {
                fastify.log.warn(`No assigned sales rep found for shopper ${data.shopperId}`);
                
                // Send error back to shopper
                socket.send(JSON.stringify({
                  type: 'error',
                  message: 'No sales representative assigned to your call'
                }));
              }
            }
            break;
          }

          case 'ice_candidate': {
            if (data.shopperId && data.iceCandidate) {
              // Find the shopper's entry to get the assigned sales rep
              const shopperEntry = getCallQueueEntry(data.shopperId);
              
              if (shopperEntry?.assignedSalesRepId) {
                // Forward the ICE candidate to the assigned sales rep
                const salesRepSocket = getSalesRepSocket(shopperEntry.assignedSalesRepId);
                
                if (salesRepSocket && salesRepSocket.readyState === 1) { // WebSocket.OPEN
                  try {
                    salesRepSocket.send(JSON.stringify({
                      type: 'ice_candidate',
                      salesRepId: shopperEntry.assignedSalesRepId,
                      shopperId: data.shopperId,
                      iceCandidate: data.iceCandidate
                    }));
                    
                    fastify.log.info(`Forwarded ICE candidate from shopper ${data.shopperId} to sales rep ${shopperEntry.assignedSalesRepId}`);
                  } catch (error) {
                    fastify.log.error(error, `Failed to forward ICE candidate to sales rep ${shopperEntry.assignedSalesRepId}:`);
                    
                    // Send error back to shopper
                    socket.send(JSON.stringify({
                      type: 'error',
                      message: 'Failed to relay connection data to sales representative'
                    }));
                  }
                } else {
                  fastify.log.warn(`Sales rep ${shopperEntry.assignedSalesRepId} not connected or socket not ready`);
                  
                  // Send error back to shopper
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Sales representative is not available for connection'
                  }));
                }
              } else {
                fastify.log.warn(`No assigned sales rep found for shopper ${data.shopperId} ICE candidate`);
                
                // Send error back to shopper
                socket.send(JSON.stringify({
                  type: 'error',
                  message: 'No sales representative assigned for connection setup'
                }));
              }
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
