
import { FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { setupWsConnection } = require('@y/websocket-server/utils')

const collaborationWebSocket: FastifyPluginAsync = async function (fastify) {
  fastify.get('/ws/calls/collaboration', { websocket: true }, async (socket: WebSocket) => {
    setupWsConnection(socket);
  });
};

export default collaborationWebSocket
