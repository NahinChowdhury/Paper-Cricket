Next step is to capture the clicked value and store it in the turn history for game state.
Look into masking the screen of opponent and see if the correct value is pressed after clicking the masked wheel

Then turn the logic into having 5 turns for one player and the other player choose a value.
After 5 turns, we swap current player. Current player can represent who is bowling

Then same logic as before. new current player bowls for 5 turns and we keep log of history.

We can then look to keep log of total score, wickets and what not


5th October, 2025
Look at cricketGameLogic.md and update server.ts to handle all server receiving logic.
First update index.ts to match the new object types. Then update the object types in SocketContext.tsx