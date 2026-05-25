# /wrap

End the current session cleanly so the next session (today, tomorrow, or on the other machine) picks up without confusion.

This is the AmberMakes equivalent of a session handoff. There's no Wisdom infrastructure here — no session log, no inbox, no D1. The durable surfaces are CLAUDE.md and the git repo. `/wrap` updates both.

## Steps

1. **Check git state.** Run `git status`.
   - If there are uncommitted changes, ask Amber for a one-line description of what we did this session ("what should I call this save?"). Use her words for the commit message. Then `git add -A && git commit -m "..."`.
   - If everything's already committed, skip to step 2.

2. **Push.** Run `git push origin main`.
   - If the push fails because the remote has new commits (the other machine pushed first), run `git pull --rebase` then `git push origin main` again.
   - If it still fails, stop and tell Amber: "Something's tangled with the save — ask Jordan."

3. **Update CLAUDE.md — only if genuinely new.** Look back over the session for anything non-obvious that future-you would benefit from knowing. Examples of what qualifies:
   - A new safety-filter blocker and its workaround (e.g. "weasel" instead of "ferret")
   - A Phaser API quirk that surprised you and took time to debug
   - A sprite rotation offset for a new character
   - A pattern that worked unexpectedly well

   Examples of what does NOT qualify (skip these):
   - "We built a new game" — the repo shows that
   - "We fixed a bug" — git log shows that
   - General praise or session summary

   If nothing qualifies, skip this step. CLAUDE.md staying lean is more valuable than padding it.

   If something does qualify, append one short line to the relevant section of `.claude/CLAUDE.md`. Keep it under 15 words. Then `git add .claude/CLAUDE.md && git commit -m "Note: <thing learned>" && git push`.

4. **Tell Amber what's saved.** One line: "Saved as '<commit message>'. Pushed to GitHub." Then suggest one thing to try next time, based on what we just did.

5. **Suggest the next session command.**
   - If Amber is continuing the same game/feature tomorrow: "When you come back, just say what you want to change."
   - If Amber is switching to a new game next time: "Next time, run `/clear` first to start fresh, then say what game you want to build."

## If things go wrong

- **Nothing to commit, nothing to push, nothing to add to CLAUDE.md:** that's fine. Just say "All saved already — nothing to wrap up. See you next time!"
- **Git push asks for credentials:** tell Amber "GitHub needs Jordan to log in — ask him next time you see him." Don't try to fix this yourself.
- **Merge conflict on rebase:** stop, tell Amber "The other computer made a change at the same time — Jordan needs to untangle this." Don't try to resolve conflicts.

## Rules

- Teenager-friendly language to Amber throughout. Don't say "commit" or "push" — say "save" and "send to GitHub" if you must reference them at all.
- Keep the whole wrap interaction under 30 seconds for Amber. Don't make session-end feel like a chore.
- Never update CLAUDE.md just to have something to do. Padding the file makes every future session worse.
- All paths relative to the AmberMakes root directory.
