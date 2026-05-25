# Session Management on AmberMakes

How to work with Claude Code on this project across multiple sessions without context bloat or memory drift. This file is for the agent — read it once at the start of your first session, refer back when something feels off.

---

## The model

AmberMakes runs on a stripped-down environment by design. There's no shared session database, no cross-agent inbox, no `_progress.json` tracking file, no Wisdom infrastructure. The whole system has exactly **two durable surfaces**:

1. **`.claude/CLAUDE.md`** — auto-loaded into every session. Anything written here becomes durable memory for the next agent.
2. **The git repo** — code, sprites, assets, commit history. The state of every game lives here. `git log` is the session-by-session history of what happened.

Everything else (conversation context, in-session memory, undo stack within the current chat) is **ephemeral**. It vanishes when the session ends. Treat it accordingly.

---

## Three failure modes to avoid

**1. Context bloat.** As a session runs long, your context window fills with old turns, old code reads, old sprite-generation attempts. You start forgetting things you said earlier, or worse, you make decisions based on outdated state. Symptoms: forgetting which game you're working on, re-reading files you already read, suggesting changes that contradict earlier decisions.

**2. Memory drift between sessions.** A new session starts with no memory of the previous one except what's in CLAUDE.md and the repo. If something important happened last session and didn't make it into either of those, it's gone. Symptoms: re-discovering a sprite-prompt workaround that was already figured out yesterday; suggesting an approach that was already tried and rejected.

**3. CLAUDE.md bloat.** Over-eager note-taking pollutes the file with session-specific noise. Every future session pays the cost of reading it. Symptoms: CLAUDE.md grows past ~100 lines with lots of "we tried X, then Y, then Z" history that nobody needs.

---

## The three primitives

Claude Code gives you exactly three commands for managing session state:

| Command | What it does | When to use |
|---------|--------------|-------------|
| `/compact` | Summarises the conversation so far, drops the raw turns, keeps the working state. You stay on the same task; the context shrinks. | Mid-session, when context is filling but Amber wants to keep going on the same thing. Claude Code will often prompt you automatically. |
| `/clear` | Wipes the slate completely. CLAUDE.md and the repo re-orient you on the next message. | When switching to a new topic — finished one game and starting another, finished a feature and moving on to something unrelated. |
| `/wrap` | Project-specific. Commits any pending work, pushes to GitHub, updates CLAUDE.md if anything non-obvious was learned, and suggests what to try next time. | At session end. Always. |

Use them in this order over the lifetime of a project: `/compact` mid-session as needed → `/wrap` at session end → `/clear` at the start of the *next* session if it's a new topic.

---

## When to update CLAUDE.md

This is the key judgement call in `/wrap`. The rule of thumb:

> Would a future session, starting fresh with only CLAUDE.md and the repo, do worse without this note?

Things that pass the test:
- A safety-filter blocker we discovered (e.g. "ferret" → "weasel")
- A Phaser API quirk that took non-trivial time to debug
- A sprite rotation offset for a new character archetype
- A pattern that worked surprisingly well and should be reached for first next time

Things that fail the test:
- "We built the Ferret Shop game" — the repo shows that
- "We fixed the granny chase bug" — the commit message shows that
- "Amber liked the magenta sprites" — not actionable for a future session
- Anything that's a one-off and won't recur

When in doubt, don't add it. CLAUDE.md staying lean is worth more than capturing every detail. If a future session genuinely needs the info and it's missing, it'll be re-derived from the code or asked of Amber.

---

## What "handoff" means here

In some systems, handoff means a structured artefact — a session log, a state dump, a JSON file of next steps. AmberMakes has none of that. Handoff here is much simpler:

1. The repo on GitHub is current (push completed).
2. CLAUDE.md reflects any genuinely new gotchas.
3. Amber knows what was saved and has a hint for what to try next.

That's it. The next session — on the same machine or the other one — starts with `git pull`, reads CLAUDE.md, and is oriented enough to continue.

If you find yourself wanting more than this (a TODO list, a "current focus" field, a session ID), resist the urge. The project is small enough that the code + commit history + CLAUDE.md fully describe the state.

---

## Working across two machines

AmberMakes has two homes: Jordan's laptop and Amber's iMac. GitHub is the only sync surface between them. Two non-negotiables:

- **Pull before edit.** First command after starting a session: `git pull origin main`. The other machine may have committed since you last looked. A fast-forward failure means there's a divergence — stop and ask Jordan to reconcile.
- **Push before wrap.** Every `/wrap` must end with a successful push. If you commit but don't push, the other machine will silently work on stale code next time, and that's hard to detect.

The `/wrap` command enforces both of these. As long as you use it at session end, the two machines stay in sync.

---

_Created: 25May26m. Paired with `/wrap` command in `.claude/commands/wrap.md`._
