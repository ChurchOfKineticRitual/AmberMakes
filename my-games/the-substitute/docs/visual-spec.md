# The Substitute — Visual & Build Spec

**Companion to `the-substitute-design.md` v1.0** **Spec v1.0 — for Claude Code Stage 1 handover**

This document defines what the game looks like and how it's built. The design document handles story, cast, structure, and writing scope. This one handles screen.

---

## 1. The visual brief in one paragraph

_The Substitute_ is a pixel-art dating-sim mystery in the visual register of **Sea of Stars / Eastward / Octopath Traveler** — dense, painterly pixel art with volumetric lighting and detailed shading, not chunky 16-bit limited-palette work. Scenes are framed isometrically: characters standing in populated spaces, the architecture and props doing as much storytelling as the figures. Dialogue cuts to closer two-shots. The palette is warm and saturated during daytime school scenes — autumn sunlight on brick — and shifts to cold desaturated dusk/night for evening scenes and mystery beats. The whole thing carries a low folk-horror hum that gets louder.

---

## 2. The stack

**Engine: Phaser 4 (current stable: v4.1.0 "Salusa", April 2026).**

The design document originally recommended Ren'Py. We're not using Ren'Py because the visual brief has changed from "muted photographic, semi-realistic portraits" to "populated isometric pixel-art world with custom UI surfaces and a dynamic distortion effect on one character." Ren'Py is a side-view visual novel engine built around a sprite-on-backdrop-with-dialogue-box layout; recreating an isometric populated scene in Ren'Py means overriding its scene system end-to-end.

**Why Phaser 4 specifically:**

1. **Built-in Filters system** (new in Phaser 4, replaces the old FX system) gives us Pixelate, ColorMatrix, Displacement, Glow, Blur, Bokeh as configurable filters on any game object — these are the exact primitives needed for the Mr. Calder distortion mechanic and the warm/cold palette swap. No custom shader work required.
2. **New 2D lighting system** works on every game object — supports the warm-by-day / cold-by-dusk palette logic natively rather than as overlays.
3. **Phaser Editor v5** (May 2026) has MCP integration that connects Claude Code directly to the scene editor — visual scene building plus generated code in one workflow.
4. **Scenes as first-class objects** — Phaser's Scene system maps cleanly to the day/slot structure of the game. Each weekday can be a scene, each location within it a sub-scene.

**What this changes from the previous draft:**

- Scenes are Phaser Scene classes, not React components
- Sprites are loaded as spritesheets or atlas, not `<img>` tags
- Custom UI screens (timetable, evidence board, village map) are still custom but built with Phaser's Game Objects and Containers rather than HTML/CSS
- The distortion effects on Mr. Calder use Phaser 4's Filter API rather than CSS filters
- Save/load uses Phaser's built-in data manager plus `localStorage`
- Project is TypeScript + Vite + Phaser 4 (a standard modern Phaser stack)

**What this preserves:**

- All visual specifications below (resolution, palette, framing, typography) are engine-agnostic
- The scene-as-data pattern (writing files separate from engine code) still applies — scene definitions can be plain TypeScript objects fed to a generic scene runner
- The staged build plan from the design document is unchanged

---

## 3. Visual specifications

### 3.1 Resolution & rendering

- **Internal resolution:** 720 × 405 (16:9), scaled up via Phaser's `Scale.FIT` mode to fill the viewport at integer multiples where possible. Pixel art is _authored_ at the lower resolution.
- **Pixel-perfect rendering:** Phaser game config `pixelArt: true` (sets `antialias: false` and `roundPixels: true`). No smoothing, ever.
- **Sprite cell sizes:**
    - Full-body character sprites: **48 × 64 px** (matches reference density — Sea of Stars register).
    - Two-shot dialogue portraits: **96 × 96 px** (bust-up, more expressive room for face).
    - Environment props (book, mug, notebook, key): **16 × 16** or **32 × 32**.
- **Backgrounds:** authored as single illustrated scenes at 720 × 405, with separate layers when needed for parallax or interactive elements (clickable door, clickable kettle).
- **Texture atlases:** characters packed into one atlas per character (idle frame, talking frames, optional walk cycle). Loaded via Phaser's atlas loader.

### 3.2 Scene framing — the two-camera system

