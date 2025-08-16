import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Create a Y.js document
const ydoc = new Y.Doc();

// Connect to the WebSocket server
const wsProvider = new WebsocketProvider('ws://localhost:1234', 'my-room', ydoc);

// Access the awareness instance from the provider
const awareness = wsProvider.awareness;

// A simple way to generate a random color for this client
const clientColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

const cursorArea = document.getElementById('cursor-area');

// 1. **Emit local cursor movements via awareness**
if (cursorArea) {
    cursorArea.addEventListener('mousemove', (event) => {
        const position = { x: event.clientX, y: event.clientY, color: clientColor };
        // Update the local awareness state with our cursor position
        awareness.setLocalStateField('cursor', position);
    });
}

// 2. **Render remote cursors**
awareness.on('change', () => {
    // Get all connected clients' awareness state, including our own
    const states = awareness.getStates();

    // Clear all existing remote cursors to prevent stale cursors from staying
    document.querySelectorAll('.remote-cursor').forEach(el => el.remove());

    // Iterate over all client states and render their cursors
    states.forEach((state, clientId) => {
        // Ignore our own client ID as we don't want to render our own cursor
        if (clientId === ydoc.clientID) return;

        // Check if the client has a cursor state set
        if (state.cursor) {
            const cursorDot = document.createElement('div');
            cursorDot.id = `cursor-${clientId}`;
            cursorDot.className = 'remote-cursor';
            if (cursorArea) cursorArea.appendChild(cursorDot);

            cursorDot.style.left = `${state.cursor.x}px`;
            cursorDot.style.top = `${state.cursor.y}px`;
            cursorDot.style.backgroundColor = state.cursor.color;
        }
    });
});

// Clean up the awareness state when the user leaves or disconnects
window.addEventListener('beforeunload', () => {
    awareness.destroy();
});

console.log("Awareness protocol setup complete. Open in multiple tabs!");
