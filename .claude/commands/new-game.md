# /new-game $ARGUMENTS

Create a new game called `$ARGUMENTS` (use lowercase-hyphenated if they give spaces).

## Steps

1. Create `my-games/$ARGUMENTS/` by copying from `_templates/game-template/`:
   - `index.html`
   - `game.js`
   - `lib/phaser.min.js`
2. Create `my-games/$ARGUMENTS/sprites/` directory
3. Update the `<title>` in index.html to match the game name (use the human-readable version with spaces and capitals)
4. Git add and commit: "New game: $ARGUMENTS"
5. Tell Amber the game is ready and suggest running `/play $ARGUMENTS`

## Rules

- If no name is given, ask for one. Something like: "What do you want to call your game?"
- Keep the name short and kebab-case (e.g., `space-cats` not `Space Cats`)
- Use teenager-friendly language — be excited, not formal
- Don't explain what Phaser is or how HTML works. Just make the game and let her get building.
