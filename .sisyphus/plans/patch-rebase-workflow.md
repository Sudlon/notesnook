# Patch Rebase Workflow for OneNote Indentation Fork

## TL;DR

> **Quick Summary**: Squash the 37-commit `feat/onenote-indentation` branch into a single clean patch commit (excluding planning artifacts), and create a helper script that rebases this patch onto upstream's latest `master` for periodic syncing.
>
> **Deliverables**:
>
> - Clean `onenote-indentation-patch` branch with exactly 1 squashed commit (33 files, ~3500 lines)
> - `scripts/sync-upstream.sh` — defensive helper script for rebasing onto upstream updates
> - `upstream` remote pointing to `streetwriters/notesnook`
> - Original `feat/onenote-indentation` branch preserved as permanent reference
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO — sequential (git operations depend on each other)
> **Critical Path**: Clean → Backup → Squash → Verify → Script → Verify

---

## Context

### Original Request

User maintains a fork (`Sudlon/notesnook`) with a custom OneNote-style flat indentation feature for the editor. The upstream owner won't merge the PR. User wants a workflow to pull upstream changes and re-apply their patch.

### Interview Summary

**Key Discussions**:

- Strategy: Squash + rebase (collapse 37 commits into 1, rebase onto upstream when syncing)
- Sync frequency: Occasional (quarterly+)
- User is NOT comfortable resolving complex git conflicts — needs maximum guidance
- Remove .sisyphus artifacts, lockfiles, and build artifacts from patch
- Single commit: `feat(editor): implement OneNote-style flat indentation lists`
- Helper script for syncing (not CI, not manual docs)

**Research Findings**:

- No `package.json` changes — lockfile diffs are purely incidental, safe to exclude
- 33 meaningful files across `packages/editor/` (30) and `packages/core/` (3)
- 19 files to exclude: 16 `.sisyphus/`, 3 lockfiles, 1 `tsconfig.tsbuildinfo`
- 4 untracked files need cleanup: ad-hoc test scripts and a sisyphus finding
- No `upstream` remote configured yet
- Working directory has untracked files that must be cleaned first
- Default branch is `master` (not `main`)

### Metis Review

**Identified Gaps** (addressed):

- Lockfile changes confirmed as incidental — excluded from patch
- Untracked files (test scripts) identified — explicit cleanup step added
- Script location decided: inside repo at `scripts/sync-upstream.sh` (carried as part of the patch)
- `git rerere` recommended to remember conflict resolutions across syncs
- Migration version drift in `packages/core/src/migrations.ts` flagged as high-conflict-risk — documented in script output
- Backup branch mandatory before any destructive operation
- Script must NEVER auto-push or auto-resolve conflicts
- Edge cases: upstream file renames/deletes, dependency version changes, running script twice

---

## Work Objectives

### Core Objective

Create a single, clean patch commit and a repeatable rebase workflow so the user can sync with upstream without deep git expertise.

### Concrete Deliverables

- Branch `onenote-indentation-patch` with exactly 1 commit containing 33 files
- Branch `backup/onenote-indentation-pre-squash` preserving current state
- `upstream` remote → `https://github.com/streetwriters/notesnook.git`
- `scripts/sync-upstream.sh` — idempotent, defensive sync script
- `git rerere` enabled for the repo

### Definition of Done

- [ ] `git log --oneline master..onenote-indentation-patch` shows exactly 1 commit
- [ ] `git diff --name-only master..onenote-indentation-patch` shows exactly 33 files
- [ ] No `.sisyphus/`, lockfiles, or `tsconfig.tsbuildinfo` in the patch diff
- [ ] `feat/onenote-indentation` branch still exists with all 37 original commits
- [ ] `scripts/sync-upstream.sh` is executable and passes shellcheck
- [ ] `git remote get-url upstream` returns `https://github.com/streetwriters/notesnook.git`
- [ ] Working directory is clean (`git status` shows nothing)

### Must Have

- Backup branch before any destructive operation
- Single squashed commit with descriptive message
- Helper script that halts on errors and never auto-pushes
- Script creates timestamped backups on every run
- Script prints human-readable conflict guidance including per-file descriptions
- `git rerere` enabled

