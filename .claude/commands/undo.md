# /undo

Undo the last change by reverting the most recent git commit.

## Steps

1. Run `git log --oneline -3` to show what the last few changes were
2. Run `git revert HEAD --no-edit` to undo the last commit
3. Tell Amber what was undone (use the commit message) and that the game is back to how it was before

## If things go wrong

If the revert fails (e.g., merge conflict), explain simply: "The undo got tangled up. Let me fix it manually." Then reset to the previous commit with `git checkout HEAD~1 -- .` and commit with message "Undo: [original commit message]".

## Rules

- Use teenager-friendly language — keep it casual and reassuring
- Don't explain what git revert means. Just say "I've undone that" or "Your game is back to how it was"
- If there's nothing to undo (no commits or only the initial commit), say so: "There's nothing to undo yet!"
- All paths are relative to the AmberMakes root directory
