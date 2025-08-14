# Wheelio - AI-Powered Car Dealership Platform

## What We've Done So Far

1. **Sample Car Data & Types** - Created comprehensive mock data in `libs/car-data`:
   - 50 realistic cars across multiple dealerships with complete specifications
   - TypeScript interfaces for Car, Dealership, and CarFilters types
   - Diverse inventory spanning sedans, SUVs, trucks, hatchbacks, coupes from major brands

2. **Core Shopper UI** - Built fully functional three-column layout in `apps/shopper`:
   - Fixed header with responsive design and proper viewport management
   - FilterSidebar with comprehensive faceted search controls
   - CarGrid with perfect/partial/non-match ranking system and visual match indicators
   - Collapsible AI chat drawer with seamless filter synchronization

3. **AI Sales Agent Integration** - Implemented LangGraph-powered chat system:
   - Backend `/chat` endpoint using OpenAI GPT-3.5-turbo with LangGraph createReactAgent
   - Conversation persistence with unique IDs and environment configuration
   - Dual-mode operation: free-form conversation and structured guided mode
   - Smart client-side response overrides for zero/single match scenarios
   - Real-time filter updates from natural language requests

4. **Routing & Multi-Role Architecture** - Set up React Router for dual-purpose application:
   - **Root route `/`** - Customer-facing car shopping experience with filtering, AI chat, and car grid
   - **Sales route `/sales`** - Sales representative dashboard with real-time call queue monitoring
   - Shared header component across all routes for consistent navigation
   - Role-based UI components supporting both customer and sales rep workflows

5. **Sales Rep Dashboard** - Built comprehensive call queue management system:
   - Real-time WebSocket connection to monitor incoming customer calls
   - Live call queue grid with clickable tiles showing wait times, connection status, and assignments
   - Connection status indicator with automatic reconnection logic
   - Client-side age calculation with 10-second update intervals for smooth timer updates
   - Comprehensive call state tracking (connected, assigned, offline) with visual indicators

## Project Overview

Wheelio is a multi-dealership car shopping platform with AI-powered search and real-time sales collaboration being built from the ground up. This document describes the target architecture and implementation goals to guide AI agents in developing the system.

This is a demonstration system designed to showcase UI patterns and real-time collaboration workflows. Car data will be generated and mocked, and collaboration state will be managed in-memory on the server without persistence - the focus is on demonstrating the user experience flow.

Development will proceed incrementally with step-by-step guidance rather than generating the complete application at once. AI agents should expect to implement specific features and components as directed.

When instructed to use specific npm packages assume that I've already installed them.

Do not worry about generating or running unit tests.

The system consists of two main applications in an NX monorepo:

- **`apps/shopper`** - React web app supporting both customers and sales reps with role-based access control
- **`apps/server`** - Fastify backend handling WebRTC, WebSockets, and Y.js collaboration

**Note**: All shared libraries are organized in the `libs/` directory (e.g., `libs/car-data` for mock data and types).

## Architecture & Data Flow

### Core User Journeys

#### Customer Journey (Root Route `/`)
1. **Faceted Search**: Shoppers filter cars with sidebar controls, seeing match rankings (perfect/partial/non-match)
2. **AI Sales Agent**: Right-side drawer with voice/text input for guided car discovery
3. **Filter Sync**: AI responses automatically update sidebar filters and re-rank cars
4. **Handoff**: When ready, shoppers request human sales agent via call queue

#### Sales Rep Journey (Sales Route `/sales`)
1. **Queue Monitoring**: Real-time dashboard showing all customer calls waiting for assistance
2. **Call Management**: Visual grid of customer tiles with wait times, connection status, and assignment tracking
3. **WebRTC Connection**: Sales agents can claim calls, establishing audio connection with customers
4. **Collaborative Session**: Y.js enables shared filter manipulation and synchronized views between customer and sales rep