### Must NOT Have (Guardrails)

- NO auto-push or force-push anywhere (script prints the command, user runs it)
- NO interactive git commands (`-i` flag forbidden)
- NO `.gitignore` modifications in the patch (separate concern)
- NO CI/CD setup
- NO lockfiles, `.sisyphus/`, or `tsconfig.tsbuildinfo` in the patch commit
- NO mutation of the original `feat/onenote-indentation` branch
- NO auto-conflict-resolution in the script
- NO git hooks setup
- NO splitting into multiple commits

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: N/A (this is git workflow, not application code)
- **Automated tests**: None (verification is via git commands)
- **Framework**: Bash assertions

### QA Policy

Every task includes agent-executed QA scenarios using bash commands.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.txt`.

- **Git operations**: Use Bash — run git commands, assert branch state, commit counts, file lists
- **Script**: Use Bash — run shellcheck, verify executable bit, dry-run
- **Working directory**: Use Bash — `git status`, `git clean -n`

---

## Execution Strategy

### Parallel Execution Waves

> These tasks are strictly sequential — each depends on the previous.

```
Wave 1 (Sequential — git operations):
├── Task 1: Clean working directory [quick]
├── Task 2: Add upstream remote + enable rerere [quick]
├── Task 3: Create backup branch [quick]
├── Task 4: Create squashed patch commit [quick]
├── Task 5: Verify patch commit [quick]

Wave 2 (After Wave 1 — script creation):
├── Task 6: Create sync-upstream.sh helper script [deep]
├── Task 7: Final verification of everything [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Scope fidelity check (deep)
```

### Dependency Matrix

| Task | Depends On | Blocks  |
| ---- | ---------- | ------- |
| 1    | —          | 2, 3, 4 |
| 2    | 1          | 4, 6    |
| 3    | 1          | 4       |
| 4    | 2, 3       | 5       |
| 5    | 4          | 6       |
| 6    | 5          | 7       |
| 7    | 6          | F1, F2  |
| F1   | 7          | —       |
| F2   | 7          | —       |

### Agent Dispatch Summary

- **Wave 1**: 5 tasks — T1-T3 → `quick`, T4 → `quick`, T5 → `quick`
- **Wave 2**: 2 tasks — T6 → `deep`, T7 → `quick`
- **FINAL**: 2 tasks — F1 → `oracle`, F2 → `deep`

---

## TODOs

- [x] 1. Clean Working Directory

  **What to do**:
  - Delete the 4 untracked files that would clutter the workspace:
    - `packages/editor/test-check.mjs` (ad-hoc test script)
    - `packages/editor/test-direct-indent.test.ts` (ad-hoc test script)
    - `packages/editor/test-list-check.mjs` (ad-hoc test script)
    - `.sisyphus/notepads/onenote-indentation/findings.md` (sisyphus artifact)
  - Run `git status` to confirm working directory is clean after deletion
  - If there are any other untracked files, list them and delete if they are clearly artifacts

  **Must NOT do**:
  - Do NOT delete any tracked files
  - Do NOT modify the git index or staging area
  - Do NOT touch the `feat/onenote-indentation` branch

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, first)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None (can start immediately)

  **References**:
  - `git status --short` output from planning session shows the 4 untracked files
  - These files are NOT part of the 37 feature branch commits — they were created ad-hoc and never committed

  **Acceptance Criteria**:
  - [ ] `git status --porcelain` outputs empty (exit code 0, no output)
  - [ ] `ls packages/editor/test-check.mjs 2>/dev/null` returns nothing (file deleted)
  - [ ] `ls packages/editor/test-direct-indent.test.ts 2>/dev/null` returns nothing
  - [ ] `ls packages/editor/test-list-check.mjs 2>/dev/null` returns nothing

  **QA Scenarios:**
  ```
  Scenario: Working directory is clean after cleanup
    Tool: Bash
    Preconditions: On feat/onenote-indentation branch
    Steps:
      1. Run: rm -f packages/editor/test-check.mjs packages/editor/test-direct-indent.test.ts packages/editor/test-list-check.mjs .sisyphus/notepads/onenote-indentation/findings.md
      2. Run: git status --porcelain
      3. Assert: output is empty (zero lines)
    Expected Result: Exit code 0, no output from git status --porcelain
    Failure Indicators: Any filename appears in git status output
    Evidence: .sisyphus/evidence/task-1-clean-workdir.txt
  ```

  **Commit**: NO

- [x] 2. Add Upstream Remote and Enable git rerere

  **What to do**:
  - Add the upstream remote: `git remote add upstream https://github.com/streetwriters/notesnook.git`
    - If remote already exists (idempotent), verify URL is correct with `git remote get-url upstream`
  - Enable git rerere: `git config rerere.enabled true`
    - This remembers conflict resolutions so repeated syncs auto-apply previous resolutions
  - Fetch upstream to populate `upstream/master`: `git fetch upstream`

  **Must NOT do**:
  - Do NOT modify the `origin` remote
  - Do NOT push anything
  - Do NOT checkout any other branch

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, second)
  - **Blocks**: Tasks 4, 6
  - **Blocked By**: Task 1

  **References**:
  - Upstream repo: `https://github.com/streetwriters/notesnook.git`
  - Current remotes show only `origin` -> `Sudlon/notesnook`
  - `git rerere` docs: records conflict resolutions and replays them on identical conflicts

  **Acceptance Criteria**:
  - [ ] `git remote get-url upstream` outputs `https://github.com/streetwriters/notesnook.git`
  - [ ] `git config rerere.enabled` outputs `true`
  - [ ] `git rev-parse upstream/master` succeeds (upstream has been fetched)

  **QA Scenarios:**
  ```
  Scenario: Upstream remote is configured and fetched
    Tool: Bash
    Preconditions: Task 1 complete, working directory clean
    Steps:
      1. Run: git remote add upstream https://github.com/streetwriters/notesnook.git 2>/dev/null || true
      2. Run: git remote get-url upstream
      3. Assert: output is exactly 'https://github.com/streetwriters/notesnook.git'
      4. Run: git config rerere.enabled true
      5. Run: git config rerere.enabled
      6. Assert: output is 'true'
      7. Run: git fetch upstream
      8. Run: git rev-parse upstream/master
      9. Assert: exits with code 0 (commit hash returned)
    Expected Result: Remote configured, rerere enabled, upstream fetched
    Failure Indicators: 'fatal: No such remote' or fetch failures
    Evidence: .sisyphus/evidence/task-2-upstream-remote.txt
  ```

  **Commit**: NO

