# Backend Server for Multiplayer Spinning Pie Game

This is the basic backend foundation for the turn-based multiplayer spinning pie game.

## Project Structure

```
backend/
├── src/
│   ├── server.ts        # Main server file
│   ├── roomManager.ts   # Room management
│   ├── gameState.ts     # Game state management
│   └── types/
│       └── index.ts     # TypeScript definitions
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

   The server will start on port 3001 and automatically restart when you make changes.

3. **Alternative: Build and run**
   ```bash
   npm run build
   npm start
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the compiled server
- `npm run prod` - Build and start production server

## API Endpoints

- `GET /health` - Health check endpoint

## Socket.IO Events

The server handles these basic events:
- `create_room` - Create a new game room
- `join_room` - Join an existing room by ID
- `rotate_pie` - Handle pie rotation (basic implementation)
- `end_turn` - Handle turn ending (placeholder)
- `disconnect` - Handle player disconnection

## Development Notes

This is a **basic foundation** that provides:
- ✅ Socket.IO server setup
- ✅ Room creation and management
- ✅ Basic player connection handling
- ✅ TypeScript configuration
- ✅ Development tooling

The **game logic implementation** (turn validation, game state management, etc.) is not yet implemented - this gives you a working server to start with.

## Next Steps

Once you have the server running, you can:
1. Connect to it from your frontend at `ws://localhost:3001`
2. Test room creation and joining
3. Implement the turn-based game logic in `gameState.ts`
4. Add proper turn validation and game state management