
import { FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { setupWSConnection } = require('@y/websocket-server/utils')

const collaborationWebSocket: FastifyPluginAsync = async function (fastify) {
  fastify.get('/ws/calls/collaboration/:shopperId', { websocket: true }, async (socket: WebSocket, req) => {
    const { shopperId } = req.params as { shopperId: string };
    // Pass the shopperId as the document name to Y.js
    setupWSConnection(socket, req, { docName: shopperId });
  });
};

export default collaborationWebSocket
