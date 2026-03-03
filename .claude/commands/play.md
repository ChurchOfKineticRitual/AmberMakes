# /play $ARGUMENTS

Open a game so Amber can play it.

## Steps

1. Figure out which game to open:
   - If `$ARGUMENTS` is provided, use that as the game name
   - If not, check if there's only one game in `my-games/` — use that
   - If multiple games exist and no name given, list them and ask which one
2. Check the game folder actually exists at `my-games/$GAME_NAME/`. If not, suggest using `/new-game` first.
3. Make sure the server is running:
   - Check if port 8080 is already in use: `lsof -i :8080`
   - If not running, start `python3 -m http.server 8080` in the background from the AmberMakes root directory
4. Open the game:
   - **In Desktop:** navigate the preview to `http://localhost:8080/my-games/$GAME_NAME/`
   - **In Terminal:** run `open http://localhost:8080/my-games/$GAME_NAME/`
5. Tell Amber the game is running

## Rules

- Use teenager-friendly language — "Your game is live!" not "The HTTP server is serving static files"
- Don't explain what a server is or how HTTP works
- If the game folder doesn't exist, be helpful not judgmental: "That game doesn't exist yet — want me to make it? Just say `/new-game [name]`"
- All paths are relative to the AmberMakes root directory