- [x] 3. Create Backup Branch

  **What to do**:
  - Create a backup of the current feature branch state: `git branch backup/onenote-indentation-pre-squash feat/onenote-indentation`
  - Verify the backup has the same HEAD as the feature branch
  - This is a SAFETY NET — if anything goes wrong during squashing, the full 37-commit history is preserved here AND on `feat/onenote-indentation`

  **Must NOT do**:
  - Do NOT checkout the backup branch
  - Do NOT delete any existing branches
  - Do NOT modify `feat/onenote-indentation`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, third)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:
  - Current HEAD of `feat/onenote-indentation`: `66fdf34cc`
  - This backup is permanent — never delete it

  **Acceptance Criteria**:
  - [ ] `git rev-parse backup/onenote-indentation-pre-squash` equals `git rev-parse feat/onenote-indentation`
  - [ ] `git log --oneline master..backup/onenote-indentation-pre-squash | wc -l` outputs `37`

  **QA Scenarios:**
  ```
  Scenario: Backup branch matches feature branch exactly
    Tool: Bash
    Preconditions: Tasks 1-2 complete
    Steps:
      1. Run: git branch backup/onenote-indentation-pre-squash feat/onenote-indentation
      2. Run: diff <(git rev-parse backup/onenote-indentation-pre-squash) <(git rev-parse feat/onenote-indentation)
      3. Assert: no output (hashes are identical)
      4. Run: git log --oneline master..backup/onenote-indentation-pre-squash | wc -l | tr -d ' '
      5. Assert: output is '37'
    Expected Result: Backup branch created, pointing to same commit as feature branch
    Failure Indicators: Different commit hashes or wrong commit count
    Evidence: .sisyphus/evidence/task-3-backup-branch.txt
  ```

  **Commit**: NO

