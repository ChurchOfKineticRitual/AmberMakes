# AmberMakes

Amber's game-making environment. She describes games in natural language, Claude Code builds them in Phaser 3.90.0, she plays them in the browser. This README is for Jordan — Amber shouldn't need to read it. Claude Code's CLAUDE.md handles everything she sees.

## Quick Start

```bash
cd AmberMakes && claude
```

Then type something like: "make a game where I catch falling stars"

Claude Code takes it from there — creates the game files, sets up Phaser, opens the browser.

## Commands

| Command | What it does |
|---------|--------------|
| `/new-game` | Scaffold a new game from a description |
| `/undo` | Revert the last change |
| `/play` | Open the game in the browser |
| `/ship` | Deploy to Netlify (live URL) |
| `/make-sprite` | Generate a sprite via WaveSpeed (Nano Banana 2) |

## Template

Every game starts with coloured rectangles — no assets needed to get something playable. Each game has a `SETTINGS` block at the top of its main file for easy tweaking (player speed, gravity, colours, spawn rates). This means Amber can adjust values without touching game logic.

## Dev Server

```bash
python3 -m http.server 8080
```

Games live at `localhost:8080/my-games/[game-name]/`. The server runs from the repo root.

## Assets

- **starter-pack/** — Kenney.nl sprites and sounds (CC0). Platformer tiles, characters, UI elements, sound effects. Ready to use out of the box.
- **`/make-sprite`** — generates new sprites via WaveSpeed MCP (Nano Banana 2 model). Describe what you want: "a blue slime enemy facing right, pixel art style."
- **Eagle integration** — generated sprites are auto-imported into the "AmberMakes" Eagle library for visual browsing. Folders: Sprites/, Sounds/, Generated/.

## iMac Setup

The 2019 iMac needs a full dev environment installed from scratch. See `Brief.md` for the complete checklist (10 steps from Xcode CLI Tools through to API keys).

## Note

Amber doesn't read this. Claude Code's project CLAUDE.md contains all the instructions, tone guidance, and command definitions she interacts with. This file is purely for Jordan's reference.
