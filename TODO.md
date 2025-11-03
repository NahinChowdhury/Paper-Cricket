Next step is to capture the clicked value and store it in the turn history for game state.
Look into masking the screen of opponent and see if the correct value is pressed after clicking the masked wheel

Then turn the logic into having 5 turns for one player and the other player choose a value.
After 5 turns, we swap current player. Current player can represent who is bowling

Then same logic as before. new current player bowls for 5 turns and we keep log of history.

We can then look to keep log of total score, wickets and what not


## 5th October, 2025
Implement wicket logic, over display and showing per ball scores as they are displayed
Mask the batter's POV. For now, simply have an overlay, but think about how to actually hide the values beneath so that people don't get the root values from inspect element.
Handle errors by ending a message to the frontend. A simple handler like "error" should be enough for the frontend. Frontend will perform task based on error details

Visions:
- Bowler should be able to see the batsman's mouse activity live. When the batsman clicks on the canvas, it should pop out the pie a little bit.
- Audience view where players can view the game.
  - Audience can see the wheel rotate live when the bowler is setting the field
  - Audience can see the batsman's live mouse movement while batting.


## 25th October, 2025
Global gamestate component distribution works in the frontend which is amazing!!!
Need to show a recap whena delivery finishes
Need to handle surrender better because now it crashes. Need to enable disconnect for audience.
Need to display score in the UI for everyone. Maybe it can be a sub component as it's consistent for all.
Need to display presets and selection of presets for fielder and everyone else's underlying wheel should be updated too.
Need to display power ups for all views.
Try to merge audience and batter views as much as possible
Need to write server side power up handling.
Need to handle end game view as well as what should happen if a game ends/surrendered but a user tries to join (should just show scoreboard to user. Do not even show them the player/audience option page)


## 29th October, 2025
Fielders can now see presets as well as select them while submitting their field setup.
Batsman and audience get the appropriate preset choice.
Batsman choice is now an index value, not the actual string value of the choice.
This allowed us to get rid of the overlay for the batter and audience view. Selecting a pie now takes the index into account. Not the value. It will be difficult for people to cheat now. Only way they can cheat is by getting the socket events log.

Next: 

Work on power up logic in backend
Display power ups and allow usage in frontend


## 1st November, 2025
Power ups backend logic has been written. Looks good.
Next we should implement the frontend. We should start off with displaying the power ups for everyone. They should not do anything.
Then we implement the UI for each. Starting off with the power ups that don't provide any powerupcontext. Then implement the frozen hands power up and then finally implement the draggable shuffle power ups.

## 3rd November, 2025
Created powerUpCircles component.
Mirror Field works for fielderview, but Third man and Field Shift power ups still need local usestates (or reuse setgameState where possible) to keep track of newWicketIndex and modified presets.
We also need to create the draggable shuffle board for Third Man and Field Shift power ups.
Need to revisit the handling of modifications in the backend and sync it with what's being sent from the frontend.