- [ ] 4. Create Squashed Patch Commit

  **What to do**:
  - Checkout a NEW branch from master: `git checkout -b onenote-indentation-patch master`
  - Squash all feature branch changes onto it: `git merge --squash feat/onenote-indentation`
  - Unstage the 19 artifact files that must NOT be in the patch:
    ```bash
    git reset HEAD .sisyphus/ apps/mobile/package-lock.json apps/theme-builder/package-lock.json apps/web/package-lock.json tsconfig.tsbuildinfo
    ```
  - Restore/remove the unstaged artifact files so they don't pollute the working directory:
    ```bash
    git checkout -- apps/mobile/package-lock.json apps/theme-builder/package-lock.json apps/web/package-lock.json tsconfig.tsbuildinfo 2>/dev/null
    rm -rf .sisyphus/boulder.json .sisyphus/evidence/ .sisyphus/notepads/ .sisyphus/plans/onenote-indentation.md .sisyphus/test-indent.html 2>/dev/null
    ```
    Note: Some .sisyphus files may not exist on master so `checkout --` may fail for them; the `rm -rf` handles those.
  - Verify only the 33 correct files remain staged: `git diff --cached --name-only | wc -l` should be 33
  - Commit: `git commit -m "feat(editor): implement OneNote-style flat indentation lists"`
  - Verify the commit

  **Must NOT do**:
  - Do NOT use `git rebase -i` (interactive, forbidden)
  - Do NOT modify or delete `feat/onenote-indentation`
  - Do NOT include `.sisyphus/`, lockfiles, or `tsconfig.tsbuildinfo`
  - Do NOT use `--force` anywhere

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: Squash + selective staging requires precise git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, fourth)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References:**
  - `git merge --squash` documentation: creates a single commit from all changes on the source branch
  - The 19 files to exclude are listed in the Metis review (Context section above)

  **Files that SHOULD be in the patch (33 files):**
  All files under `packages/editor/` and `packages/core/` from the diff, specifically:
  - `packages/core/src/__tests__/migrations.test.ts` (new)
  - `packages/core/src/collections/content.ts` (modified)
  - `packages/core/src/migrations.ts` (modified)
  - `packages/editor/src/extension-imports.ts` (modified — 4 lines removed)
  - `packages/editor/src/extensions/block-indent/` (new directory — 6 files)
  - `packages/editor/src/extensions/clipboard/` (3 new files + 3 modified test files)
  - `packages/editor/src/extensions/key-map/` (2 modified files)
  - `packages/editor/src/extensions/list-item/tests/list-item.test.ts` (modified)
  - `packages/editor/src/extensions/list-marker/` (new directory — 5 files)
  - `packages/editor/src/index.ts` (modified)
  - `packages/editor/src/toolbar/tools/lists.tsx` (modified)
  - `packages/editor/src/utils/` (2 new files, 2 modified files)
  - `packages/editor/styles/styles.css` (modified — 155 lines added)

  **Acceptance Criteria**:
  - [ ] `git log --oneline master..onenote-indentation-patch | wc -l` outputs `1`
  - [ ] `git log --format='%s' -1 onenote-indentation-patch` outputs `feat(editor): implement OneNote-style flat indentation lists`
  - [ ] `git diff --name-only master..onenote-indentation-patch | wc -l` outputs `33`
  - [ ] `git diff --name-only master..onenote-indentation-patch | grep -c 'sisyphus\|package-lock\|tsbuildinfo'` outputs `0`
  - [ ] `git status --porcelain` outputs empty on the patch branch

  **QA Scenarios:**
  ```
  Scenario: Squashed commit contains exactly the right files
    Tool: Bash
    Preconditions: Tasks 1-3 complete, on feat/onenote-indentation branch
    Steps:
      1. Run: git checkout -b onenote-indentation-patch master
      2. Run: git merge --squash feat/onenote-indentation
      3. Run: git reset HEAD .sisyphus/ apps/mobile/package-lock.json apps/theme-builder/package-lock.json apps/web/package-lock.json tsconfig.tsbuildinfo
      4. Run: git checkout -- apps/mobile/package-lock.json apps/theme-builder/package-lock.json apps/web/package-lock.json tsconfig.tsbuildinfo 2>/dev/null; rm -rf .sisyphus/boulder.json .sisyphus/evidence/ .sisyphus/notepads/ .sisyphus/plans/onenote-indentation.md .sisyphus/test-indent.html 2>/dev/null; true
      5. Run: git diff --cached --name-only | wc -l | tr -d ' '
      6. Assert: output is '33'
      7. Run: git diff --cached --name-only | grep -c 'sisyphus\|package-lock\|tsbuildinfo'
      8. Assert: output is '0'
      9. Run: git commit -m "feat(editor): implement OneNote-style flat indentation lists"
      10. Run: git log --oneline master..onenote-indentation-patch | wc -l | tr -d ' '
      11. Assert: output is '1'
      12. Run: git status --porcelain
      13. Assert: empty output
    Expected Result: 1 commit, 33 files, no artifacts, clean working directory
    Failure Indicators: Wrong file count, artifact files present, or dirty working directory
    Evidence: .sisyphus/evidence/task-4-squash-commit.txt

  Scenario: No excluded files leaked into the patch
    Tool: Bash
    Preconditions: Squash commit created
    Steps:
      1. Run: git diff --name-only master..onenote-indentation-patch
      2. Assert: no line contains 'sisyphus', 'package-lock', or 'tsbuildinfo'
      3. Run: git diff --name-only master..onenote-indentation-patch | grep -E '^packages/(editor|core)/'
      4. Assert: all 33 files are under packages/editor/ or packages/core/
    Expected Result: All files are source code under packages/
    Failure Indicators: Any file outside packages/editor/ or packages/core/
    Evidence: .sisyphus/evidence/task-4-no-artifacts.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): implement OneNote-style flat indentation lists`
  - Files: 33 files (see list above)
  - Pre-commit: `git diff --cached --name-only | grep -c 'sisyphus\|package-lock\|tsbuildinfo'` must output `0`

