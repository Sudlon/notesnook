#!/usr/bin/env bash
set -euo pipefail

# sync-upstream.sh
# Helper script to sync OneNote indentation patch with upstream notesnook changes
# This script rebases the single-commit patch onto the latest upstream/master

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Sync Upstream: OneNote Indentation Patch"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# SAFETY CHECKS
# ============================================================================

echo "[1/7] Running safety checks..."

# Check 1: Clean working directory
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ ERROR: Working directory is dirty"
  echo ""
  echo "Uncommitted changes detected. Commit or stash them first:"
  echo "  git status"
  echo "  git add -A && git commit -m 'your message'"
  echo "  # OR: git stash"
  exit 1
fi
echo "  ✓ Working directory is clean"

# Check 2: On correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "onenote-indentation-patch" ]; then
  echo "❌ ERROR: Not on onenote-indentation-patch branch"
  echo ""
  echo "Currently on: $CURRENT_BRANCH"
  echo "Switch to the patch branch first:"
  echo "  git checkout onenote-indentation-patch"
  exit 1
fi
echo "  ✓ On onenote-indentation-patch branch"

# Check 3: Exactly 1 commit ahead of master
COMMIT_COUNT=$(git log --oneline master..onenote-indentation-patch | wc -l | tr -d ' ')
if [ "$COMMIT_COUNT" != "1" ]; then
  echo "❌ ERROR: Expected exactly 1 commit ahead of master, found: $COMMIT_COUNT"
  echo ""
  echo "This script is designed for a single-commit patch only."
  echo "Your branch has diverged. Manual intervention required."
  exit 1
fi
echo "  ✓ Exactly 1 commit ahead of master"

echo ""

# ============================================================================
# SETUP (IDEMPOTENT)
# ============================================================================

echo "[2/7] Checking setup..."

# Check/add upstream remote
if ! git remote get-url upstream &>/dev/null; then
  echo "  Adding upstream remote..."
  git remote add upstream https://github.com/streetwriters/notesnook.git
  echo "  ✓ Upstream remote added"
else
  echo "  ✓ Upstream remote exists"
fi

# Enable git rerere
if [ "$(git config rerere.enabled || echo 'false')" != "true" ]; then
  echo "  Enabling git rerere (reuse recorded resolutions)..."
  git config rerere.enabled true
  echo "  ✓ git rerere enabled"
else
  echo "  ✓ git rerere already enabled"
fi

echo ""

# ============================================================================
# CREATE TIMESTAMPED BACKUP
# ============================================================================

echo "[3/7] Creating backup..."

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_BRANCH="backup/patch-$TIMESTAMP"
git branch "$BACKUP_BRANCH"
echo "  ✓ Backup created: $BACKUP_BRANCH"

echo ""

# ============================================================================
# FETCH & UPDATE MASTER
# ============================================================================

echo "[4/7] Fetching upstream..."
git fetch upstream

echo ""
echo "[5/7] Updating master branch..."
git checkout master

if ! git merge --ff-only upstream/master; then
  echo "❌ ERROR: Cannot fast-forward master"
  echo ""
  echo "Your local master has diverged from upstream/master."
  echo "This requires manual intervention:"
  echo "  1. Check what changes exist: git log master..upstream/master"
  echo "  2. Reset to upstream: git reset --hard upstream/master"
  echo "  3. Re-run this script"
  echo ""
  echo "Backup preserved: $BACKUP_BRANCH"
  exit 1
fi

MASTER_HEAD=$(git rev-parse --short master)
echo "  ✓ Master updated to: $MASTER_HEAD"

echo ""
echo "[6/7] Switching back to patch branch..."
git checkout onenote-indentation-patch

echo ""

# ============================================================================
# REBASE
# ============================================================================

echo "[7/7] Rebasing patch onto updated master..."
echo ""

if git rebase --onto master HEAD~1; then
  NEW_BASE=$(git rev-parse --short master)
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ REBASE COMPLETE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Patch rebased successfully onto master ($NEW_BASE)"
  echo ""
  echo "Next steps (run these manually):"
  echo ""
  echo "  1. npm install"
  echo "     (Update dependencies after upstream changes)"
  echo ""
  echo "  2. npm test"
  echo "     (Verify all tests pass)"
  echo ""
  echo "  3. git push origin onenote-indentation-patch --force-with-lease"
  echo "     (Push rebased commit to remote)"
  echo ""
  echo "NOTE: --force-with-lease is safer than --force"
  echo "      (refuses push if remote changed unexpectedly)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  # Rebase failed - conflicts detected
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  REBASE CONFLICT DETECTED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Conflicted files:"
  git diff --name-only --diff-filter=U || echo "(Unable to list conflicted files)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "CONFLICT RESOLUTION GUIDE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "High-risk files and what this patch does:"
  echo ""
  echo "1. packages/editor/src/index.ts"
  echo "   What patch does:"
  echo "     → Adds imports for BlockIndent, ListMarker extensions"
  echo "     → Registers them in the extensions array"
  echo "   Resolution tip:"
  echo "     → Keep both upstream changes AND patch changes"
  echo "     → Add patch imports to the import section"
  echo "     → Add patch extensions to the array"
  echo ""
  echo "2. packages/editor/src/extension-imports.ts"
  echo "   What patch does:"
  echo "     → Removes 4 old list extension imports:"
  echo "       - CheckListItem"
  echo "       - OrderedList"
  echo "       - UnorderedList"
  echo "       - ListKeymap"
  echo "   Resolution tip:"
  echo "     → Keep upstream changes"
  echo "     → Then remove the 4 old imports listed above"
  echo ""
  echo "3. packages/core/src/migrations.ts"
  echo "   What patch does:"
  echo "     → Adds nested-to-flat list migration at version [N]"
  echo "   Resolution tip:"
  echo "     → **IMPORTANT**: Migration versions are sequential"
  echo "     → Check if upstream added new migrations"
  echo "     → RENUMBER the patch migration to come AFTER upstream migrations"
  echo "     → Update version number in migrations array"
  echo ""
  echo "4. packages/editor/src/extensions/key-map/key-map.ts"
  echo "   What patch does:"
  echo "     → Adds Tab/Shift-Tab keybindings"
  echo "     → Maps to indent/outdent commands"
  echo "   Resolution tip:"
  echo "     → Keep both upstream changes AND patch changes"
  echo "     → Add patch keybindings to the keymap"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "RESOLUTION WORKFLOW"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Open each conflicted file in your editor"
  echo "2. Look for conflict markers: <<<<<< ====== >>>>>>"
  echo "3. Resolve conflicts using the guide above"
  echo "4. Remove conflict markers"
  echo "5. Stage resolved files:"
  echo "     git add -A"
  echo "6. Continue rebase:"
  echo "     git rebase --continue"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TO ABORT AND RESTORE BACKUP"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "If you want to start over:"
  echo "  git rebase --abort"
  echo "  git reset --hard $BACKUP_BRANCH"
  echo ""
  echo "Your backup branch is preserved: $BACKUP_BRANCH"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
