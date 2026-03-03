# /make-sprite $ARGUMENTS

Generate a game sprite using AI and add it to the current game.

## Steps

1. Figure out the current game (most recently modified folder in `my-games/`)
   - If there are no games yet, tell Amber to create one first with `/new-game`
2. Load the WaveSpeed MCP tool: use ToolSearch to find `mcp__wavespeed__text_to_image`
3. Enhance the prompt for clean sprite output:
   - Base: `$ARGUMENTS`
   - Enhanced: "2D game sprite, $ARGUMENTS, isolated on solid white background, clean edges, no shadow, pixel art style"
4. Generate the image using the WaveSpeed tool:
   - model: `google/nano-banana-2/text-to-image`
   - prompt: the enhanced prompt from step 3
   - size: `1024*1024`
5. Save the generated image to `my-games/[current-game]/sprites/` with a descriptive kebab-case filename (e.g., `golden-coin.png`, `angry-robot.png`)
6. Try to import to Eagle (if running on localhost:41595):
   - POST to `http://localhost:41595/api/item/addFromPath` with the full file path
   - POST to `http://localhost:41595/api/item/update` to add tags `["ambermakes", "generated", game-name]` and annotation with the original prompt
   - If Eagle isn't running or the request fails, skip this step silently — don't mention Eagle at all
7. Git add and commit: "Add sprite: [description]"
8. Tell Amber the sprite is ready and suggest how to use it in the game

## Rules

- If no description is given, ask what kind of sprite they want: "What do you want me to draw? A character, an enemy, a coin, a background...?"
- Use teenager-friendly language — "Your sprite is ready!" not "The image has been generated and saved"
- After saving, always suggest how to use it: "Your golden coin is in `sprites/golden-coin.png` — want me to add it to the game?"
- IMPORTANT: The WaveSpeed tool uses `size` parameter (e.g., `"1024*1024"`), NOT `aspect_ratio` or `resolution`
- IMPORTANT: Always use the `google/nano-banana-2/text-to-image` model ID
- All paths are relative to the AmberMakes root directory
