# /play $ARGUMENTS

Start the game server and open a game in the browser.

## Steps

1. Figure out which game to open:
   - If `$ARGUMENTS` is provided, use that as the game name
   - If not, check if there's only one game in `my-games/` — use that
   - If multiple games exist and no name given, list them and ask which one
2. Check the game folder actually exists at `my-games/$GAME_NAME/`. If not, suggest using `/new-game` first.
3. Check if port 8080 is already in use: `lsof -i :8080`
   - If yes, it's probably already running — skip starting the server
   - If no, start `python3 -m http.server 8080` in the background from the AmberMakes root directory
4. Open the game in the browser: `open http://localhost:8080/my-games/$GAME_NAME/`
5. Tell Amber the game is running

## Rules

- Use teenager-friendly language — "Your game is live!" not "The HTTP server is serving static files"
- Don't explain what a server is or how HTTP works
- If the game folder doesn't exist, be helpful not judgmental: "That game doesn't exist yet — want me to make it? Just say `/new-game [name]`"
- All paths are relative to the AmberMakes root directory
