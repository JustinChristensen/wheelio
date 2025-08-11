# Wheelio - AI-Powered Car Dealership Platform

## What We've Done So Far

1. **Created Sample Car Data** - Generated comprehensive mock data in `libs/car-data` including:
   - 50 sample cars across multiple dealerships with realistic specifications
   - Car types include sedans, SUVs, trucks, hatchbacks, and coupes 
   - Brands: Tesla, BMW, Mercedes-Benz, Audi, Ford, Toyota, Honda, and more
   - Complete TypeScript interfaces for Car, Dealership, and CarFilters types

2. **Built Initial Shopper UI Structure** - Implemented the main layout in `apps/shopper` with:
   - Fixed global header with "Wheelio" branding
   - Three-column layout: FilterSidebar (left), CarGrid (center), AISalesAgent drawer (right)
   - Proper scrolling behavior for all sections within fixed viewport height
   - Car matching algorithm with perfect/partial/non-match ranking system
   - AI chat interface with collapsible drawer (starts open)
   - Filter synchronization between sidebar and AI chat components

## Project Overview

Wheelio is a multi-dealership car shopping platform with AI-powered search and real-time sales collaboration being built from the ground up. This document describes the target architecture and implementation goals to guide AI agents in developing the system.

This is a demonstration system designed to showcase UI patterns and real-time collaboration workflows. Car data will be generated and mocked, and collaboration state will be managed in-memory on the server without persistence - the focus is on demonstrating the user experience flow.

Development will proceed incrementally with step-by-step guidance rather than generating the complete application at once. AI agents should expect to implement specific features and components as directed.

When instructed to use specific npm packages assume that I've already installed them.

Do not worry about generating or running unit tests.

The system consists of three main applications in an NX monorepo:

- **`apps/shopper`** - React customer-facing app with faceted search and AI chat
- **`apps/sales`** - React sales dashboard with call queue and collaboration tools  
- **`apps/server`** - Fastify backend handling WebRTC, WebSockets, and Y.js collaboration

**Note**: All shared libraries are organized in the `libs/` directory (e.g., `libs/car-data` for mock data and types).

## Architecture & Data Flow

### Core User Journey
1. **Faceted Search**: Shoppers filter cars with sidebar controls, seeing match rankings (perfect/partial/non-match)
2. **AI Sales Agent**: Right-side drawer with voice/text input for guided car discovery
3. **Filter Sync**: AI responses automatically update sidebar filters and re-rank cars
4. **Handoff**: When ready, shoppers request human sales agent via call queue
5. **WebRTC Connection**: Sales agents answer calls, establishing audio connection
6. **Collaborative Session**: Y.js enables shared filter manipulation and synchronized views

### Key Integration Points
- **AI ↔ Filters**: AI chat updates must trigger `apps/shopper/src/components/FilterSidebar` state changes
- **WebRTC Flow**: `apps/server` orchestrates offer/answer between shopper and sales apps
- **Y.js Collaboration**: Real-time state sync for filter criteria and car rankings
- **Call Queue**: WebSocket updates from server to `apps/sales` dashboard

## Development Patterns

### NX Workspace Commands
```bash
# Run applications
npx nx serve shopper    # Development server for customer app
npx nx serve sales      # Development server for sales dashboard  
npx nx serve server     # Backend API server

# Build and test
npx nx build shopper sales server  # Production builds
npx nx test shopper     # Component tests
npx nx lint             # ESLint across workspace
```

### State Management Strategy
- **Shopper App**: Shared state between FilterSidebar and AI chat components
- **Real-time Updates**: WebSocket connections for call queue and collaboration
- **Y.js Document**: Synchronized filter state, chat state, and cursor and awareness between shopper and sales agents

### Component Architecture
```
apps/shopper/src/
├── components/
│   ├── FilterSidebar/          # Car search filters with ranking logic
│   ├── CarGrid/               # Ranked car display with match indicators
│   ├── AISalesAgent/          # Chat interface with voice/text input
│   └── CollaborationProvider/ # Y.js integration wrapper
```

### Backend Integration
- **Fastify Server**: RESTful APIs + WebSocket + WebRTC signaling in `apps/server`
- **Call Queue Management**: Real-time updates via WebSocket to sales dashboard
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
- **WebRTC Signaling**: Server coordinates audio connections between apps
- **Y.js Integration**: Enables real-time collaborative filter manipulation
- **Call Queue UX**: Sales agents see live updates and can claim shopper sessions