- [ ] 5. Verify Patch Commit Integrity

  **What to do**:
  - Run ALL acceptance criteria as bash one-liners
  - Compare the diff of the squashed commit against the original branch diff (excluding artifacts) to ensure nothing was lost
  - Specifically verify:
    - Correct file count (33)
    - Correct commit count (1)
    - Correct commit message
    - No artifacts
    - Original branch still intact (37 commits)
    - Backup branch exists and matches original
    - Upstream remote configured
    - git rerere enabled
    - Working directory clean

  **Must NOT do**:
  - Do NOT modify any branches
  - Do NOT create any new commits

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, fifth)
  - **Blocks**: Task 6
  - **Blocked By**: Task 4

  **References**:
  - Compare: `git diff master..onenote-indentation-patch` vs `git diff master..feat/onenote-indentation -- packages/`

  **Acceptance Criteria**:
  - [ ] All acceptance checks pass (each is a bash command returning exit code 0)
  - [ ] Diff comparison shows no missing changes: `diff <(git diff master..onenote-indentation-patch) <(git diff master..feat/onenote-indentation -- ':!.sisyphus' ':!apps/*/package-lock.json' ':!tsconfig.tsbuildinfo')` outputs empty

  **QA Scenarios:**
  ```
  Scenario: All acceptance criteria pass
    Tool: Bash
    Preconditions: Task 4 complete
    Steps:
      1. Run: git remote get-url upstream 2>&1 | grep -q 'streetwriters/notesnook' && echo PASS || echo FAIL
      2. Run: test "$(git log --oneline master..onenote-indentation-patch | wc -l | tr -d ' ')" = "1" && echo PASS || echo FAIL
      3. Run: git log --format='%s' -1 onenote-indentation-patch | grep -q 'feat(editor): implement OneNote-style flat indentation lists' && echo PASS || echo FAIL
      4. Run: test "$(git diff --name-only master..onenote-indentation-patch | grep -c 'sisyphus\|package-lock\|tsbuildinfo')" = "0" && echo PASS || echo FAIL
      5. Run: test "$(git diff --name-only master..onenote-indentation-patch | wc -l | tr -d ' ')" = "33" && echo PASS || echo FAIL
      6. Run: git rev-parse feat/onenote-indentation >/dev/null 2>&1 && echo PASS || echo FAIL
      7. Run: git config rerere.enabled | grep -q true && echo PASS || echo FAIL
      8. Assert: ALL outputs are PASS
    Expected Result: 7 PASS lines, 0 FAIL lines
    Failure Indicators: Any line says FAIL
    Evidence: .sisyphus/evidence/task-5-acceptance-check.txt

  Scenario: Diff content matches original (no changes lost)
    Tool: Bash
    Preconditions: Task 4 complete
    Steps:
      1. Run: diff <(git diff master..onenote-indentation-patch) <(git diff master..feat/onenote-indentation -- ':!.sisyphus' ':!apps/*/package-lock.json' ':!tsconfig.tsbuildinfo') | head -20
      2. Assert: no output (diffs are identical)
    Expected Result: Empty output — the squashed commit preserves all source changes exactly
    Failure Indicators: Any diff output means changes were lost or extra changes leaked in
    Evidence: .sisyphus/evidence/task-5-diff-comparison.txt
  ```

  **Commit**: NO

