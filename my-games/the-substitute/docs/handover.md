# The Substitute — handover to Claude Code

This is a short briefing note. The main reference is **`the-substitute-design.md`** (in this same folder). Read that first. This note just tells you where we are and what to do next.

---

## What's locked in

All design decisions from the doc are final. Specifically:

- **Game name:** The Substitute
- **Setting:** St Aldhelm's secondary school, in the village of Aldhelm's Cross, West Country
- **Protagonist:** A supply teacher, two-week placement covering Year 10 English
- **Vanished teacher:** Eleanor Harlow, 28
- **Five colleagues:** Michael Jamey (Deputy Head, 38), Loala FeldLinn (PE, 26), Nathan Davis (Science, 42), Ronny Flax (Caretaker, 62), Penny Harrington (Literacy, 29) — full sheets in the design doc
- **The beast:** Mr. Calder, in the shape of a maths teacher, no first name
- **The guilty witch:** Iris Penhale, 54, runs a wool shop in Aldhelm's Cross
- **Three endings:** Bad, Pyrrhic, True — coloured by which colleague the player trusted most
- **Stack:** Ren'Py
- **Build approach:** Five stages from the design doc, ship something playable at every stage

---

## What we have NOT decided yet

These can wait — they're Stage 5 (art) concerns:

- The visual style for character portraits and backgrounds
- Whether to use AI-generated art (WaveSpeed/Seedream/NanoBanana via MCP) or commission/draw
- Title screen and UI styling

For Stages 1–4, **placeholder coloured rectangles are fine.** Don't get distracted by art yet. Get the script working first.

---

## What to do in this Claude Code session

**Stage 1 only.** From Section 7 of the design doc:

> A Ren'Py project that runs, plays through Day 1 with intro scenes for all five colleagues plus a glimpsed Mr. Calder, lets the player pick a colleague at lunchtime, plays a placeholder lunch scene, advances to a day-end screen, then advances to Day 2 (which can be a stub). Save/load should work. Placeholder coloured rectangles instead of character art are fine.

Use the project structure laid out in Section 6 of the design doc — `game/days/`, `game/characters/`, `game/village/`, etc. Even though Day 1 is small, set up the folder structure correctly so Stages 2–4 can slot in without restructuring.

**Output for end of Stage 1:** a playable five-minute slice that demonstrates the loop. When that's working, we stop and review before moving to Stage 2.

---

## How we got here (short version)

I (Jordan) spent a session with another Claude exploring the history of dating sims, clipping ideas I liked, then choosing one concept ("The Substitute") from a generated shortlist. We then designed:

1. The five colleagues (mine)
2. The true mystery — witches' curse on the Harlow family from ~1665, "one a year" — and the beast wearing a maths teacher (mine, refined together)
3. The structure, scenes, stats, stack, and staged build plan (other Claude)

The full design doc is the canonical reference. This handover note exists because we'd been continuing the conversation past the design doc — adding the village name (Aldhelm's Cross), confirming Ren'Py, and starting to talk about art before realising it was time to switch sessions.

---

## One housekeeping note from the previous Claude session

The previous Claude flagged that a WaveSpeed API key was pasted in cleartext in some setup instructions for this iMac. I said I'd rotate it later. **Reminder to actually do that** before using `/make-sprite` for anything real — generate a new key at wavespeed.ai, update `~/.zshrc`, restart Claude Desktop. Not urgent for this Claude Code session (we're not making art yet), but don't forget.