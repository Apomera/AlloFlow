# Working in this repo

## Many agents share this tree. Do not commit unless asked.

Many Claude and Codex sessions edit this one working tree and git repo at the
same time, with no locking. The owner keeps all work **uncommitted until they
say everyone is ready**. Unexpected commits are the problem: a commit from one
session sweeps in, or ships, other sessions' half-finished work.

- **Never commit, push or deploy unless the user explicitly asks for it in the
  current conversation.** Finishing or verifying work is not a reason to commit.
- **Uncommitted edits are the normal state here**, not a mess to tidy. Leave
  other sessions' changes alone, in every file.
- **Never run git commands that rewrite the working tree or the index:**
  `git checkout -- <path>`, `git restore`, `git reset --hard`, `git stash`,
  `git clean`, switching branches. With everything uncommitted, these are what
  destroy work. On 2026-09-20 two sessions' edits to `sel_hub/sel_hub_module.js`
  were silently reverted, twice, when another session restored the file to its
  committed state. `git status` then reported the file clean. Read-only git
  (`status`, `diff`, `log`, `show`) is fine.
- **To undo your own change**, edit it back, or restore from a copy you saved
  yourself before you started. Never from git: the file may also hold other
  sessions' uncommitted work.
- **A gate that was green going red with no edit from you** is the signal that
  someone else changed a file under you. Re-run your gates after any long
  operation.

## When the user does ask you to commit

**Commit in ONE step with an explicit pathspec:**

```
git commit -F <msgfile> -- path1 path2 …
```

The git **index is shared**. `git add` followed by a bare `git commit` sweeps
another session's staged files into your commit — this has happened repeatedly.
A pathspec commit ignores the index and takes only the paths you name. (If a
path is untracked, `git add` it first, then use `git commit --only -- <paths>`.)
A file several sessions edited (for example `ui_strings.js`) holds their work
too: commit only your own keys, not the whole file.

- **Never `git commit --amend`, rebase, or `git stash pop`** here. A concurrent
  commit may have landed on top, so an amend rewrites *someone else's* commit
  and a bare `stash pop` grabs whatever is on top of a shared stash stack.
- **Never `git add -A` / `-u`** unless the user explicitly says "commit
  everything".
- **Push or deploy only when asked for that too.** Check
  `git log origin/main..HEAD` first — other sessions leave unpushed commits,
  and pushing sweeps theirs out with yours.

The pre-commit hook runs on the WHOLE tree, so it can block your commit because
of *another session's* in-flight drift (for example a `*_source.jsx` root/dup
pair they have not synced yet). **Wait, or ask the user.** Do not run `--fix`
on, or hand-sync, another session's files to unblock yourself. If a commit
fails the hook, **unstage what you staged**.

`.git/index.lock` contention is normal. Check the lock's age and whether a git
process is live before removing it; a real operation clears on its own.

## Before you overwrite a file you did not just write

Another agent's work may be in it. Diff first and look at what is **only** in
the destination:

```
diff <source> <destination> | grep '^>'
```

If the destination-only lines are just the old versions of lines you are
replacing, the overwrite is safe. If they are something else, you are about to
destroy someone's work. This check takes seconds and has caught real losses.

This applies especially to the **four-copy files**. SEL and STEM tools exist in
`sel_hub/` (source) plus `desktop/web-app/public/`, `desktop/app-build/` and
`desktop/web-app/build/`. Re-sync **all three** mirrors after editing a source
file, not just the first — `dev-tools/check_sel_four_copy_parity.cjs` verifies
it.

## Verification

- A gate that cannot fail is worse than none. Give new gates a `--selftest` and
  **mutation-verify** them: break the thing on purpose, confirm the gate goes
  red, restore from your own saved copy (not git), and **verify the restore by
  re-reading the file** — OneDrive has left a mutation in place while the shell
  reported success.
- Harnesses here load `sel_hub/` and `stem_lab/` straight from disk
  (`readdirSync`, `addScriptTag`). That is not what the app does: the app fetches
  the modules named in `var selToolModules` / `stemToolModules` in
  `AlloFlowANTI.txt`. A harness that loads what the app does not is measuring a
  different program — this is how 39 SEL tools stayed unreachable while 190+
  tests passed.

## AlloFlowANTI.txt is the source

`build.js` transforms `AlloFlowANTI.txt` → `desktop/web-app/src/App.jsx`. Editing
`App.jsx` alone is erased by the next build. Edit ANTI, then run `node build.js`.
ANTI is pasted into Gemini Canvas verbatim and carries a comment-byte ratchet, so
keep added comments tight.