Every scene operates in one of two modes. Transitions between them are the rhythm of the game.

**Camera A — the establishing shot.** Isometric or three-quarter top-down. Full populated scene: characters standing in the space, props placed, lighting baked in. Used to open every location and for moments where the _space_ is the story (the empty desk, the staff-room pinboard, the village high street with the wool shop visible).

- 720 × 405 fills the viewport
- Characters at full-body 48 × 64
- Dialogue plays in a slim bar at the bottom (~80px high) with a speaker name tag
- Player can click characters/objects to interact (Phaser's `setInteractive()` on game objects)

**Camera B — the two-shot.** Closer framing for dialogue beats. Two character portraits at 96 × 96 facing each other across a softly-blurred background of the current location. The two-shot is where 80% of conversation happens.

- Portraits at left and right, ~120px from the centre
- Background is the location's establishing-shot image with Phaser's Blur filter at ~3px and a darken ColorMatrix at ~40%
- Dialogue box bottom-third of screen
- Active speaker portrait at full opacity, listener at 70% (alpha tween)

**Transition:** establishing shot opens a scene; a "talk to X" click triggers a Phaser scene transition (fade or wipe, ~300ms) to the two-shot; end of conversation transitions back. Both shots live in the same Phaser Scene, swapped via container visibility, so state is preserved.

### 3.3 Palette logic

Two master palettes. Every scene runs in one or the other. Switching between them is the single biggest visual lever for tone.

**Warm palette** (daytime, school, comedy)

- Base: amber/cream/brick — autumnal sunlight register
- Saturated reference-image style
- Used: morning scenes, lunchtime, most of week 1

```
bg-deep:      #2a1810   // shadow plum
bg-warm:      #6b3d2e   // brick shadow
mid-warm:     #c97c4e   // terracotta
accent-amber: #e8a857   // sunlight
highlight:    #f4e0a8   // cream highlight
ink:          #1a0e08   // near-black for type
```

**Cold palette** (dusk, evening, mystery beats, village dread)

- Base: slate/blue-grey/bruised purple
- Desaturated, washed
- Used: after-school past 5pm, any beat flagged `mystery: true`, all village scenes after first visit, all of Friday week 2

```
bg-deep:      #0e1419   // near-black blue
bg-cold:      #2a3742   // slate
mid-cold:     #4a5a6a   // fog
accent-bruise: #6a5878  // lavender-bruise
highlight:    #b8c4d0   // cold cream
ink:          #0a0e12   // deeper black
```

**Implementation:** a global `paletteState` ("warm" | "cold") that maps to a Phaser ColorMatrix filter applied to the scene camera. Palette swap is a 600ms tween on the ColorMatrix values. Happens at scene boundaries, never mid-scene, except for the Calder beats (see §3.5).

Authored sprites and backgrounds are drawn in the **warm** palette. The cold palette is achieved via ColorMatrix transformation at runtime, not by authoring two versions of every asset. This means asset cost stays bounded.

### 3.4 Typography

Pixel-art games default to pixel fonts and it usually looks like a video-game UI. We want _something_ slightly more characterful — the game has literary register, not arcade register.

- **Body type / dialogue:** [**m6x11plus**](https://managore.itch.io/m6x11) — a clean pixel sans, 11px native. Free, web-loadable. Used for all in-game text. Loaded as a webfont; rendered via Phaser's BitmapText for performance once a bitmap-font version is generated.
- **Display type / chapter cards / "Day 3 — Wednesday":** [**Departure Mono**](https://www.fontshare.com/fonts/departure-mono) — a beautiful pixel-influenced monospace, used at 24–48px for day headers and transitions. Gives the game its title-card identity.
- **Speaker name tags:** Departure Mono small caps, 12px, in the speaker's signature colour (see §3.6).
- **No system fonts.**

For Phaser specifically: convert both fonts to bitmap-font format (`.fnt` + atlas) for the body text where performance matters; use webfont loading via the Phaser web font loader plugin for the larger display type where it's only used in title cards.

### 3.5 Mr. Calder — the distortion treatment

The single most important visual mechanic in the game. He must look _correct_ on day 1 — a perfectly ordinary maths teacher sprite, in the same register as everyone else — and degrade as the player approaches the truth.

**Implementation:** Mr. Calder's sprite has a `CalderDistortion` component (a small class that wraps a Phaser sprite and applies filters based on an `intensity` value, 0–4). The component reads `gameState.dayIndex` and `gameState.flags.playerHasNoticedCalder` and sets intensity accordingly. Phaser 4's Filters system makes each level configurable in real time.

|Intensity|When|Effect|
|---|---|---|
|**0**|Days 1–4|Normal sprite. No filter. Truly indistinguishable from any other colleague.|
|**1**|Day 5 (first wrongness beat)|Subtle horizontal jitter — a 1px offset every 4s lasting 80ms. Easy to miss. Implemented as a position tween.|
|**2**|Days 6–7|Sprite occasionally pixel-shifts: Displacement filter at low intensity, plus slight desaturation (ColorMatrix per-sprite).|
|**3**|Day 8|Visible chromatic aberration (custom shader or stacked tinted clones with 1–2px offsets), occasional silhouette doubling, name tag flickers between "Mr. Calder" and blank.|
|**4**|Days 9–10 (post-revelation)|Sprite is partially transparent (alpha 0.6), heavy Displacement filter, occasional Pixelate spike (sudden chunky-pixel moment lasting one frame). Walks in the wrong direction occasionally. Name tag shows the witches' working.|

`intensity` is set per-day based on `dayIndex` _and_ on the `playerHasNoticedCalder` flag — if the player has been to Penny's notebook or Nathan's research, intensity bumps up one step earlier. The wrongness scales with what the player knows, not just with the calendar.

**Critical:** Calder is rendered via this component _every time he appears on screen_, even in establishing shots. So the player can, theoretically, notice him glitching on day 5 if they're looking. Most won't.

### 3.6 Character sprite colour signatures

Each colleague has a signature accent colour, used for their name tag, their UI highlight on the timetable, and a small clothing accent on the sprite. Gives every named character instant recognisability across screens.

|Character|Signature|Notes|
|---|---|---|
|Michael|`#c4642e` (rust)|Deputy head — slightly formal, warm|
|Loala|`#3e8e6e` (sage green)|PE — outdoorsy, grounded|
|Nathan|`#5a6b9e` (dusty blue)|Science — bookish, calm|
|Ronny|`#7a6450` (weathered brown)|Caretaker — earthy, gruff|
|Penny|`#b85a8a` (heather pink)|Literacy — soft, slightly off-key|
|Eleanor|`#8a6ba8` (lavender)|Used in retrospect / artefacts only|
|Calder|`#6b6b6b` (grey) → distorts|The unmemorable colour by design|
|Iris|`#9a8458` (old wool)|The village layer|

---

## 4. The four custom UI screens

These are the bespoke surfaces beyond standard dialogue playback. Each is its own Phaser Scene (or modal Container within the active Scene), with its own visual identity.

### 4.1 The Timetable

**Purpose:** show the player the week grid — which days remain, who's available when, who they've already spent time with.

**Visual:** a hand-drawn-looking grid (rendered with Phaser game objects, not literal hand-drawn) styled as a teacher's planning page. Cream paper texture, ink lines, the days of the week as columns, the three slots (Morning / Lunch / After School) as rows.

- Each cell shows a tiny portrait icon of the colleague the player saw (or "—" for unused slots)
- Today's column is highlighted in the warm-palette accent
- Past days are slightly faded (alpha 0.7)
- Future days are blank with an availability hint dot in each colleague's signature colour
- Bottom of the screen: the three stat bars (Rapport / Curiosity / Discretion) rendered as filled rectangles with pixel-style end caps

**When it's shown:** always accessible via a `[Timetable]` button bottom-right of every scene. Also auto-shown at day boundaries. Implemented as a Phaser Scene launched on top of the current scene (Phaser's `scene.launch()`), pausing the underlying scene.

### 4.2 The Staff Room

**Purpose:** the "home base" between teaching slots. From here the player picks who to talk to at lunch / after school.

**Visual:** an isometric pixel-art scene of the staff room — kettle in the corner, the pinboard (some notices missing, per Michael's notice), a few mugs, Eleanor's empty chair (forever, until day 10). The colleagues who are _available right now_ are visible in the scene, standing or sitting. Unavailable colleagues are absent.

- Clickable: each colleague sprite (`setInteractive()`, cuts to two-shot conversation)
- Clickable: the pinboard (reveals notices — narrative drip, opens a sub-modal)
- Clickable: Eleanor's chair (player monologue, evolves with what the player knows)
- Clickable: the kettle (a beat: "Make tea?" — small flavour, sometimes a passing-Calder hello)

This is the most-revisited screen in the game. It should be _delicious_. Time spent here should feel like time spent. Implemented as the primary scene the player returns to between dialogue scenes.

### 4.3 The Evidence Board

**Purpose:** track what the player has learned. The mystery has five threads (per the design document). Each thread is a card that fills in as the player discovers it.

**Visual:** a corkboard pinned with index cards, photographs, scraps of paper. Pixel art, slightly skewed cards (using Phaser's sprite rotation in small increments), red string between connected pieces of evidence (rendered as Phaser Graphics line objects).

- Five thread cards, each starts blank and fills in with key phrases as the player learns them
- A thread is "complete" when its key card is filled — a small flourish animation (the string ties between cards)
- The player needs three threads complete to reach the True ending; this is shown subtly (the string between completed threads forms a shape; when three are connected, a sixth element — the wool shop — appears in the bottom corner of the board)
- Accessed via the timetable screen, top-right corner

This screen is the most diegetic — it's the player's _own_ investigation notebook. Should never feel like a stat panel.

### 4.4 The Village Map

**Purpose:** the village layer. Available from week 1 free periods, becomes critical in week 2.

**Visual:** a top-down pixel illustration of the village — the school at one end, the high street with the wool shop, a churchyard, a wood at the edge. The map is _small_ — six or seven locations only. Locations the player has visited are lit; unvisited are dimmer (alpha and ColorMatrix darken).

- The wool shop appears on the map from day 1 but is unclickable until the player has at least one piece of evidence pointing there
- The wood at the edge is unclickable until day 9 (where it becomes the site of the ending)
- The churchyard contains the Harlow family stones — accessible from day 6, contains the family pattern info as a passive read
- Visual register: the village uses the cold palette by default. Even in week 1 daytime. The village is always slightly _off_.

---

## 5. Stage 1 brief — what Claude Code should build first

This is the spec for the very first build, to be handed to Claude Code as a single focused brief.

### Scope of Stage 1

**A playable day 1, demonstrating the visual loop:**

1. **Title screen** — game title in Departure Mono, atmospheric pixel-art establishing shot of St Aldhelm's at dawn (warm palette, slightly washed — the village layer creeping in), "Begin" button.
2. **Day 1 morning** — establishing shot of the player's classroom, dialogue intro, a three-option lesson-planning choice (each tilts one stat).
3. **The staff room** — first time entry. All five colleagues present (it's day 1). Brief intro dialogue with each via two-shot when clicked. Mr. Calder visible in the scene at intensity 0 — a sprite in the background, no introduction, no name tag pop. The player will not register him.
4. **Lunchtime — fixed scene** — Michael shows the player the staff room (mandatory beat per the design document).
5. **Afternoon teaching** — a single short scene, narrated.
6. **After school — choice** — pick a colleague from those available (all five on day 1). Play a placeholder scene (~200 words) with that colleague in two-shot mode.
7. **Day end transition** — Departure Mono title card: "Day 2 — Tuesday" — then a brief preview of the staff room with subtly different lighting.

### Technical scaffold Stage 1 should establish

- **Phaser 4 + TypeScript + Vite project** (standard modern Phaser stack)
- **Folder structure:**

```
the-substitute/
├── src/
│   ├── main.ts                       # Game config, scene registration
│   ├── scenes/
│   │   ├── BootScene.ts              # Asset preload
│   │   ├── TitleScene.ts
│   │   ├── DayScene.ts               # Generic day-runner, reads scene data
│   │   ├── StaffRoomScene.ts
│   │   ├── TimetableScene.ts         # Overlay scene
│   │   ├── EvidenceBoardScene.ts     # Overlay scene (Stage 3)
│   │   └── VillageMapScene.ts        # Overlay scene (Stage 3)
│   ├── components/
│   │   ├── DialogueBox.ts            # Container with text + name tag
│   │   ├── TwoShot.ts                # The two-portrait dialogue framing
│   │   ├── CharacterSprite.ts        # Wraps a sprite + interactivity
│   │   ├── CalderDistortion.ts       # The intensity-driven effects wrapper
│   │   └── PaletteManager.ts         # Warm/cold ColorMatrix manager
│   ├── data/
│   │   ├── day01/
│   │   │   ├── morning.ts            # Scene as data
│   │   │   ├── staffroom-intro.ts
│   │   │   ├── lunch-michael.ts
│   │   │   └── afterschool-{character}.ts
│   │   ├── characters.ts             # Cast definitions, signature colours
│   │   └── routines.ts               # Who's available when
│   ├── state/
│   │   ├── gameState.ts              # Day, stats, evidence, flags (Phaser registry-backed)
│   │   └── saveLoad.ts               # localStorage wrapper
│   ├── styles/
│   │   └── fonts.css                 # Webfont loading for Departure Mono
│   └── assets/
│       ├── sprites/                  # Character atlases
│       ├── backgrounds/              # Per-location PNGs
│       └── ui/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

- **Scene-as-data pattern:** each dialogue scene is a TypeScript object describing beats (lines, choices, transitions) and stat effects. A generic `DayScene` runner reads this and plays it. Keeps writing separate from engine code; the writing files are what get iterated on.
- **Placeholder art:** coloured rectangles labelled with character names are fine for Stage 1. The design document explicitly endorses this approach. Get the _system_ right first.
- **`pixelArt: true`** set in the Phaser game config from day one so swapping in real art later requires zero rework.
- **PaletteManager wired through every scene** so the warm→cold swap is a one-line change at scene boundaries.
- **`CalderDistortion` component with the intensity prop** wired in even though intensity stays at 0 in Stage 1 — proves the mechanism.

### Stage 1 success criteria

- The player can click through day 1 from title to "Day 2 — Tuesday" card
- All five colleagues introduce themselves at the staff room (placeholder dialogue is fine)
- One after-school choice plays one short scene
- Save/load works (a "continue" button on the title screen resumes from last save)
- The warm palette is in effect throughout day 1
- Mr. Calder appears in the staff room scene, unintroduced, intensity 0
- Stat tracking works (the morning lesson choice nudges a stat, viewable on timetable)
- The timetable screen renders (showing day 1 used, days 2–10 future)

That's Stage 1. The evidence board, village map, and full staff room interactivity come in Stages 2–3.

---

## 6. Things deliberately not in this spec

- **Audio.** The design document puts audio last. Leave it. We'll spec it separately when the writing is done.
- **Save slot UI design.** Functional first, designed in Stage 4.
- **Mobile / touch support.** Desktop-only first build. Touch is a port question, though Phaser handles it natively when we get there.
- **Localisation.** English only. The village is too specifically West Country for this to be a v1 concern.
- **Character sprite art.** Placeholder rectangles for Stages 1–3. Real art is Stage 5 work, and may involve commissioning or generative pipelines; sprite consistency across animation states will need its own pipeline.

---

## 7. Open questions parked for later

These don't block Stage 1 but should be decided before Stage 3:

1. **How much character animation?** Idle sway only, or walk cycles in establishing shots? Affects sprite authoring cost significantly. (Phaser handles either trivially — the question is purely art budget.)
2. **The village map — is it isometric like the staff room, or top-down like a hand-drawn map?** Either works; isometric is more cohesive, top-down is more legibly "a map."
3. **The wool shop interior** — single establishing shot, or interactive (clickable wool, clickable counter)? Probably single shot; the conversation is the thing.
4. **Calder intensity 4 visual** — how far do we push it? There's a version where he's barely a sprite by Friday and a version where he's still mostly there but very wrong. The latter is probably better — uncanny beats indistinct.
5. **Phaser Editor v5?** The MCP-integrated scene editor could speed up the staff-room and village-map work substantially, but adds a tool to the workflow. Decide before Stage 2.

---

## 8. Handover note for Claude Code

When this gets handed over: provide both `the-substitute-design.md` (story/structure/cast) and this document (visuals/stack/build) in the project. The Stage 1 brief should be a _single message_ asking for the scaffolded Phaser 4 project plus playable day 1, referencing both documents. Don't try to ship more than Stage 1 in one Claude Code session — the design document's staged build plan is correct, and each stage wants its own focused session with its own context budget.