- [ ] 6. Create sync-upstream.sh Helper Script

  **What to do**:
  Create `scripts/sync-upstream.sh` — a defensive, verbose bash script that:

  1. **Safety checks**:
     - `set -euo pipefail` — halt on any error
     - Check working directory is clean (`git status --porcelain`), refuse if dirty
     - Check currently on `onenote-indentation-patch` branch, refuse if not
     - Check exactly 1 commit ahead of master, refuse if not (prevents accidental extra commits)

  2. **Setup** (idempotent):
     - Check/add `upstream` remote -> `https://github.com/streetwriters/notesnook.git`
     - Enable `git rerere` (if not already)

  3. **Backup**:
     - Create timestamped backup branch: `backup/patch-YYYYMMDD-HHMMSS`
     - Print: "Backup created: backup/patch-YYYYMMDD-HHMMSS"

  4. **Fetch & update master**:
     - `git fetch upstream`
     - `git checkout master`
     - `git merge --ff-only upstream/master` (fast-forward only; fail if diverged)
     - `git checkout onenote-indentation-patch`

  5. **Rebase**:
     - `git rebase --onto master HEAD~1` (move the single patch commit onto updated master)
     - On success: print summary ("Patch rebased successfully onto [commit hash]")

  6. **On conflict**: DO NOT auto-resolve. Instead:
     - Print which files conflicted
     - For each known high-risk file, print what the patch does to it:
       - `packages/editor/src/index.ts`: "Adds imports for BlockIndent, ListMarker extensions and registers them"
       - `packages/editor/src/extension-imports.ts`: "Removes 4 old list extension imports"
       - `packages/core/src/migrations.ts`: "Adds nested-to-flat list migration at version [N] — you may need to renumber this if upstream added new migrations"
       - `packages/editor/src/extensions/key-map/key-map.ts`: "Adds Tab/Shift-Tab indent/outdent keybindings"
     - Print exact commands:
       - To continue after resolving: `git add -A && git rebase --continue`
       - To abort and restore backup: `git rebase --abort && git checkout onenote-indentation-patch && git reset --hard backup/patch-YYYYMMDD-HHMMSS`

  7. **Post-rebase instructions** (printed, not executed):
     - "Run: npm install"
     - "Run: npm test (or your test command)"
     - "Run: git push origin onenote-indentation-patch --force-with-lease"
     - (Note: `--force-with-lease` is safer than `--force`)

  **Must NOT do**:
  - Script must NOT auto-push
  - Script must NOT auto-resolve conflicts
  - Script must NOT use interactive commands (`-i` flags)
  - Script must NOT modify the original `feat/onenote-indentation` branch
  - Script must NOT use `--force` (only `--force-with-lease` in the printed suggestion)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`git-master`]
    - `git-master`: Script involves advanced git operations (rebase --onto, rerere, ff-only merge)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2, first)
  - **Blocks**: Task 7
  - **Blocked By**: Task 5

  **References**:

  **Pattern References:**
  - `git rebase --onto` documentation: moves commits to a new base
  - `git rerere` documentation: records and replays conflict resolutions
  - `git merge --ff-only` documentation: fast-forward merge that fails if not possible

  **High-risk files to document in the script's conflict guidance:**
  - `packages/editor/src/index.ts:1-23` — editor extension registration (imports + array)
  - `packages/editor/src/extension-imports.ts` — old list extension imports removed
  - `packages/core/src/migrations.ts` — migration version registry
  - `packages/editor/src/extensions/key-map/key-map.ts` — keybinding integration

  **Acceptance Criteria**:
  - [ ] `test -x scripts/sync-upstream.sh` (file exists and is executable)
  - [ ] `head -5 scripts/sync-upstream.sh | grep -q 'set -euo pipefail'` (safety flag present)
  - [ ] `grep -q 'force-with-lease' scripts/sync-upstream.sh` (uses safe push suggestion)
  - [ ] `grep -q 'rebase --onto' scripts/sync-upstream.sh` (correct rebase strategy)
  - [ ] `grep -c 'git push' scripts/sync-upstream.sh` outputs lines that are all inside echo/print statements (never executed directly)
  - [ ] `shellcheck scripts/sync-upstream.sh` passes (if shellcheck is available)
  - [ ] Script contains conflict guidance for all 4 high-risk files

  **QA Scenarios:**
  ```
  Scenario: Script has all required safety checks
    Tool: Bash
    Preconditions: Script created at scripts/sync-upstream.sh
    Steps:
      1. Run: grep -c 'set -euo pipefail' scripts/sync-upstream.sh
      2. Assert: output >= 1
      3. Run: grep -c 'git status --porcelain' scripts/sync-upstream.sh
      4. Assert: output >= 1 (checks for clean working directory)
      5. Run: grep -c 'backup/patch-' scripts/sync-upstream.sh
      6. Assert: output >= 1 (creates backup)
      7. Run: grep -c 'rebase --onto' scripts/sync-upstream.sh
      8. Assert: output >= 1 (correct rebase strategy)
      9. Run: grep -c 'force-with-lease' scripts/sync-upstream.sh
      10. Assert: output >= 1 (safe push suggestion)
      11. Run: grep -c 'ff-only' scripts/sync-upstream.sh
      12. Assert: output >= 1 (safe master update)
    Expected Result: All checks >= 1
    Failure Indicators: Any check returns 0
    Evidence: .sisyphus/evidence/task-6-script-checks.txt

  Scenario: Script contains conflict guidance for high-risk files
    Tool: Bash
    Preconditions: Script created
    Steps:
      1. Run: grep -c 'index.ts' scripts/sync-upstream.sh
      2. Run: grep -c 'extension-imports.ts' scripts/sync-upstream.sh
      3. Run: grep -c 'migrations.ts' scripts/sync-upstream.sh
      4. Run: grep -c 'key-map.ts' scripts/sync-upstream.sh
      5. Assert: all outputs >= 1
    Expected Result: All 4 high-risk files are documented in conflict guidance
    Failure Indicators: Any file not mentioned
    Evidence: .sisyphus/evidence/task-6-conflict-guidance.txt

  Scenario: Script does NOT auto-push (safety)
    Tool: Bash
    Preconditions: Script created
    Steps:
      1. Run: grep 'git push' scripts/sync-upstream.sh | grep -v 'echo\|printf\|print\|#'
      2. Assert: no output (all push commands are inside echo/print statements or comments)
    Expected Result: Zero lines where 'git push' is executed directly
    Failure Indicators: Any uncommented, non-echoed 'git push' line
    Evidence: .sisyphus/evidence/task-6-no-autopush.txt
  ```

  **Commit**: YES — amend the patch commit to include the script
  - Run: `git add scripts/sync-upstream.sh && git commit --amend --no-edit`
  - This keeps everything in a single commit for clean rebasing
  - Files: `scripts/sync-upstream.sh`

