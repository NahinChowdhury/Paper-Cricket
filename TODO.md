Next step is to capture the clicked value and store it in the turn history for game state.
Look into masking the screen of opponent and see if the correct value is pressed after clicking the masked wheel

Then turn the logic into having 5 turns for one player and the other player choose a value.
After 5 turns, we swap current player. Current player can represent who is bowling

Then same logic as before. new current player bowls for 5 turns and we keep log of history.

We can then look to keep log of total score, wickets and what not


5th October, 2025
Implement wicket logic, over display and showing per ball scores as they are displayed
Mask the batter's POV. For now, simply have an overlay, but think about how to actually hide the values beneath so that people don't get the root values from inspect element.
Handle errors by ending a message to the frontend. A simple handler like "error" should be enough for the frontend. Frontend will perform task based on error details

Visions:
- Bowler should be able to see the batsman's mouse activity live. When the batsman clicks on the canvas, it should pop out the pie a little bit.
- Audience view where players can view the game.
  - Audience can see the wheel rotate live when the bowler is setting the field
  - Audience can see the batsman's live mouse movement while batting.