### Routing Architecture
- **Shared Components**: Header component renders on all routes for consistent navigation
- **Route-Specific Content**: Main content area changes based on current route
  - `/` → `ShopperPage` component (customer car shopping interface)
  - `/sales` → `SalesRepPage` component (sales rep call queue dashboard)
- **Navigation**: Users can switch between customer and sales rep views via URL navigation

### Key Integration Points
- **AI ↔ Filters**: AI chat updates must trigger `apps/shopper/src/components/FilterSidebar` state changes
- **WebRTC Flow**: `apps/server` orchestrates offer/answer between customer and sales rep sessions
- **Y.js Collaboration**: Real-time state sync for filter criteria and car rankings
- **Call Queue**: WebSocket updates from server to sales rep interface via `/ws/calls/monitor` endpoint
- **Real-time Updates**: Client-side age calculation ensures timers update smoothly without server dependency

## Development Patterns

### NX Workspace Commands
```bash
# Run applications
npx nx serve shopper    # Development server for main app (customers & sales reps)
npx nx serve server     # Backend API server

# Build and test
npx nx build shopper server  # Production builds
npx nx test shopper     # Component tests
npx nx lint             # ESLint across workspace
```

### State Management Strategy
- **Shopper App**: Role-based state management supporting both customers and sales reps
- **Real-time Updates**: WebSocket connections for call queue and collaboration
- **Y.js Document**: Synchronized filter state, chat state, and cursor and awareness between shoppers and sales agents

### Component Architecture
```
apps/shopper/src/
├── app/
│   └── app.tsx                # Main routing container with React Router
├── components/
│   ├── ShopperPage/           # Customer car shopping interface (route: /)
│   ├── SalesRepPage/          # Sales rep call queue dashboard (route: /sales)
│   ├── Header/                # Shared navigation header across all routes
│   ├── FilterSidebar/         # Car search filters with ranking logic
│   ├── CarGrid/               # Ranked car display with match indicators
│   ├── AISalesAgent/          # Chat interface with voice/text input
│   ├── CallQueueGrid/         # Real-time call queue visualization
│   ├── ConnectionStatus/      # WebSocket connection status indicator
│   └── CollaborationProvider/ # Y.js integration wrapper
├── hooks/
│   ├── useSalesRepWebSocket.ts # WebSocket management for sales rep dashboard
│   └── useCarData.ts          # Car inventory data fetching
```

### Backend Integration
- **Fastify Server**: RESTful APIs + WebSocket + WebRTC signaling in `apps/server`
- **API Proxy**: Frontend apps use Vite's proxy configuration to route API calls to the backend server, eliminating CORS issues
- **Call Queue Management**: Real-time updates via WebSocket to sales rep interface (role-based views)
- **WebRTC Orchestration**: Offer/answer exchange for audio connections
- **Y.js Backend**: In-memory collaborative document management via WebSockets (no persistence)
- **Mock Data**: Generated car inventory data for demonstration purposes

## Technology Stack
- **Frontend**: React 19, React Router, TailwindCSS
- **Backend**: Fastify 4.x with WebSocket support
- **Build**: NX 21.x, Vite 6.x, ESBuild
- **Testing**: Jest, Vitest, React Testing Library
- **Real-time**: WebSockets, WebRTC, Y.js collaboration

## Key Files & Conventions
- `apps/*/project.json` - NX project configuration and build targets
- `apps/shopper/src/app/app.tsx` - Main routing and layout
- `apps/server/src/app/app.ts` - Fastify application setup
- Shared TypeScript config via `tsconfig.base.json`
- ESLint config inheritance from workspace root

## Critical Implementation Notes
- **Filter State Sync**: AI chat responses must immediately reflect in sidebar filters
- **Match Ranking Logic**: Cars display perfect/partial/non-match with explanations
- **WebRTC Signaling**: Server coordinates audio connections between customer and sales rep sessions
- **Y.js Integration**: Enables real-time collaborative filter manipulation
- **Call Queue UX**: Sales reps see live updates and can claim shopper sessions (role-based UI)
