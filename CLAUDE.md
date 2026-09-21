# Working in this repo

## This tree has many concurrent agents. Commit early.

At the time of writing there were **14 live Claude sessions** editing this one
working tree and git repo. There is no locking. Assume another agent is editing
the same file you are.

**The failure that costs work:** on 2026-09-20 an agent's uncommitted edits to
`sel_hub/sel_hub_module.js` were silently reverted in the working tree — twice —
when another session ran a git operation that restored the file to its committed
state. `git status` reported the file **clean**. The edits were in no commit, no
stash and no index. They were recoverable only because SEL ships four copies of
each file and a build mirror still held the good version. The same restores also
rescued a *different* session's in-flight fix, which had been dropped along with
them.

So:

- **Commit your own work as soon as it verifies.** Do not accumulate an hour of
  finished work in the working tree. The window between "verified" and "another
  session commits" is minutes.
- **`git status` clean does not mean your work is saved.** It means the file
  matches HEAD. For uncommitted edits those are opposite things.
- **A gate that was green going red with no edit from you** is the signal that
  someone else changed a file under you. Re-run your gates after any long
  operation.

## Committing

**Always commit in ONE step with an explicit pathspec:**

```
git commit -F <msgfile> -- path1 path2 …
```

The git **index is shared**. `git add` followed by a bare `git commit` sweeps
another session's staged files into your commit — this has happened repeatedly.
A pathspec commit ignores the index and takes only the paths you name. (If a
path is untracked, `git add` it first, then use `git commit --only -- <paths>`.)

- **Never `git commit --amend`, rebase, or `git stash pop`** here. A concurrent
  commit may have landed on top, so an amend rewrites *someone else's* commit
  and a bare `stash pop` grabs whatever is on top of a shared stash stack.
- **Never `git add -A` / `-u`** unless the user explicitly says "commit
  everything".
- **Do not push or deploy unasked.** Check `git log origin/main..HEAD` first —
  other sessions leave unpushed commits, and pushing sweeps theirs out with
  yours.

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

## The pre-commit hook runs on the WHOLE tree

It will block your commit because of *another session's* in-flight drift (for
example a `*_source.jsx` root/dup pair they have not synced yet). **Wait for
them to resolve it, or ask the user.** Do not run `--fix` on, or hand-sync,
another session's files to unblock yourself. Blocked commits usually clear
within minutes.

If a commit fails the hook, **unstage what you staged** — leaving files staged
invites the next session's commit to absorb them.

`.git/index.lock` contention is normal. Check the lock's age and whether a git
process is live before removing it; a real operation clears on its own.

## Verification

- A gate that cannot fail is worse than none. Give new gates a `--selftest` and
  **mutation-verify** them: break the thing on purpose, confirm the gate goes
  red, restore, and **verify the restore by re-reading the file** — OneDrive has
  left a mutation in place while the shell reported success.
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
