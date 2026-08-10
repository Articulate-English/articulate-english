// Articulate Video Call - Cloudflare Worker Signaling Server
// Native WebSocket signaling for WebRTC (no Socket.IO dependency)
// Deploy with: npx wrangler deploy

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // WebSocket upgrade for signaling
    if (request.headers.get('upgrade') === 'websocket') {
      const webSocketPair = new WebSocketPair();
      const [clientWs, serverWs] = [webSocketPair[0], webSocketPair[1]];
      
      // Get room ID from path: /signal/{roomId}
      const pathParts = url.pathname.split('/');
      const roomId = pathParts.length > 2 ? pathParts[2] : 'default';
      
      serverWs.accept();
      
      // Store connection in room (using in-memory map)
      if (!SIGNAL_ROOMS.has(roomId)) {
        SIGNAL_ROOMS.set(roomId, new Map());
      }
      const room = SIGNAL_ROOMS.get(roomId);
      room.set(serverWs, { socket: serverWs });
      
      // Notify existing peers when someone joins
      if (room.size === 1) {
        // First peer - initiator, just acknowledges connection
        serverWs.send(JSON.stringify({ type: 'initiator-ready' }));
      } else {
        // Second peer joins - notify initiator to start offer, and new peer that session exists
        room.forEach((_, ws) => {
          if (ws !== serverWs && ws.readyState === WebSocket.OPEN) {
            // Existing peer (initiator) triggers offer on 'peer-joined'
            ws.send(JSON.stringify({ type: 'peer-joined' }));
          }
        });
        // New peer confirmed
        serverWs.send(JSON.stringify({ type: 'initiator-ready' }));
      }
      
      // Handle incoming signaling messages
      serverWs.addEventListener('message', event => {
        try {
          const msg = JSON.parse(event.data);
          // Wrap and broadcast to all other peers in room
          room.forEach((_, ws) => {
            if (ws !== serverWs && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'signal', data: msg }));
            }
          });
        } catch (e) {
          // Not JSON, ignore
        }
      });
      
      // Cleanup on disconnect
      serverWs.addEventListener('close', () => {
        room.delete(serverWs);
        // Notify remaining peer
        room.forEach((_, ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'peer-left' }));
          }
        });
      });
      
      return new Response(null, {
        status: 101,
        webSocket: clientWs
      });
    }
    
    return new Response('Articulate Signaling Server', { status: 200 });
  }
};

// In-memory room storage (persists within single Worker instance)
const SIGNAL_ROOMS = new Map();