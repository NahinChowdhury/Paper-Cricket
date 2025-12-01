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
Morning:
Created powerUpCircles component.
Mirror Field works for fielderview, but Third man and Field Shift power ups still need local usestates (or reuse setgameState where possible) to keep track of newWicketIndex and modified presets.
We also need to create the draggable shuffle board for Third Man and Field Shift power ups.
Need to revisit the handling of modifications in the backend and sync it with what's being sent from the frontend.

Dinner:
Draggable shuffle list works but it's not connected to the power ups yet. That is the next step
UI is garbage for mobile.
Finish all power ups interaction.


## 4th November, 2025
Third Man power up somewhat works? Need to ensure the changes make sense throughout.
Need to look into Field Shift next. I think Mirror Field just works from the get go.
Need to clean up the code afterwards

## 22nd November, 2025
Fielder power ups work as expected.
The shifting of pies in the list works smoothly now
Hovering on power ups now shows description
Fixed a small bug that made the first pie in the list to start at 90 degrees.
Added an active games list so that anyone can join any game.

TODO:
 - Next we need to implement batter power ups. 
 - Also need to show the power ups in the Audience view
 - Need to also ensure power up usage during fielding is only shows to fielder. power up usage during batting is shown to all
 - Then we clean up the code and reuse any common components.
 - Improve front page to give context of game 


## 24th November, 2025
Done:
- Batter power ups working
- Show presets in batter view

TODO:
- Show power up circles and usage in audience view
- Show opponent's power ups and usage in batter and fielder view
- Disable power up usage if player is not actively making the move
- Do remaining above TODOs from 22nd November, 2025

## 25th November, 2025
- Made draggable list work with mobile touch
- Showed power up circles in audience view
- Showed opponent's power ups
- Showed preset in audience view
- Disabled power up usage if player is not actively making the move
- Clicking on a tile while scout report is on does not select the tile for a shot

TODO:
- Work on hiding what power up is being used by the fielder to batter and audience. Batter power up usage should be shown to all instantly
- Add disconnect button to Audience view. Which just send them to the home page and removes them from the audience list
- Improve the UI to that it's properly scaled on phone horizontal view. Use grid layout
- Clean up the code to use common components. It's best to have unique views for batter, fielder and audience view. But they should extensively use common components and have custom styles.
- Add a copy link to game button somewhere in the game UI
- Add names for players instead of just UUIDs
- Do remaining above TODOs from 22nd November, 2025

## 28th November, 2025
The grid kind of works, but it's chunking the presets in smaller views. work on them and fix the UI. The goal is to have the same non-scrolling UI in desktop and phone

## 30th November, 2025
UI is somewhat usable in landscapre mode on phone