- [ ] 7. Final Verification

  **What to do**:
  - Re-run all acceptance criteria now that the script is included in the commit
  - The file count should now be 34 (33 source files + 1 script)
  - Verify:
    - Patch branch: 1 commit, 34 files, correct message
    - No artifacts in diff
    - Original branch: 37 commits, untouched
    - Backup branch: exists, matches original
    - Upstream remote: configured
    - git rerere: enabled
    - Script: exists, executable, passes checks
    - Working directory: clean

  **Must NOT do**:
  - Do NOT modify anything — this is verification only

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2, second)
  - **Blocks**: F1, F2
  - **Blocked By**: Task 6

  **References**:
  - All acceptance criteria from Tasks 4, 5, and 6
  - Updated file count: 34 (includes scripts/sync-upstream.sh)

  **Acceptance Criteria**:
  - [ ] `git log --oneline master..onenote-indentation-patch | wc -l` = `1`
  - [ ] `git diff --name-only master..onenote-indentation-patch | wc -l` = `34`
  - [ ] `git diff --name-only master..onenote-indentation-patch | grep -c 'sisyphus\|package-lock\|tsbuildinfo'` = `0`
  - [ ] `git diff --name-only master..onenote-indentation-patch | grep -q 'scripts/sync-upstream.sh'` exits 0
  - [ ] `git rev-parse feat/onenote-indentation` exits 0
  - [ ] `git log --oneline master..feat/onenote-indentation | wc -l` = `37`
  - [ ] `test -x scripts/sync-upstream.sh` exits 0
  - [ ] `git status --porcelain` is empty

  **QA Scenarios:**
  ```
  Scenario: Complete end-to-end verification
    Tool: Bash
    Preconditions: All previous tasks complete
    Steps:
      1. Run all 8 acceptance criteria above as one script
      2. Collect PASS/FAIL for each
      3. Assert: 8/8 PASS
    Expected Result: All checks pass
    Failure Indicators: Any FAIL
    Evidence: .sisyphus/evidence/task-7-final-verification.txt
  ```

  **Commit**: NO

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 2 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. Verify:

  - `onenote-indentation-patch` branch exists with exactly 1 commit
  - No excluded files (`.sisyphus/`, lockfiles, `tsconfig.tsbuildinfo`) in the diff
  - `feat/onenote-indentation` branch untouched (still 37 commits)
  - `upstream` remote configured correctly
  - `scripts/sync-upstream.sh` exists, is executable, contains `set -euo pipefail`
  - `git rerere` is enabled
  - Working directory is clean
    Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Scope Fidelity Check** — `deep`
      Verify nothing was done beyond the plan scope:
  - No `.gitignore` modifications
  - No CI/CD files created
  - No git hooks installed
  - Original branch not modified (compare `git rev-parse feat/onenote-indentation` before and after)
  - Script doesn't contain auto-push or force-push logic
  - No extra commits on any branch beyond what's specified
    Output: `Scope [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Task 4**: `feat(editor): implement OneNote-style flat indentation lists` — the squashed patch commit (33 files)
- **Task 6**: The sync script is added to the patch branch — `git add scripts/sync-upstream.sh && git commit --amend --no-edit` to include it in the single patch commit. Alternatively, leave it as a separate commit if amending is risky.

> **Decision**: The sync script should be part of the patch commit so it travels with the rebase. This means Task 6 must amend the squash commit. The backup already exists, so this is safe.

---

## Success Criteria

### Verification Commands

```bash
# Patch branch has exactly 1 commit
git log --oneline master..onenote-indentation-patch | wc -l  # Expected: 1

# Correct number of files
git diff --name-only master..onenote-indentation-patch | wc -l  # Expected: 34 (33 source + 1 script)

# No artifacts in patch
git diff --name-only master..onenote-indentation-patch | grep -c 'sisyphus\|package-lock\|tsbuildinfo'  # Expected: 0

# Original branch preserved
git rev-parse feat/onenote-indentation  # Expected: 66fdf34cc...

# Script exists and is executable
test -x scripts/sync-upstream.sh && echo "OK"  # Expected: OK

# Upstream remote configured
git remote get-url upstream  # Expected: https://github.com/streetwriters/notesnook.git

# git rerere enabled
git config rerere.enabled  # Expected: true

# Clean working directory
git status --porcelain | wc -l  # Expected: 0
```

### Final Checklist

- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Working directory clean
- [ ] Both branches (original + patch) exist and are correct
