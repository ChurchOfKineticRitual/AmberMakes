# /ship $ARGUMENTS

Deploy a game to a live URL that Amber can share with friends.

## Steps

1. Figure out which game to ship:
   - If `$ARGUMENTS` is provided, use that as the game name
   - If not, check if there's only one game in `my-games/` — use that
   - If multiple games and no name given, list them and ask which one
2. Check the game folder exists at `my-games/$GAME_NAME/`
3. Deploy using Netlify CLI:
   ```
   netlify deploy --prod --dir=my-games/$GAME_NAME --site=$GAME_NAME-ambermakes
   ```
   If the site doesn't exist yet, create it first:
   ```
   netlify sites:create --name=$GAME_NAME-ambermakes
   ```
4. Git add and commit: "Shipped $GAME_NAME"
5. Share the live URL with Amber — this is the exciting part! She can send this link to anyone and they can play her game.

## If things go wrong

- If `netlify` command isn't found, tell her: "Netlify isn't installed yet — ask Jordan to set it up."
- If netlify isn't authenticated, tell her: "Netlify needs to log in first — ask Jordan to run `netlify login`."
- If the deploy fails for other reasons, show the error but keep it simple: "Something went wrong with the deploy. Here's what it said: [error]. Ask Jordan if you're stuck."

## Rules

- This is the big moment! Be hyped. "YOUR GAME IS LIVE" energy.
- Share the URL prominently so she can copy it easily
- Use teenager-friendly language throughout
- Don't explain what deployment or Netlify means. Just "putting your game online so anyone with the link can play it"
- All paths are relative to the AmberMakes root directory
