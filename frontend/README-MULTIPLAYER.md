# Multiplayer Frontend Setup

This frontend has been updated to support turn-based multiplayer gameplay.

## New Features Added

### ✅ Dependencies Installed
- `socket.io-client` - Real-time communication
- `react-router-dom` - URL-based room navigation
- `uuid` - Unique player identification

### ✅ New Components Created
- `src/hooks/useRoom.ts` - Room management hook
- `src/contexts/SocketContext.tsx` - Socket.IO connection management
- `src/RoomLobby.tsx` - Room creation and joining interface

### ✅ Enhanced SpinPie Component
- **Turn-based gameplay** - 3 turns each (6 total)
- **Real-time synchronization** - See opponent's moves instantly
- **Turn indicators** - Clear UI showing whose turn it is
- **End turn button** - Pass turn to opponent
- **Game state management** - Track turn progression and game end

## How to Run

### 1. Start Backend Server
```bash
cd backend
npm run dev
```
→ Runs on http://localhost:3001

### 2. Start Frontend (in another terminal)
```bash
cd frontend
npm start
```
→ Runs on http://localhost:3000

### 3. Test Multiplayer

#### Option A: Two Browser Tabs
1. Open http://localhost:3000 in Tab 1
2. Click "Create New Game"
3. Copy the URL (it will be something like http://localhost:3000/game/abc123)
4. Open the URL in Tab 2

#### Option B: Two Different Browsers
1. Create room in Browser A
2. Open the room URL in Browser B

## Game Flow

1. **Room Creation** - Player 1 creates room, gets shareable URL
2. **Game Start** - Player 2 joins, game begins automatically
3. **Turn 1** - Room creator (Player 1) goes first
4. **Rotation** - Player rotates pie chart
5. **Synchronization** - Opponent sees rotation in real-time
6. **End Turn** - Player clicks "End Turn" button
7. **Turn Switch** - Control passes to opponent
8. **Continue** - Repeat for 3 turns each (6 total)
9. **Game End** - Final screen shows game completion

## UI Features

### Turn Indicator
- **Blue**: "Your Turn (Turn X/6)"
- **Orange**: "Opponent's Turn (Turn X/6)"
- **Green**: "Game Finished!"

### Canvas States
- **Interactive** (during your turn): Can drag and rotate
- **Disabled** (opponent's turn): Gray overlay with "Waiting for opponent..."
- **Finished**: Complete overlay with game end message

### Controls
- **End Turn Button** - Only visible during your turn
- **Manual Rotation** - Input field for precise rotation (for testing)
- **Real-time Updates** - Opponent's moves appear instantly

## Development Notes

- Socket.IO connects to `http://localhost:3001`
- Room URLs follow pattern: `/game/{roomId}`
- Turn validation is enforced by the backend server
- Game state is synchronized between players automatically

## Next Steps

The frontend foundation is complete! You can now:
1. Test the multiplayer functionality
2. Implement the game logic in the backend
3. Add scoring and win conditions
4. Polish the UI/UX

The architecture supports the complete turn-based flow described in the documentation.