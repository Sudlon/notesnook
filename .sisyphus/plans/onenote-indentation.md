# OneNote-Style Indentation Overhaul

## TL;DR

> **Quick Summary**: Decouple indentation from list structure in the Notesnook editor, replacing ProseMirror's nested list model with a flat block-level `indent` attribute. List markers become visual decorations independent of indent level, matching OneNote's behavior.
>
> **Deliverables**:
>
> - New `blockIndent` TipTap extension with global `indent` attribute on all block nodes
> - New `listMarker` attribute system replacing nested list nodes for bullet/ordered/check lists
> - Reworked Tab/Shift-Tab to always indent/outdent (never insert \t, never nest lists)
> - Updated toolbar with universal indent/outdent buttons
> - OneNote-style ordered list numbering (1. → a. → i. per indent level)
> - HTML export serializer that reconstructs nested `<ul>/<ol>/<li>` from flat model
> - HTML import parser that converts nested lists to flat indent model
> - Data migration utility for existing notes
> - Comprehensive TDD test suite
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 5 → Task 9 → Task 12 → Final Verification

---

## Context

### Original Request

User wants indentation behavior like OneNote: all block types (bullet, checklist, normal text) can be indented independently, and changing type between them never affects indentation. Indentation levels can be arbitrary per line (jump from level 1 to level 5 to level 3). Tab/Shift-Tab should purely control indentation. List markers are just visual decorations at the start of a line.

### Interview Summary

**Key Discussions**:

- **Backward compatibility**: Must render identically — existing notes with nested lists need careful migration
- **Scope of list types**: Bullet, ordered, and check lists get the new flat model. Task list (progress tracking) and outline list (collapsible) stay nested
- **Ordered list numbering**: OneNote-style — each indent level has its own counter, sub-levels use different formats (1. → a. → i.)
- **Max indent level**: No limit
- **HTML export**: Reconstruct nested `<ul>/<ol>/<li>` for clipboard/export interoperability
- **Markdown export**: Indented list syntax (spaces before marker)
- **Paste behavior**: Auto-convert nested HTML lists to flat indent on paste
- **Testing**: TDD approach with Vitest

**Research Findings**:

- Notes stored as HTML strings (`type: "tiptap"`, `data: "<p>...</p>"`) — migration is HTML string transformation
- Current architecture uses ProseMirror nested list nodes; `sinkListItem`/`liftListItem` for Tab; Tab outside lists inserts literal `\t`
- Multiple production TipTap editors implement flat indentation via `addGlobalAttributes()` with `data-indent` attribute (element-tiptap, AiEditor, PPTist)
- Custom `ClipboardDOMSerializer`/`ClipboardDOMParser` in `packages/editor/src/extensions/clipboard/`
- Test infrastructure: Vitest, `createEditor()` helper, snapshot-based assertions with `getHTML()`

### Self-Identified Gaps (Metis substitute)

**Addressed in plan**:

- **Undo/redo coherence**: Indent changes via attribute must work cleanly with ProseMirror history — addressed by using standard `tr.setNodeMarkup()` which integrates with history
- **Collaborative editing**: Attribute-based indent changes create simpler OT operations than tree restructuring — net positive
- **Mixed content**: What happens when selection spans blocks at different indent levels and user presses Tab? — Increment all selected blocks by 1
- **Task/outline list coexistence**: When a flat-indent block is adjacent to a nested task list, Tab behavior must context-switch correctly
- **CSS rendering**: Indent must not conflict with existing text-align, text-direction attributes
- **Blockquote interaction**: Blockquotes should also get indent support (they're block nodes)

---

## Work Objectives

### Core Objective

Replace the nested list DOM structure (bulletList → listItem → paragraph) with a flat model where every block node has an `indent` attribute and list markers are separate visual decorations. Tab/Shift-Tab always modify the indent attribute.

### Concrete Deliverables

- `packages/editor/src/extensions/block-indent/` — New TipTap extension
- `packages/editor/src/extensions/list-marker/` — New list marker decoration system
- Updated `packages/editor/src/extensions/key-map/key-map.ts` — Tab/Shift-Tab remapping
- Updated `packages/editor/src/extensions/clipboard/` — Flat↔nested serialization
- Updated `packages/editor/src/toolbar/tools/lists.tsx` — Universal indent/outdent
- `packages/editor/src/utils/indent-migration.ts` — HTML migration utility
- Updated CSS for indent rendering
- Test files for all new functionality

### Definition of Done

- [ ] `npx vitest run` passes all new and existing tests in packages/editor
- [ ] Existing notes with nested lists render identically after migration
- [ ] Tab/Shift-Tab indent/outdent works on paragraphs, headings, bullets, ordered lists, check lists
- [ ] Changing list type (bullet → ordered → check → plain) preserves indent level
- [ ] Arbitrary indent jumps work (indent 0 → 5 → 2)
- [ ] Copy/paste from external HTML with nested lists produces correct flat indent
- [ ] Export to clipboard produces valid nested HTML lists
- [ ] Task list and outline list behavior unchanged

### Must Have

- Block-level `indent` attribute on paragraph, heading, blockquote, and list-marker blocks
- Tab = increment indent, Shift-Tab = decrement indent (on all block types)
- List type switching preserves indent level
- Ordered list numbering per indent level with format variation (1. → a. → i.)
- HTML export reconstructs nested `<ul>/<ol>/<li>` structure
- Paste auto-converts nested HTML lists to flat indent
- Data migration for existing notes (nested → flat HTML)
- TDD: tests written before implementation for each feature

### Must NOT Have (Guardrails)

- Do NOT modify task list (taskList/taskItem) behavior — keep nested
- Do NOT modify outline list (outlineList/outlineListItem) behavior — keep nested
- Do NOT change table or code block Tab behavior
- Do NOT add a max indent level cap (unlimited by design)
- Do NOT use `prosemirror-flat-list` library — use native TipTap `addGlobalAttributes()` approach
- Do NOT store indent as CSS inline style only — must use `data-indent` HTML attribute for persistence
- Do NOT create new npm dependencies for this feature (use existing ProseMirror/TipTap APIs)
- Do NOT break existing keyboard shortcuts other than Tab/Shift-Tab
- Do NOT use block-level marks (ProseMirror rejects them) — use node attributes only
- Do NOT change how non-list content is exported to Markdown (only list-related Markdown affected)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: TDD (tests first)
- **Framework**: Vitest (`npx vitest run` in packages/editor)
- **Each task follows**: RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Editor behavior**: Use Playwright — load editor, type content, press Tab, assert DOM structure
- **Unit/integration**: Use Bash (vitest) — run test suites, verify pass counts
- **Migration**: Use Bash (node script) — transform sample HTML, diff output
- **Clipboard**: Use Playwright — copy content, paste into external target, verify HTML

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — types, schema, test infrastructure):
├── Task 1: Block indent extension + tests [deep]
├── Task 2: List marker attribute system + tests [deep]
├── Task 3: CSS rendering for indent levels [quick]
└── Task 4: Migration utility (nested HTML → flat HTML) + tests [deep]

Wave 2 (Core behavior — depends on Wave 1):
├── Task 5: Tab/Shift-Tab keybinding rework + tests (depends: 1, 2) [deep]
├── Task 6: List type toggle commands + tests (depends: 1, 2) [deep]
├── Task 7: Ordered list numbering logic + tests (depends: 2) [ultrabrain]
└── Task 8: Toolbar updates (depends: 1, 2) [visual-engineering]

Wave 3 (Serialization & interop — depends on Wave 2):
├── Task 9: Clipboard DOM serializer (flat → nested HTML) + tests (depends: 1, 2) [deep]
├── Task 10: Clipboard DOM parser (nested HTML → flat) + tests (depends: 1, 2) [deep]
├── Task 11: Markdown export updates + tests (depends: 2) [unspecified-high]
└── Task 12: Data migration integration + tests (depends: 4) [deep]

Wave 4 (Integration & cleanup — depends on Wave 3):
├── Task 13: Remove/refactor old list extensions + tests (depends: 1-12) [deep]
├── Task 14: Task/outline list coexistence testing (depends: 5, 13) [unspecified-high]
└── Task 15: Edge cases & regression tests (depends: all) [deep]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 5 → Task 9 → Task 12 → Task 13 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (all waves)
```

### Dependency Matrix

| Task | Depends On  | Blocks                    | Wave |
| ---- | ----------- | ------------------------- | ---- |
| 1    | —           | 5, 6, 8, 10, 13           | 1    |
| 2    | —           | 5, 6, 7, 8, 9, 10, 11, 13 | 1    |
| 3    | —           | 8                         | 1    |
| 4    | —           | 12                        | 1    |
| 5    | 1, 2        | 13, 14                    | 2    |
| 6    | 1, 2        | 9, 13                     | 2    |
| 7    | 2           | 15                        | 2    |
| 8    | 1, 2, 3     | —                         | 2    |
| 9    | 1, 2        | 13                        | 3    |
| 10   | 1, 2        | 13                        | 3    |
| 11   | 2           | —                         | 3    |
| 12   | 4           | 13                        | 3    |
| 13   | 1-12        | 14, 15                    | 4    |
| 14   | 5, 13       | —                         | 4    |
| 15   | all         | —                         | 4    |

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** — T1 → `deep`, T2 → `deep`, T3 → `quick`, T4 → `deep`
- **Wave 2**: **4 tasks** — T5 → `deep`, T6 → `deep`, T7 → `ultrabrain`, T8 → `visual-engineering`
- **Wave 3**: **4 tasks** — T9 → `deep`, T10 → `deep`, T11 → `unspecified-high`, T12 → `deep`
- **Wave 4**: **3 tasks** — T13 → `deep`, T14 → `unspecified-high`, T15 → `deep`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs


- [ ] 1. Block Indent Extension (TipTap `addGlobalAttributes`)

  **What to do**:
  - Create new TipTap extension at `packages/editor/src/extensions/block-indent/block-indent.ts`
  - Use `addGlobalAttributes()` to add an `indent` attribute (default: 0) to these node types: `paragraph`, `heading`, `blockquote`
  - `parseHTML`: Read `data-indent` attribute from DOM element, parse as integer, default 0
  - `renderHTML`: Output `data-indent` attribute AND `style: padding-left: ${indent * 2}em` for visual rendering
  - Add `indent()` command: increment indent of all selected blocks by 1
  - Add `outdent()` command: decrement indent of all selected blocks by 1 (min 0)
  - Add `setIndent(level)` command: set indent of all selected blocks to specific level
  - Handle multi-block selection: when selection spans multiple blocks, apply indent change to ALL of them
  - Export extension from `packages/editor/src/extensions/block-indent/index.ts`
  - Write TDD tests first in `packages/editor/src/extensions/block-indent/__tests__/block-indent.test.ts`
  - Test cases:
    - Paragraph at indent 0, call indent() → indent becomes 1
    - Paragraph at indent 3, call outdent() → indent becomes 2
    - Paragraph at indent 0, call outdent() → stays at 0 (no negative)
    - Multi-block selection: indent increments all selected blocks
    - setIndent(5) sets indent to 5
    - getHTML() outputs `<p data-indent="2">...</p>` format
    - parseHTML correctly reads `<p data-indent="3">text</p>` → indent attribute = 3
    - Indent attribute does NOT conflict with existing `textAlign`, `textDirection` attributes

  **Must NOT do**:
  - Do NOT add indent to task list items, outline list items, table cells, or code blocks
  - Do NOT impose a max indent level
  - Do NOT use inline CSS only (must have data-indent attribute for persistence)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core infrastructure extension with TDD, requires understanding ProseMirror schema and TipTap extension API deeply
  - **Skills**: []
    - No special skills needed — pure TypeScript/ProseMirror work
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — this is unit test work, not browser automation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6, 8, 10, 13
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/editor/src/extensions/paragraph/paragraph.ts` — How existing block nodes define attributes (`spacing`, `textDirection`) and `parseHTML`/`renderHTML`. Follow this pattern for the indent attribute.
  - `packages/editor/src/extensions/heading/heading.ts` — Another block node with custom attributes. Shows how to extend TipTap's heading extension with additional attrs.
  - `packages/editor/src/extensions/block-id/__tests__/block-id.test.ts` — Test pattern for a global attribute extension. Shows how to test attributes applied across node types.

  **API/Type References**:
  - `@tiptap/core` `addGlobalAttributes()` API — This is the key API. It allows adding attributes to multiple node types from a single extension without modifying each node type individually.
  - `packages/editor/src/utils/prosemirror.ts` — Utility functions like `getParentAttributes()` that propagate attributes during transforms. May need to ensure indent is included.

  **Test References**:
  - `packages/editor/src/extensions/list-item/tests/list-item.test.ts` — Shows test structure: `createEditor()`, DOM helpers `h()`, `p()`, `ul()`, `li()`, snapshot assertions with `getHTML()`.
  - `packages/editor/test-utils/index.js` — The test helper that creates editor instances. Use this to create test editors with the new extension.

  **External References**:
  - element-tiptap indent extension pattern: `addGlobalAttributes()` with `data-indent` + CSS padding-left. This is the proven production pattern to follow.

  **WHY Each Reference Matters**:
  - `paragraph.ts` / `heading.ts`: Shows how Notesnook extends TipTap nodes — follow the same file structure, attribute definition pattern, and parseHTML/renderHTML style
  - `block-id.test.ts`: Shows how to test a global attribute that spans multiple node types — the exact testing pattern needed here
  - `list-item.test.ts`: Shows `createEditor()` usage and snapshot testing — the test infrastructure to use
  - `prosemirror.ts` utils: `getParentAttributes()` is called when toggling lists and must include the indent attribute for preservation during type changes

  **Acceptance Criteria**:

  - [ ] Test file created: `packages/editor/src/extensions/block-indent/__tests__/block-indent.test.ts`
  - [ ] `npx vitest run src/extensions/block-indent` → PASS (8+ tests, 0 failures)
  - [ ] Extension file created: `packages/editor/src/extensions/block-indent/block-indent.ts`
  - [ ] Index file created: `packages/editor/src/extensions/block-indent/index.ts`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Indent command increases indent level on paragraph
    Tool: Bash (vitest)
    Preconditions: Editor initialized with `<p>Hello world</p>`
    Steps:
      1. Run `npx vitest run src/extensions/block-indent` in packages/editor
      2. Verify test "indent() increments paragraph indent from 0 to 1" passes
      3. Verify test output shows `<p data-indent="1">Hello world</p>`
    Expected Result: All indent tests pass, HTML output contains data-indent attribute
    Failure Indicators: Test failure, missing data-indent in rendered HTML, attribute not parsed from HTML
    Evidence: .sisyphus/evidence/task-1-indent-command.txt

  Scenario: Outdent at indent 0 does not go negative
    Tool: Bash (vitest)
    Preconditions: Editor initialized with `<p>Text</p>` (indent 0)
    Steps:
      1. Call outdent() command
      2. Verify indent remains 0, not -1
    Expected Result: Indent stays at 0, no error thrown
    Failure Indicators: Negative indent value, error in console
    Evidence: .sisyphus/evidence/task-1-outdent-floor.txt
  ```

  **Evidence to Capture:**
  - [ ] task-1-indent-command.txt — vitest output showing all indent tests pass
  - [ ] task-1-outdent-floor.txt — vitest output confirming 0-floor behavior

  **Commit**: YES
  - Message: `feat(editor): add block indent extension with global indent attribute`
  - Files: `packages/editor/src/extensions/block-indent/*`
  - Pre-commit: `npx vitest run src/extensions/block-indent`

- [ ] 2. List Marker Attribute System

  **What to do**:
  - Create new TipTap extension at `packages/editor/src/extensions/list-marker/list-marker.ts`
  - Add a `listType` global attribute to `paragraph`, `heading` node types
  - `listType` values: `null` (no marker), `"bullet"`, `"ordered"`, `"check"`
  - For `check` type, add a `checked` attribute (boolean, default false)
  - For `ordered` type, the number is computed at render-time (not stored) — see Task 7
  - `parseHTML`: Detect list type from DOM structure:
    - `<p data-list-type="bullet">` → listType = "bullet"
    - `<p data-list-type="ordered">` → listType = "ordered"
    - `<p data-list-type="check" data-checked="true">` → listType = "check", checked = true
    - Also parse legacy HTML: `<ul><li><p>text</p></li></ul>` → paragraph with listType="bullet" (handled in Task 10, but parseHTML rules needed here)
  - `renderHTML`: Output `data-list-type` attribute, and for check type also `data-checked`
  - Add commands:
    - `toggleBulletMarker()`: Toggle bullet marker on selected blocks
    - `toggleOrderedMarker()`: Toggle ordered marker on selected blocks
    - `toggleCheckMarker()`: Toggle check marker on selected blocks
    - `setListType(type)`: Set marker type explicitly
    - `toggleChecked()`: Toggle checked state on check-type blocks
  - When toggling: if block already has the same listType, remove it (set to null). If different, switch to new type.
  - **CRITICAL**: Toggling list type must NEVER change the indent attribute
  - Write TDD tests first
  - Test cases:
    - Toggle bullet on plain paragraph → listType becomes "bullet", indent unchanged
    - Toggle bullet on bullet paragraph → listType becomes null (toggled off)
    - Toggle ordered on bullet paragraph → listType becomes "ordered", indent unchanged
    - Toggle check on paragraph at indent 3 → listType = "check", indent stays 3
    - toggleChecked() on check item → checked toggles
    - getHTML() outputs correct data attributes
    - parseHTML reads data-list-type correctly

  **Must NOT do**:
  - Do NOT create nested list wrapper nodes (no bulletList/orderedList wrapper nodes)
  - Do NOT change indent when toggling list type
  - Do NOT compute ordered numbers in this task (that's Task 7)
  - Do NOT handle rendering of markers visually in this task (CSS is Task 3, numbering is Task 7)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core schema work with TDD, needs careful attribute design that will be used by many downstream tasks
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5, 6, 7, 8, 9, 10, 11, 13
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/bullet-list/bullet-list.ts` — Current bullet list implementation. Shows how `toggleBulletList` command works, input rules ("- " or "* " at start of line). The new `toggleBulletMarker` command should support similar input rules.
  - `packages/editor/src/extensions/ordered-list/ordered-list.ts` — Current ordered list. Shows `toggleOrderedList` command and input rules ("1. " at start). New command should replicate input rules.
  - `packages/editor/src/extensions/check-list/check-list.ts` — Current check list. Shows `toggleCheckList` and input rules ("[] " or "[x] "). Replicate for new check marker.
  - `packages/editor/src/extensions/check-list-item/check-list-item.ts` — Check list item with `checked` attribute and node view for checkbox click handling. Pattern for the new checked attribute and click behavior.
  - `packages/editor/src/utils/list.ts` — `isListActive()` and `findListItemType()` helpers used by toolbar. These need to be aware of the new marker system.

  **API/Type References**:
  - `packages/editor/src/utils/node-types.ts` — `LIST_NODE_TYPES` and `LIST_ITEM_NODE_TYPES` constants. These may need updating or a new `LIST_MARKER_TYPES` constant.

  **Test References**:
  - `packages/editor/src/extensions/check-list-item/__tests__/check-list-item.test.ts` — Test pattern for check list behavior, checked attribute toggling.

  **WHY Each Reference Matters**:
  - `bullet-list.ts` / `ordered-list.ts` / `check-list.ts`: These contain the input rules (e.g., typing "- " creates a bullet) that need to be migrated to the new marker system. Study the exact regex patterns.
  - `check-list-item.ts`: The `checked` attribute and click handling pattern needs to be preserved in the new flat model
  - `list.ts` utils: `isListActive()` is called by toolbar buttons to show active state. Must be rewritten for flat marker model.
  - `node-types.ts`: Central registry of list types. Must be updated.

  **Acceptance Criteria**:

  - [ ] Test file: `packages/editor/src/extensions/list-marker/__tests__/list-marker.test.ts`
  - [ ] `npx vitest run src/extensions/list-marker` → PASS (10+ tests, 0 failures)
  - [ ] Extension file: `packages/editor/src/extensions/list-marker/list-marker.ts`
  - [ ] Index file: `packages/editor/src/extensions/list-marker/index.ts`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Toggle bullet marker preserves indent
    Tool: Bash (vitest)
    Preconditions: Editor with `<p data-indent="3">Text</p>`
    Steps:
      1. Call toggleBulletMarker() command
      2. Verify getHTML() shows `<p data-indent="3" data-list-type="bullet">Text</p>`
      3. Call toggleBulletMarker() again (toggle off)
      4. Verify getHTML() shows `<p data-indent="3">Text</p>` (no list-type, indent preserved)
    Expected Result: listType toggles, indent stays at 3 throughout
    Failure Indicators: data-indent changes, listType not toggled
    Evidence: .sisyphus/evidence/task-2-toggle-preserves-indent.txt

  Scenario: Switch list types preserves indent
    Tool: Bash (vitest)
    Preconditions: Editor with `<p data-indent="2" data-list-type="bullet">Text</p>`
    Steps:
      1. Call toggleOrderedMarker()
      2. Verify data-list-type changed to "ordered", data-indent still "2"
    Expected Result: Type switches, indent unchanged
    Failure Indicators: Indent changes, type not switched
    Evidence: .sisyphus/evidence/task-2-switch-type.txt
  ```

  **Evidence to Capture:**
  - [ ] task-2-toggle-preserves-indent.txt — vitest output
  - [ ] task-2-switch-type.txt — vitest output

  **Commit**: YES
  - Message: `feat(editor): add list marker attribute system`
  - Files: `packages/editor/src/extensions/list-marker/*`
  - Pre-commit: `npx vitest run src/extensions/list-marker`

- [x] 3. CSS Rendering for Indent Levels and List Markers

  **What to do**:
  - Create or update CSS file at `packages/editor/src/extensions/block-indent/block-indent.css`
  - Add CSS rules for visual indentation based on `data-indent` attribute:
    - `[data-indent="1"] { padding-left: 2em; }`
    - `[data-indent="2"] { padding-left: 4em; }`
    - Generate rules for levels 1-20 (generous range, since no limit)
    - Alternatively use CSS `calc()` with custom property: `padding-left: calc(var(--indent-level, 0) * 2em);` and set `--indent-level` via attribute
  - Add CSS rules for list marker rendering:
    - `[data-list-type="bullet"]::before { content: "•"; ... }` — bullet marker
    - `[data-list-type="ordered"]::before { content: attr(data-list-number) "."; ... }` — ordered number (set by Task 7)
    - `[data-list-type="check"]` — checkbox rendering (checkbox element injected by node view in Task 2)
  - Ensure indent CSS does NOT conflict with existing `text-align` or `text-direction` styles
  - Ensure markers render at the correct position (before the text, within the indent space)
  - Import CSS in the editor's main CSS entry point
  - Visual design: markers should visually match existing list marker styling (bullet size, font, color)

  **Must NOT do**:
  - Do NOT use JavaScript for visual indentation (pure CSS)
  - Do NOT change existing list CSS that affects task lists or outline lists

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure CSS work, no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - Existing editor CSS files in `packages/editor/` — Find existing `.css` files to understand the CSS architecture (are styles in `.css` files, CSS-in-JS, or styled-components?). Follow the same pattern.
  - `packages/editor/src/extensions/check-list-item/check-list-item.ts` — Contains node view with checkbox rendering. The check marker CSS should visually match this.
  - `packages/editor/src/extensions/task-item/task-item.ts` — Task item styling. DO NOT change this, but reference for consistent visual style.

  **External References**:
  - AiEditor indent CSS pattern: `style: text-indent: ${indent * 2}em` — Alternative rendering approach using inline style
  - PPTist indent CSS: `[data-indent]` selector pattern

  **WHY Each Reference Matters**:
  - Existing CSS architecture tells you whether to create a `.css` file, use CSS modules, or another approach
  - Check list item node view shows how checkboxes are currently rendered — the new check marker must look identical

  **Acceptance Criteria**:

  - [ ] CSS file created with indent rules for levels 1-20
  - [ ] CSS file includes list marker pseudo-element styles
  - [ ] CSS imported in editor entry point

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Visual indent rendering
    Tool: Playwright
    Preconditions: Editor loaded with test content containing paragraphs at indent 0, 1, 2, 3
    Steps:
      1. Navigate to editor page
      2. Load HTML: `<p>Level 0</p><p data-indent="1">Level 1</p><p data-indent="2">Level 2</p><p data-indent="3">Level 3</p>`
      3. Take screenshot
      4. Assert that each paragraph is visually indented progressively (Level 1 further right than Level 0, etc.)
      5. Verify no CSS errors in console
    Expected Result: Each level is visually indented by ~2em increments, stacking correctly
    Failure Indicators: All paragraphs at same position, CSS not applied, layout broken
    Evidence: .sisyphus/evidence/task-3-indent-rendering.png

  Scenario: List marker rendering
    Tool: Playwright
    Preconditions: Editor loaded with `<p data-list-type="bullet" data-indent="1">Bullet item</p>`
    Steps:
      1. Verify a bullet marker (•) is visible before the text
      2. Take screenshot
    Expected Result: Bullet marker visible at correct position within indent
    Failure Indicators: No marker visible, marker at wrong position
    Evidence: .sisyphus/evidence/task-3-marker-rendering.png
  ```

  **Evidence to Capture:**
  - [ ] task-3-indent-rendering.png — screenshot showing progressive indentation
  - [ ] task-3-marker-rendering.png — screenshot showing list markers

  **Commit**: YES
  - Message: `style(editor): add CSS for indent level and list marker rendering`
  - Files: `packages/editor/src/extensions/block-indent/block-indent.css`
  - Pre-commit: none (CSS only)

- [ ] 4. Migration Utility (Nested HTML → Flat HTML)

  **What to do**:
  - Create `packages/editor/src/utils/indent-migration.ts`
  - Implement `migrateNestedListsToFlat(html: string): string` function
  - The function takes HTML string (current note format) and returns transformed HTML string with flat indent model
  - Transformation rules:
    - `<ul><li><p>text</p></li></ul>` → `<p data-list-type="bullet">text</p>`
    - `<ol><li><p>text</p></li></ol>` → `<p data-list-type="ordered">text</p>`
    - `<ul class="checklist"><li>text</li></ul>` → `<p data-list-type="check">text</p>` (check checked state)
    - Nested lists: depth maps to `data-indent`. E.g., `<ul><li><p>L1</p><ul><li><p>L2</p></li></ul></li></ul>` → `<p data-list-type="bullet">L1</p><p data-list-type="bullet" data-indent="1">L2</p>`
    - Multiple items at same level: each becomes its own `<p>` with same indent
    - Mixed content in list items (paragraph + nested list): paragraph gets the indent, nested list items get indent+1
    - Preserve all inline formatting (bold, italic, links, etc.) within list item text
    - Preserve non-list content as-is (paragraphs, headings, images, etc. pass through unchanged)
  - **CRITICAL**: Do NOT transform task lists (`<ul class="checklist">` with task-specific attributes) or outline lists (`<ul data-type="outlineList">`). These must pass through unchanged.
  - Handle edge cases: empty list items, list items with multiple paragraphs, list items with non-paragraph content (images, code blocks inside lists)
  - Write comprehensive TDD tests
  - Test with real-world HTML samples from the Notesnook editor (use getHTML() output format)

  **Must NOT do**:
  - Do NOT migrate task lists or outline lists
  - Do NOT lose any content during migration
  - Do NOT change non-list content
  - Do NOT add external dependencies for HTML parsing (use DOM APIs or existing parser)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex HTML transformation with many edge cases, requires thorough TDD
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 12
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/clipboard/clipboard-dom-parser.ts` — Shows how the editor already transforms HTML during parsing (e.g., `convertGoogleDocsChecklist`, `formatCodeblocks`). Follow similar DOM manipulation patterns.
  - `packages/editor/src/extensions/clipboard/clipboard-dom-serializer.ts` — Shows how `<li><p>` is simplified during serialization (removing wrapper `<p>` if single child). Understand this to reverse it correctly.

  **API/Type References**:
  - `packages/editor/src/utils/node-types.ts` — `LIST_NODE_TYPES` array — use this to identify which node types to migrate vs. skip
  - `packages/core/src/collections/content.ts` — Shows how content is stored (`type: "tiptap"`, `data: "<html>..."`) and the `tinyToTiptap` migration function pattern. Follow similar migration function pattern.

  **Test References**:
  - `packages/editor/src/extensions/clipboard/tests/clipboard-dom-parser.test.ts` — HTML parsing test patterns

  **WHY Each Reference Matters**:
  - `clipboard-dom-parser.ts`: Contains real HTML transformation logic — follow the same DOM API patterns (querySelectorAll, createElement, etc.)
  - `content.ts` with `tinyToTiptap`: Shows the existing migration function pattern — a function that takes HTML string, transforms it, returns new HTML string. Follow this exact pattern.
  - `node-types.ts`: The authoritative list of which nodes are "list" types. Use to decide what to migrate.

  **Acceptance Criteria**:

  - [ ] Migration utility: `packages/editor/src/utils/indent-migration.ts`
  - [ ] Test file: `packages/editor/src/utils/__tests__/indent-migration.test.ts`
  - [ ] `npx vitest run src/utils/__tests__/indent-migration` → PASS (15+ tests, 0 failures)
  - [ ] Bullet list migration correct
  - [ ] Ordered list migration correct
  - [ ] Check list migration correct
  - [ ] Nested (multi-level) list migration correct with proper indent levels
  - [ ] Task lists pass through unchanged
  - [ ] Outline lists pass through unchanged
  - [ ] Non-list content passes through unchanged
  - [ ] Inline formatting preserved

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Migrate nested bullet list to flat
    Tool: Bash (vitest)
    Preconditions: HTML input: `<ul><li><p>Item 1</p><ul><li><p>Sub item</p></li></ul></li><li><p>Item 2</p></li></ul>`
    Steps:
      1. Call migrateNestedListsToFlat(input)
      2. Verify output: `<p data-list-type="bullet">Item 1</p><p data-list-type="bullet" data-indent="1">Sub item</p><p data-list-type="bullet">Item 2</p>`
    Expected Result: Nested structure flattened, indent levels correct, list types preserved
    Failure Indicators: Missing items, wrong indent levels, lost content
    Evidence: .sisyphus/evidence/task-4-migrate-bullet.txt

  Scenario: Task list passes through unchanged
    Tool: Bash (vitest)
    Preconditions: HTML with task list markup
    Steps:
      1. Call migrateNestedListsToFlat(taskListHtml)
      2. Verify output === input (unchanged)
    Expected Result: Task list HTML is identical before and after migration
    Failure Indicators: Task list structure modified
    Evidence: .sisyphus/evidence/task-4-tasklist-passthrough.txt
  ```

  **Evidence to Capture:**
  - [ ] task-4-migrate-bullet.txt
  - [ ] task-4-tasklist-passthrough.txt

  **Commit**: YES
  - Message: `feat(editor): add nested-to-flat HTML migration utility`
  - Files: `packages/editor/src/utils/indent-migration.ts`, `packages/editor/src/utils/__tests__/indent-migration.test.ts`
  - Pre-commit: `npx vitest run src/utils/__tests__/indent-migration`

- [ ] 5. Tab/Shift-Tab Keybinding Rework

  **What to do**:
  - Modify `packages/editor/src/extensions/key-map/key-map.ts`:
    - **Tab handler**: Instead of inserting `\t` in non-list contexts, call `editor.commands.indent()`
    - **Tab in list context**: Instead of deferring to ListKeymap's `sinkListItem`, call `editor.commands.indent()` (same behavior for all block types)
    - **Shift-Tab handler**: Call `editor.commands.outdent()` in all contexts (except table/code block)
    - **Preserve**: Table and code block Tab behavior must stay unchanged
  - Remove or disable `ListKeymap` from `packages/editor/src/index.ts` for the converted list types (bullet, ordered, check). ListKeymap should still work for task list and outline list.
  - Update individual list-item keyboard shortcuts:
    - `packages/editor/src/extensions/check-list-item/check-list-item.ts` — Remove Tab → sinkListItem handler (no longer needed for flat model)
    - `packages/editor/src/extensions/list-item/list-item.ts` — Remove Tab handler delegation (no longer needed)
    - Keep Tab handlers in `outline-list-item.ts` and task-item-related files unchanged
  - Handle Enter key behavior in list-marker context:
    - When Enter is pressed on a block with a list marker, the new paragraph should inherit the same listType and indent level
    - When Enter is pressed on an empty list-marker block, remove the marker (convert to plain paragraph at same indent)
  - Write TDD tests for all Tab/Shift-Tab scenarios
  - Test cases:
    - Tab on paragraph (no list) → indent increases by 1
    - Tab on bullet-marked paragraph → indent increases by 1, marker preserved
    - Shift-Tab on indented paragraph → indent decreases by 1
    - Shift-Tab at indent 0 → no change
    - Tab in table cell → moves to next cell (unchanged)
    - Tab in code block → inserts tab/spaces (unchanged)
    - Tab on task list item → sinks (nested behavior, unchanged)
    - Enter on bullet-marker block → new paragraph with same marker and indent
    - Enter on empty bullet-marker block → plain paragraph, marker removed

  **Must NOT do**:
  - Do NOT change Tab behavior in tables or code blocks
  - Do NOT change task list or outline list Tab behavior
  - Do NOT remove ListKeymap entirely — it's still needed for task/outline lists

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Modifying core keybinding infrastructure with complex context-switching logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/key-map/key-map.ts` — THE file to modify. Current Tab handler checks `isListActive(editor)`, `isInTable`, `editor.isActive(CodeBlock.name)` and falls through to inserting `\t`. Replace the `\t` insertion and list delegation with `indent()` command.
  - `packages/editor/src/extensions/key-map/__tests__/key-map.test.ts` — Existing keymap tests. Add new tests following this pattern.
  - `packages/editor/src/index.ts` — Where `ListKeymap.configure()` is called with `listTypes` mapping. Modify to only include task/outline list types.

  **API/Type References**:
  - `packages/editor/src/utils/list.ts` — `isListActive()` function. This currently checks for nested list nodes. For the new model, it should check for `listType` attribute on the current block.

  **WHY Each Reference Matters**:
  - `key-map.ts` is the single point where Tab/Shift-Tab behavior is decided globally. This is THE critical file.
  - `key-map.test.ts` has existing test patterns for keydown simulation.
  - `index.ts` ListKeymap config determines which list types get automatic Tab handling — must exclude the new flat types.

  **Acceptance Criteria**:

  - [ ] `npx vitest run src/extensions/key-map` → PASS (existing + new tests)
  - [ ] Tab on paragraph = indent (not \t insertion)
  - [ ] Tab on bullet paragraph = indent (not sinkListItem)
  - [ ] Shift-Tab on indented block = outdent
  - [ ] Tab in table = unchanged
  - [ ] Tab in code block = unchanged
  - [ ] Tab on task list item = sinkListItem (unchanged)
  - [ ] Enter on list-marker block = new block with same marker + indent

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tab indents paragraph instead of inserting tab character
    Tool: Playwright
    Preconditions: Editor loaded, cursor in a plain paragraph
    Steps:
      1. Type "Hello world" in editor
      2. Press Tab key
      3. Inspect DOM: verify `<p data-indent="1">Hello world</p>` (not `<p>\tHello world</p>`)
    Expected Result: Paragraph has data-indent="1", no tab character in text
    Failure Indicators: Tab character inserted, no data-indent attribute
    Evidence: .sisyphus/evidence/task-5-tab-indent.png

  Scenario: Tab on bullet paragraph increases indent, keeps marker
    Tool: Playwright
    Preconditions: Editor with bullet-marked paragraph at indent 0
    Steps:
      1. Press Tab
      2. Verify indent becomes 1, data-list-type still "bullet"
    Expected Result: Indent increased, marker preserved
    Failure Indicators: Marker removed, nested list structure created
    Evidence: .sisyphus/evidence/task-5-tab-bullet.png
  ```

  **Evidence to Capture:**
  - [ ] task-5-tab-indent.png
  - [ ] task-5-tab-bullet.png

  **Commit**: YES
  - Message: `feat(editor): rework Tab/Shift-Tab for universal indent/outdent`
  - Files: `packages/editor/src/extensions/key-map/key-map.ts`, `packages/editor/src/index.ts`, list-item Tab handler files
  - Pre-commit: `npx vitest run src/extensions/key-map`

- [ ] 6. List Type Toggle Commands Integration

  **What to do**:
  - Wire the list marker toggle commands (from Task 2) into the editor's command system in `packages/editor/src/index.ts`
  - Register the `blockIndent` extension and `listMarker` extension in the editor's extension list
  - Replace existing `toggleBulletList`, `toggleOrderedList`, `toggleCheckList` commands:
    - Old: These wrap content in nested `bulletList > listItem` structure
    - New: These set/toggle the `listType` attribute on the current block(s)
  - Implement input rules (typing shortcuts) in the list-marker extension:
    - `"- "` or `"* "` at start of line → set listType = "bullet"
    - `"1. "` at start of line → set listType = "ordered"
    - `"[] "` or `"[ ] "` at start of line → set listType = "check"
    - `"[x] "` at start of line → set listType = "check", checked = true
  - Update `packages/editor/src/utils/list.ts`:
    - `isListActive()` — check `listType` attribute instead of nested list node type
    - `findListItemType()` — update or deprecate (no longer finding nested list item nodes)
  - Ensure toolbar list buttons (bullet, ordered, check) call the new toggle commands
  - Write TDD tests for input rules and command integration

  **Must NOT do**:
  - Do NOT change toggleTaskList or toggleOutlineList commands
  - Do NOT break input rules for task lists ("- [ ] " for task items)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration work touching multiple files with input rule regex patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8)
  - **Blocks**: Tasks 9, 13
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/bullet-list/bullet-list.ts` — Current input rule: `wrappingInputRule` with regex for `- ` / `* `. Study the exact regex to replicate for the new flat model.
  - `packages/editor/src/extensions/ordered-list/ordered-list.ts` — Current input rule for `1. ` pattern.
  - `packages/editor/src/extensions/check-list/check-list.ts` — Current input rules for `[] ` / `[x] ` patterns.
  - `packages/editor/src/index.ts` — Where extensions are registered. This is where new extensions need to be added and old ones potentially removed.

  **WHY Each Reference Matters**:
  - The input rule regex patterns from old extensions must be preserved exactly — users expect "- " to create a bullet. The behavior changes (flat vs nested) but the trigger pattern must be identical.
  - `index.ts` is the central extension registry — new extensions must be added here.

  **Acceptance Criteria**:

  - [ ] Typing "- " at start of paragraph → sets listType="bullet"
  - [ ] Typing "1. " at start of paragraph → sets listType="ordered"
  - [ ] Typing "[] " at start of paragraph → sets listType="check"
  - [ ] `isListActive()` returns true for blocks with listType attribute
  - [ ] Extensions registered in index.ts
  - [ ] `npx vitest run` → no regressions

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Input rule creates bullet marker (not nested list)
    Tool: Playwright
    Preconditions: Editor loaded, empty paragraph
    Steps:
      1. Type "- " (dash space)
      2. Inspect DOM: verify `<p data-list-type="bullet">` (NOT `<ul><li><p>`)
      3. Type some text, verify it appears in the bullet-marked paragraph
    Expected Result: Flat bullet marker, no nested list structure
    Failure Indicators: Nested `<ul>` or `<li>` created, no data-list-type attribute
    Evidence: .sisyphus/evidence/task-6-input-rule-bullet.png

  Scenario: Input rule for checkbox creates check marker
    Tool: Playwright
    Preconditions: Editor loaded, empty paragraph
    Steps:
      1. Type "[] " (bracket bracket space)
      2. Verify `<p data-list-type="check" data-checked="false">` in DOM
    Expected Result: Check marker with unchecked state
    Failure Indicators: Old check list structure created
    Evidence: .sisyphus/evidence/task-6-input-rule-check.png
  ```

  **Evidence to Capture:**
  - [ ] task-6-input-rule-bullet.png
  - [ ] task-6-input-rule-check.png

  **Commit**: YES
  - Message: `feat(editor): implement flat list type toggle commands and input rules`
  - Files: `packages/editor/src/index.ts`, `packages/editor/src/utils/list.ts`, list-marker extension updates
  - Pre-commit: `npx vitest run`

- [ ] 7. Ordered List Numbering Logic (OneNote-Style)

  **What to do**:
  - Create numbering computation at `packages/editor/src/extensions/list-marker/ordered-numbering.ts`
  - Implement a ProseMirror plugin (or decoration) that computes ordered list numbers at render-time:
    - Walk through the document's blocks sequentially
    - For each block with `listType="ordered"`, compute its number based on:
      - Its indent level
      - How many consecutive ordered blocks at the same indent level precede it
    - A non-ordered block (or different indent level) resets the counter for that indent level
  - Number format varies by indent level (OneNote-style):
    - Indent 0: 1, 2, 3, ... (decimal)
    - Indent 1: a, b, c, ... (lowercase alpha)
    - Indent 2: i, ii, iii, ... (lowercase roman)
    - Indent 3: 1, 2, 3, ... (decimal again, cycle repeats)
    - Indent 4: a, b, c, ...
    - Pattern: decimal → alpha → roman → decimal → alpha → roman ...
  - Store computed number as a `data-list-number` attribute (or decoration) for CSS rendering
  - Numbers must update live as the user types, adds, removes, or reorders blocks
  - Write TDD tests with complex scenarios:
    - Simple: 3 consecutive ordered blocks at indent 0 → 1, 2, 3
    - Nested: ordered at indent 0, then indent 1 → 1, a
    - Interrupted: ordered, paragraph (no marker), ordered → 1, (nothing), 2 (counter continues or restarts? → RESTARTS, each contiguous group)
    - Mixed indent: ordered at 0, ordered at 1, ordered at 1, ordered at 0 → 1, a, b, 2
    - Deep: indent 0 through 6 → 1, a, i, 1, a, i, 1

  **Must NOT do**:
  - Do NOT persist ordered numbers in the document (compute at render-time)
  - Do NOT use CSS counters alone (they can't handle the flat structure — use ProseMirror plugin)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex algorithmic logic — walking document tree, maintaining per-indent-level counters, format cycling. Requires careful state management.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8)
  - **Blocks**: Task 15
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/task-list/task-list.ts` — Contains a ProseMirror plugin that walks the document to compute task list stats (checked/total counts). This is the closest existing pattern for a plugin that reads document structure and computes derived data.
  - `packages/editor/src/extensions/heading/heading.ts` — Has plugins that manage state based on document structure (collapsing). Shows plugin pattern.

  **External References**:
  - OneNote number format spec: decimal → lowercase alpha → lowercase roman, cycling every 3 levels

  **WHY Each Reference Matters**:
  - `task-list.ts` plugin: Shows how to walk `doc.descendants()` to compute aggregate data from blocks. The numbering plugin needs the same pattern but computing counters per indent level.

  **Acceptance Criteria**:

  - [ ] Numbering utility: `packages/editor/src/extensions/list-marker/ordered-numbering.ts`
  - [ ] Test file: `packages/editor/src/extensions/list-marker/__tests__/ordered-numbering.test.ts`
  - [ ] `npx vitest run src/extensions/list-marker/__tests__/ordered-numbering` → PASS (8+ tests)
  - [ ] Decimal → alpha → roman format cycling works
  - [ ] Counter resets on contiguous group break
  - [ ] Numbers update live when blocks are added/removed

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: OneNote-style numbered list across indent levels
    Tool: Playwright
    Preconditions: Editor with ordered blocks at indent 0, 1, 1, 0
    Steps:
      1. Verify first block (indent 0) shows "1."
      2. Verify second block (indent 1) shows "a."
      3. Verify third block (indent 1) shows "b."
      4. Verify fourth block (indent 0) shows "2."
    Expected Result: Numbers follow OneNote format pattern
    Failure Indicators: Wrong numbers, wrong format, no numbers shown
    Evidence: .sisyphus/evidence/task-7-numbering.png

  Scenario: Counter restarts after non-ordered block
    Tool: Bash (vitest)
    Preconditions: ordered, paragraph, ordered (all at indent 0)
    Steps:
      1. Verify first ordered → 1
      2. Verify third block (second ordered after break) → 1 (restarts)
    Expected Result: Counter resets after interruption
    Failure Indicators: Counter continues (shows 2 instead of 1)
    Evidence: .sisyphus/evidence/task-7-counter-restart.txt
  ```

  **Evidence to Capture:**
  - [ ] task-7-numbering.png
  - [ ] task-7-counter-restart.txt

  **Commit**: YES
  - Message: `feat(editor): add OneNote-style ordered list numbering`
  - Files: `packages/editor/src/extensions/list-marker/ordered-numbering.ts`
  - Pre-commit: `npx vitest run src/extensions/list-marker/__tests__/ordered-numbering`

- [ ] 8. Toolbar Updates for Universal Indent/Outdent

  **What to do**:
  - Update `packages/editor/src/toolbar/tools/lists.tsx`:
    - **Indent button**: Change from calling `sinkListItem(type)` to calling `editor.commands.indent()`
    - **Outdent button**: Change from calling `liftListItem(type)` to calling `editor.commands.outdent()`
    - **Show Indent/Outdent buttons always** (not just when in list context). Currently they only show when `findListItemType(editor)` returns a type.
    - **List type buttons** (bullet, ordered, check): Update to call new `toggleBulletMarker()`, `toggleOrderedMarker()`, `toggleCheckMarker()` commands instead of old `toggleBulletList()`, etc.
    - **Active state**: List buttons should show active state based on `listType` attribute of current block, not based on nested list node ancestry
  - Ensure toolbar works on both desktop and mobile (mobile uses bottom toolbar location)
  - Update any toolbar-related imports in `packages/editor-mobile/`

  **Must NOT do**:
  - Do NOT change task list or outline list toolbar buttons
  - Do NOT remove toolbar buttons — only update their implementations

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Toolbar UI changes with visual impact
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `packages/editor/src/toolbar/tools/lists.tsx` — THE file to modify. Contains Indent/Outdent buttons and list type buttons. Currently uses `findListItemType()` to determine context.
  - `packages/editor-mobile/src/components/tiptap.tsx` — Mobile editor wrapper. Toolbar location "bottom" enables Indent/Outdent visibility.

  **WHY Each Reference Matters**:
  - `lists.tsx` is the single toolbar file for all list operations. All changes are concentrated here.
  - Mobile wrapper needs checking to ensure toolbar changes propagate correctly.

  **Acceptance Criteria**:

  - [ ] Indent/Outdent buttons visible for all block types (not just lists)
  - [ ] Indent button calls `indent()` command
  - [ ] Outdent button calls `outdent()` command
  - [ ] List type buttons call new marker toggle commands
  - [ ] Active state reflects `listType` attribute

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Indent button works on plain paragraph
    Tool: Playwright
    Preconditions: Editor loaded, cursor in plain paragraph
    Steps:
      1. Verify Indent button is visible in toolbar
      2. Click Indent button
      3. Verify paragraph indent increased to 1
    Expected Result: Indent button available and functional for paragraphs
    Failure Indicators: Button hidden, button does nothing, button tries sinkListItem
    Evidence: .sisyphus/evidence/task-8-toolbar-indent.png

  Scenario: Bullet button shows active state
    Tool: Playwright
    Preconditions: Editor with bullet-marked paragraph, cursor in it
    Steps:
      1. Verify bullet button shows active/pressed state
      2. Click ordered list button
      3. Verify ordered button now active, bullet button no longer active
    Expected Result: Active state follows listType attribute
    Failure Indicators: No active state, wrong button active
    Evidence: .sisyphus/evidence/task-8-toolbar-active.png
  ```

  **Evidence to Capture:**
  - [ ] task-8-toolbar-indent.png
  - [ ] task-8-toolbar-active.png

  **Commit**: YES
  - Message: `feat(editor): update toolbar for universal indent/outdent`
  - Files: `packages/editor/src/toolbar/tools/lists.tsx`
  - Pre-commit: `npx vitest run`

- [ ] 9. Clipboard DOM Serializer — Flat-to-Nested HTML Export

  **What to do**:
  - Modify `packages/editor/src/extensions/clipboard/clipboard-dom-serializer.ts`:
    - Override `serializeFragment()` to post-process the serialized DOM
    - After the existing `super.serializeFragment()` call (which produces flat `<p>` blocks with `data-indent` and `data-list-type` attributes), walk the DOM and reconstruct nested `<ul>/<ol>/<li>` structure for clipboard interop:
      1. Scan each top-level child in the fragment DOM output
      2. If a block has `data-list-type` attribute, start collecting consecutive list items
      3. Group consecutive same-type list blocks into a `<ul>` or `<ol>` wrapper element
      4. For indented items, create nested `<ul>/<ol>` children inside `<li>` elements
      5. Use `data-indent` values to determine nesting depth
      6. For `check` type, produce `<ul data-type="taskList"><li data-type="taskItem" data-checked="false">` (matching the existing TipTap check list HTML format)
    - Non-list blocks (paragraphs, headings) with `data-indent` should keep their `data-indent` attribute as-is in clipboard (they have no standard HTML nesting equivalent)
    - Clean up: remove `data-indent` and `data-list-type` attributes from the final list HTML output (the nesting encodes the structure now)
  - Write tests in `packages/editor/src/extensions/clipboard/tests/clipboard-dom-serializer.test.ts`:
    - Test flat bullet blocks at indent 0 → produces `<ul><li>...</li></ul>`
    - Test flat bullet blocks at mixed indents (0, 1, 2) → produces `<ul><li>...<ul><li>...<ul><li>...`
    - Test flat ordered blocks → produces `<ol>` wrappers
    - Test flat check blocks → produces `<ul data-type="taskList">`
    - Test mixed: bullet at indent 0, paragraph at indent 1, bullet at indent 0 → two separate `<ul>` wrappers with paragraph between them
    - Test non-list indented paragraph → keeps `data-indent`, no list wrapper

  **Must NOT do**:
  - Do NOT modify the serialization of task list or outline list nodes (they are already nested)
  - Do NOT change how non-list content is serialized (images, tables, code blocks, etc.)
  - Do NOT produce invalid HTML (unclosed tags, wrong nesting)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: DOM tree reconstruction from flat attributes is algorithmic and requires careful tree-building logic with edge cases
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — this is serialization logic, not browser UI testing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12)
  - **Blocks**: F3 (final QA needs clipboard to work)
  - **Blocked By**: Tasks 1, 2 (need block-indent and list-marker extensions to exist)

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/clipboard/clipboard-dom-serializer.ts:23-60` — The existing `ClipboardDOMSerializer` class. Extends `DOMSerializer`. The `serializeFragment()` method already does post-processing: unwraps `<p>` from single-child `<li>`, removes `data-block-id`, merges single-spaced paragraphs. The new flat-to-nested reconstruction should be added as an additional post-processing step AFTER the existing transformations.
  - `packages/editor/src/extensions/check-list-item/check-list-item.ts` — Look at `renderHTML()` to see the exact HTML structure for check list items (`data-type`, `data-checked` attributes). The clipboard serializer must produce HTML matching this shape.

  **API/Type References**:
  - `packages/editor/src/extensions/block-indent/block-indent.ts` (Task 1 output) — The `data-indent` attribute name and numeric value format
  - `packages/editor/src/extensions/list-marker/list-marker.ts` (Task 2 output) — The `data-list-type` attribute values: `bullet`, `ordered`, `check`

  **Test References**:
  - `packages/editor/src/extensions/clipboard/tests/clipboard-dom-parser.test.ts` — Existing clipboard test patterns. Shows how to create test content, serialize, and assert on HTML output.

  **WHY Each Reference Matters**:
  - `clipboard-dom-serializer.ts` is the single file to modify — must understand the existing post-processing pipeline to add the reconstruction step in the right place
  - Check list item HTML structure must be matched exactly or paste-back-into-editor will fail
  - The test file shows the project's clipboard testing conventions

  **Acceptance Criteria**:

  - [ ] Flat bullet/ordered/check blocks produce nested `<ul>/<ol>/<li>` HTML in clipboard
  - [ ] Indented flat items produce correctly nested sub-lists
  - [ ] Non-list indented paragraphs keep `data-indent` (no list wrappers)
  - [ ] Mixed list/non-list sequences produce separate list wrappers
  - [ ] `npx vitest run src/extensions/clipboard/tests/clipboard-dom-serializer` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Copy flat bullet list produces nested HTML
    Tool: Playwright
    Preconditions: Editor loaded with 3 bullet-marked paragraphs at indents 0, 1, 2
    Steps:
      1. Select all three lines (Ctrl+A)
      2. Copy to clipboard (Ctrl+C)
      3. Read clipboard HTML content using page.evaluate(() => navigator.clipboard.read())
      4. Parse clipboard HTML and verify structure
    Expected Result: Clipboard HTML contains `<ul><li>line1<ul><li>line2<ul><li>line3</li></ul></li></ul></li></ul>`
    Failure Indicators: Flat `<p>` tags with data-indent in clipboard, no `<ul>/<li>` structure, wrong nesting depth
    Evidence: .sisyphus/evidence/task-9-clipboard-nested-html.txt

  Scenario: Copy mixed list and non-list content
    Tool: Playwright
    Preconditions: Editor with: bullet at indent 0, plain paragraph at indent 1, bullet at indent 0
    Steps:
      1. Select all content
      2. Copy to clipboard
      3. Read clipboard HTML and parse
    Expected Result: Two separate `<ul>` wrappers with `<p data-indent="1">` between them
    Failure Indicators: Single `<ul>` wrapping everything, paragraph inside `<li>`, missing `data-indent`
    Evidence: .sisyphus/evidence/task-9-clipboard-mixed.txt
  ```

  **Evidence to Capture:**
  - [ ] task-9-clipboard-nested-html.txt
  - [ ] task-9-clipboard-mixed.txt

  **Commit**: YES
  - Message: `feat(editor): update clipboard serializer for flat-to-nested HTML export`
  - Files: `packages/editor/src/extensions/clipboard/clipboard-dom-serializer.ts`, `packages/editor/src/extensions/clipboard/tests/clipboard-dom-serializer.test.ts`
  - Pre-commit: `npx vitest run src/extensions/clipboard/tests/clipboard-dom-serializer`

- [ ] 10. Clipboard DOM Parser — Nested-to-Flat HTML Import (Paste)

  **What to do**:
  - Modify `packages/editor/src/extensions/clipboard/clipboard-dom-parser.ts`:
    - Add a new pre-processing function `convertNestedListsToFlat(dom)` called in both `parseSlice()` and `parse()` methods, alongside the existing `convertGoogleDocsChecklist()`, `formatCodeblocks()`, etc.
    - The function should transform nested `<ul>/<ol>/<li>` DOM structures into flat block elements:
      1. Walk the DOM tree looking for `<ul>`, `<ol>` elements
      2. Track nesting depth as you recurse into nested lists
      3. For each `<li>`, extract its direct text/inline content (not nested sublists)
      4. Create a `<p data-indent="{depth}" data-list-type="{bullet|ordered|check}">` element
      5. Replace the original list structure in the DOM with the flat paragraphs
    - Handle edge cases:
      - `<li>` with mixed content (text + nested sublist): text becomes current-level paragraph, sublist recurses deeper
      - `<li>` with multiple `<p>` children: each `<p>` gets the same indent and list type
      - Google Docs checklist format (already handled by `convertGoogleDocsChecklist()` — ensure no double-processing)
      - Empty `<li>` elements: produce empty `<p>` with correct indent
    - Handle list type detection: `<ul>` → `bullet`, `<ol>` → `ordered`, `<ul data-type="taskList">` → `check`
    - **IMPORTANT**: Do NOT convert TipTap task list paste (`<ul data-type="taskList">` with `<li data-type="taskItem">`) — those must stay nested for the task list extension. Only convert standard HTML lists and the notesnook-specific check list format.
  - Write tests in `packages/editor/src/extensions/clipboard/tests/clipboard-dom-parser.test.ts`:
    - Test simple `<ul><li>text</li></ul>` → flat paragraph with indent 0 and list-type bullet
    - Test nested `<ul><li>a<ul><li>b</li></ul></li></ul>` → two flat paragraphs at indents 0 and 1
    - Test deeply nested (3+ levels) → correct indent values
    - Test `<ol>` → ordered list-type
    - Test mixed list types in nested structure
    - Test `<li>` with multiple `<p>` children
    - Test non-list HTML unchanged (tables, images, code)

  **Must NOT do**:
  - Do NOT modify how TipTap task list items paste (they have `data-type="taskItem"` and must stay nested)
  - Do NOT remove existing pre-processing functions (convertGoogleDocsChecklist, formatCodeblocks, etc.)
  - Do NOT break existing paste behavior for non-list content (tables, images, code blocks)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: DOM tree traversal with type detection, depth tracking, and edge case handling requires careful algorithmic work
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed in implementation — tests use unit-level DOM manipulation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11, 12)
  - **Blocks**: F3 (final QA needs paste to work)
  - **Blocked By**: Tasks 1, 2 (need block-indent and list-marker extensions for the parser to produce valid nodes)

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/clipboard/clipboard-dom-parser.ts:29-49` — The existing `ClipboardDOMParser` class. Both `parseSlice()` and `parse()` call a series of DOM pre-processing functions before `super.parseSlice()`/`super.parse()`. The new `convertNestedListsToFlat()` function follows this exact same pattern — add it to both methods.
  - `packages/editor/src/extensions/clipboard/clipboard-dom-parser.ts:42-46` — The `convertGoogleDocsChecklist(dom)` function already handles Google Docs' specific checklist format. The new function must NOT double-process content that `convertGoogleDocsChecklist` already converted. Check processing order carefully — put `convertNestedListsToFlat` AFTER `convertGoogleDocsChecklist` so Google Docs checklists are already normalized.
  - `packages/editor/src/utils/indent-migration.ts` (Task 4 output) — The migration utility converts HTML string with nested lists to flat blocks. The clipboard parser does the SAME transformation but on a live DOM tree instead of an HTML string. Reuse the same logic/approach.

  **API/Type References**:
  - `packages/editor/src/extensions/block-indent/block-indent.ts` (Task 1 output) — `data-indent` attribute name and format
  - `packages/editor/src/extensions/list-marker/list-marker.ts` (Task 2 output) — `data-list-type` attribute values

  **Test References**:
  - `packages/editor/src/extensions/clipboard/tests/clipboard-dom-parser.test.ts` — Existing test file for clipboard DOM parser. Shows test patterns: create DOM via `document.createElement`, call parser, assert on ProseMirror node structure.

  **WHY Each Reference Matters**:
  - The parser class shows the pre-processing pipeline pattern that must be followed exactly
  - Google Docs checklist conversion ordering matters — wrong order causes double-processing bugs
  - The migration utility (Task 4) solves the same logical problem (nested→flat) — ensures consistent transformation logic
  - Existing tests show the project's convention for clipboard parsing test fixtures

  **Acceptance Criteria**:

  - [ ] Pasting nested `<ul>/<ol>/<li>` HTML produces flat paragraphs with correct `data-indent` and `data-list-type`
  - [ ] Nesting depth correctly maps to indent level (0-indexed from outermost)
  - [ ] `<ol>` → `ordered`, `<ul>` → `bullet`
  - [ ] `<li>` with mixed content (text + sublist) splits correctly
  - [ ] Existing paste behaviors (tables, code, images, Google Docs checklists) unchanged
  - [ ] TipTap task list paste unchanged (stays nested)
  - [ ] `npx vitest run src/extensions/clipboard/tests/clipboard-dom-parser` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Paste nested bullet list from external source
    Tool: Playwright
    Preconditions: Editor loaded, empty document
    Steps:
      1. Use page.evaluate to write `<ul><li>A<ul><li>B<ul><li>C</li></ul></li></ul></li></ul>` to clipboard
      2. Paste into editor (Ctrl+V)
      3. Read editor HTML content
      4. Verify: 3 paragraphs with data-indent="0", data-indent="1", data-indent="2"
      5. Verify: all have data-list-type="bullet"
    Expected Result: Three flat paragraphs with correct indent levels and bullet list type
    Failure Indicators: Nested `<ul>/<li>` nodes in editor DOM, wrong indent values, missing list-type
    Evidence: .sisyphus/evidence/task-10-paste-nested-list.txt

  Scenario: Paste ordered list preserves type
    Tool: Playwright
    Preconditions: Editor loaded, empty document
    Steps:
      1. Write `<ol><li>First<ol><li>Sub</li></ol></li><li>Second</li></ol>` to clipboard
      2. Paste into editor
      3. Read editor HTML
      4. Verify data-list-type="ordered" on all list paragraphs
      5. Verify indent 0 for "First" and "Second", indent 1 for "Sub"
    Expected Result: Flat paragraphs with ordered type and correct indents
    Failure Indicators: bullet type instead of ordered, wrong indent mapping
    Evidence: .sisyphus/evidence/task-10-paste-ordered.txt

  Scenario: Paste non-list content unchanged
    Tool: Playwright
    Preconditions: Editor loaded, empty document
    Steps:
      1. Paste `<table><tr><td>Cell</td></tr></table>` HTML
      2. Verify table renders as table node (not converted to flat paragraphs)
    Expected Result: Table pasted normally, not affected by list conversion
    Failure Indicators: Table content converted to paragraphs, table structure lost
    Evidence: .sisyphus/evidence/task-10-paste-nonlist.txt
  ```

  **Evidence to Capture:**
  - [ ] task-10-paste-nested-list.txt
  - [ ] task-10-paste-ordered.txt
  - [ ] task-10-paste-nonlist.txt

  **Commit**: YES
  - Message: `feat(editor): update clipboard parser for nested-to-flat HTML import`
  - Files: `packages/editor/src/extensions/clipboard/clipboard-dom-parser.ts`, `packages/editor/src/extensions/clipboard/tests/clipboard-dom-parser.test.ts`
  - Pre-commit: `npx vitest run src/extensions/clipboard/tests/clipboard-dom-parser`

- [x] 11. Markdown/Text Export — Indented List Syntax

  **What to do**:
  - Modify `packages/editor/src/extensions/clipboard/clipboard-text-serializer.ts`:
    - Update the `getTextBetween()` function to handle the new flat indent model
    - Currently, list item indentation is implicit from nested node structure. With flat model, each block node has `indent` and `listType` attributes directly.
    - When serializing a block node to text:
      1. Check if node has `listType` attribute
      2. If `bullet`: prefix with `"  ".repeat(indent) + "- "` (2 spaces per indent level, then dash)
      3. If `ordered`: prefix with `"  ".repeat(indent) + "{N}. "` where N is the sequential counter for that indent level (reset when indent level changes or a non-ordered block interrupts)
      4. If `check`: prefix with `"  ".repeat(indent) + "- [ ] "` (or `"- [x] "` if checked)
      5. If no listType but has indent > 0: prefix with `"  ".repeat(indent)` (just indentation, no marker)
    - Handle the `toText` spec on nodes: the list-marker extension (Task 2) should add a `toText` serializer to blocks with listType. If that approach was used, update it here. If not, add the logic directly in `getTextBetween()`.
    - Remove the existing ListItem-specific logic at line 59 (`if (index === 0 && parent?.type.name === ListItem.name) return;`) since ListItem nodes won't exist in the flat model for bullet/ordered/check lists.
  - Write tests in `packages/editor/src/extensions/clipboard/tests/clipboard-text-serializer.test.ts`:
    - Test bullet at indent 0 → `"- text"`
    - Test bullet at indent 2 → `"    - text"` (4 spaces + dash)
    - Test ordered at indent 0 → `"1. text"`
    - Test ordered at indent 1 → `"  1. text"` (2 spaces + number)
    - Test sequential ordered items → counter increments (1., 2., 3.)
    - Test check unchecked → `"- [ ] text"`
    - Test check checked → `"- [x] text"`
    - Test plain paragraph at indent 1 → `"  text"` (indented, no marker)
    - Test mixed content → correct markers and indentation for each line

  **Must NOT do**:
  - Do NOT change how task list items or outline list items serialize to text (they still use nested structure)
  - Do NOT remove the `clipboardTextSerializer` export or change its signature
  - Do NOT add markdown-specific formatting beyond list markers (no bold/italic/etc. — that's handled by mark serializers)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Text serialization with counter logic and indent formatting is moderately complex but well-scoped
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 12)
  - **Blocks**: F3 (final QA needs text export to work)
  - **Blocked By**: Tasks 1, 2 (need block-indent and list-marker attributes to read from)

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/clipboard/clipboard-text-serializer.ts:25-69` — The ENTIRE existing text serializer. The `getTextBetween()` function iterates nodes via `slice.content.nodesBetween()` and builds text output. The `textSerializer` spec on node types is checked first. Line 59 has ListItem-specific logic that must be removed/updated.
  - `packages/editor/src/extensions/list-item/list-item.ts` — The existing ListItem extension's `toText` serializer (if any). Check if it defines a `toText` spec that the text serializer uses. This will be removed for flat model blocks.

  **API/Type References**:
  - `packages/editor/src/extensions/block-indent/block-indent.ts` (Task 1) — `indent` attribute on nodes (number)
  - `packages/editor/src/extensions/list-marker/list-marker.ts` (Task 2) — `listType` attribute (`bullet`|`ordered`|`check`) and `checked` attribute (boolean, for check type)

  **Test References**:
  - `packages/editor/src/extensions/clipboard/tests/clipboard-text-serializer.test.ts` — Existing text serializer tests. Shows test setup pattern: create editor content, call `clipboardTextSerializer()`, assert on plain text output.

  **WHY Each Reference Matters**:
  - `clipboard-text-serializer.ts` is the sole file to modify — must understand the `nodesBetween` iteration and `textSerializer` lookup pattern
  - ListItem's `toText` spec (if it exists) is what currently handles list text output — need to know what to replace
  - Existing tests show exact assertion style for text serialization

  **Acceptance Criteria**:

  - [ ] Bullet items export as `"- text"` with 2-space-per-level indentation
  - [ ] Ordered items export as `"1. text"` with sequential numbering per indent level
  - [ ] Check items export as `"- [ ] text"` / `"- [x] text"`
  - [ ] Plain indented paragraphs export with space indentation only (no marker)
  - [ ] Counter resets correctly between separate ordered sequences
  - [ ] `npx vitest run src/extensions/clipboard/tests/clipboard-text-serializer` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Copy bullet list to plain text
    Tool: Playwright
    Preconditions: Editor with bullet items at indent 0 ("A"), indent 1 ("B"), indent 0 ("C")
    Steps:
      1. Select all (Ctrl+A)
      2. Copy (Ctrl+C)
      3. Read clipboard plain text
    Expected Result: "- A\n  - B\n- C"
    Failure Indicators: No markers, wrong indentation, no newlines between items
    Evidence: .sisyphus/evidence/task-11-text-bullet.txt

  Scenario: Copy ordered list with numbering
    Tool: Playwright
    Preconditions: Editor with 3 ordered items at indent 0
    Steps:
      1. Select all and copy
      2. Read clipboard plain text
    Expected Result: "1. First\n2. Second\n3. Third"
    Failure Indicators: All numbered "1.", no numbering, wrong sequence
    Evidence: .sisyphus/evidence/task-11-text-ordered.txt

  Scenario: Copy check list items
    Tool: Playwright
    Preconditions: Editor with unchecked item and checked item
    Steps:
      1. Select all and copy
      2. Read clipboard plain text
    Expected Result: "- [ ] Todo\n- [x] Done"
    Failure Indicators: No checkbox markers, wrong checked state
    Evidence: .sisyphus/evidence/task-11-text-check.txt
  ```

  **Evidence to Capture:**
  - [ ] task-11-text-bullet.txt
  - [ ] task-11-text-ordered.txt
  - [ ] task-11-text-check.txt

  **Commit**: YES
  - Message: `feat(editor): update Markdown export for indented lists`
  - Files: `packages/editor/src/extensions/clipboard/clipboard-text-serializer.ts`, `packages/editor/src/extensions/clipboard/tests/clipboard-text-serializer.test.ts`
  - Pre-commit: `npx vitest run src/extensions/clipboard/tests/clipboard-text-serializer`

- [x] 12. Data Migration Integration — Existing Notes

  **What to do**:
  - Wire the `migrateNestedListsToFlat()` utility from Task 4 into the content loading pipeline:
    - In `packages/core/src/collections/content.ts`, add a new migration step in the `preProcess()` method (line ~315-334):
      1. After the existing `tiny → tiptap` migration check
      2. Check if `content.data` contains any nested list HTML tags (`<ul>`, `<ol>`, `<li>` but NOT `<ul data-type="taskList">` or `<ul data-type="outlineList">`)
      3. If yes, run `migrateNestedListsToFlat(content.data)` to transform the HTML string
      4. Set `changed = true` so the migrated content is persisted
    - Import the migration function from the editor package or duplicate it in core:
      - Option A (preferred): Export `migrateNestedListsToFlat` from `@notesnook/editor` and import in core
      - Option B: Copy the function to `packages/core/src/migrations.ts` alongside `tinyToTiptap`
      - Decision: Use Option B (same pattern as `tinyToTiptap` — migration functions live in core)
    - Add a detection heuristic to avoid re-migrating already-flat content:
      - If content has `data-indent` attributes AND no bare `<ul>`/`<ol>` wrappers (excluding task/outline), it's already migrated
      - If content has `<ul>` or `<ol>` without `data-type` attribute, it needs migration
    - Handle the migration of `packages/core/src/migrations.ts` file:
      - Add `migrateNestedListsToFlat(html: string): string` function
      - It should parse the HTML, walk the tree, convert `<ul>/<ol>/<li>` to flat `<p>` with `data-indent`/`data-list-type`, and serialize back to HTML string
      - This is essentially the same algorithm as Task 4's utility but operating on HTML strings (parse → transform → serialize)
  - Ensure migration is idempotent: running it twice on already-migrated content produces identical output
  - Write tests:
    - Test `<ul><li>A</li><li>B</li></ul>` → two `<p data-indent="0" data-list-type="bullet">` elements
    - Test nested lists → correct indent levels
    - Test mixed content (list + paragraph + list) → paragraphs untouched, lists converted
    - Test already-migrated content → no changes (idempotent)
    - Test content with task list → task list untouched, only basic lists converted
    - Test content with outline list → outline list untouched
    - Test `preProcess()` integration: content with nested lists gets migrated on load

  **Must NOT do**:
  - Do NOT migrate task list HTML (`<ul data-type="taskList">`) — these must stay nested
  - Do NOT migrate outline list HTML (`<ul data-type="outlineList">`) — these must stay nested
  - Do NOT modify existing `tinyToTiptap` migration logic
  - Do NOT run migration on every load if content is already migrated (use detection heuristic)
  - Do NOT add new npm dependencies for HTML parsing (use DOMParser or a lightweight regex-based approach consistent with existing migrations)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: HTML string transformation with tree walking, selective conversion, and idempotency requirements is complex
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11)
  - **Blocks**: F1, F3 (compliance audit and QA need migration working)
  - **Blocked By**: Task 4 (migration utility must exist first)

  **References**:

  **Pattern References**:
  - `packages/core/src/collections/content.ts:315-334` — The `preProcess()` method. This is WHERE to add the migration call. Follow the exact same pattern as the `tiny → tiptap` migration: check condition, transform data, set `changed = true`. The new migration goes AFTER the tiny→tiptap check (line 323) and BEFORE the block-id check (line 326).
  - `packages/core/src/migrations.ts:672+` — The existing `tinyToTiptap()` function. This is the PATTERN to follow: a function that takes an HTML string, transforms it, returns an HTML string. The new `migrateNestedListsToFlat()` should be defined in the same file, exported the same way.

  **API/Type References**:
  - `packages/editor/src/utils/indent-migration.ts` (Task 4 output) — The editor-side migration utility. The core migration function should implement the SAME transformation but as a standalone function (no TipTap dependencies, just HTML string → HTML string).

  **Test References**:
  - `packages/core/src/__tests__/` — Look for existing migration tests that test `tinyToTiptap` or `preProcess`. Follow the same pattern for testing `migrateNestedListsToFlat`.

  **WHY Each Reference Matters**:
  - `content.ts:preProcess()` is the ONLY place where load-time migrations run — must hook in here
  - `migrations.ts:tinyToTiptap()` is the exact pattern to follow for the new function
  - Task 4's utility defines the transformation algorithm — core version should be consistent

  **Acceptance Criteria**:

  - [ ] `migrateNestedListsToFlat()` function exists in `packages/core/src/migrations.ts`
  - [ ] `preProcess()` in `content.ts` calls migration for content with nested lists
  - [ ] Migration converts `<ul>/<ol>/<li>` to flat `<p>` blocks with `data-indent` and `data-list-type`
  - [ ] Task list and outline list HTML preserved unchanged
  - [ ] Migration is idempotent (running twice = same result)
  - [ ] Already-flat content detected and skipped
  - [ ] `npx vitest run` for migration tests → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Loading a note with nested bullet list triggers migration
    Tool: Bash (node/bun REPL)
    Preconditions: Test setup with mock content containing `<ul><li>A</li><li>B<ul><li>C</li></ul></li></ul>`
    Steps:
      1. Call preProcess() with the nested list content
      2. Read the output data
      3. Verify: no `<ul>` or `<li>` tags (except task/outline list)
      4. Verify: `<p data-indent="0" data-list-type="bullet">A</p>`
      5. Verify: `<p data-indent="0" data-list-type="bullet">B</p>`
      6. Verify: `<p data-indent="1" data-list-type="bullet">C</p>`
    Expected Result: Nested list HTML converted to flat paragraphs with indent attributes
    Failure Indicators: Original `<ul>/<li>` structure preserved, missing data-indent, wrong indent values
    Evidence: .sisyphus/evidence/task-12-migration-nested.txt

  Scenario: Already-migrated content not re-processed
    Tool: Bash (node/bun REPL)
    Preconditions: Content already in flat format: `<p data-indent="0" data-list-type="bullet">A</p>`
    Steps:
      1. Call preProcess() with already-flat content
      2. Compare input and output
    Expected Result: Output identical to input, `changed` is false (no unnecessary re-save)
    Failure Indicators: Content modified, double-indentation applied, attributes duplicated
    Evidence: .sisyphus/evidence/task-12-migration-idempotent.txt

  Scenario: Task list content preserved during migration
    Tool: Bash (node/bun REPL)
    Preconditions: Content with both nested bullet list AND task list: `<ul><li>Bullet</li></ul><ul data-type="taskList"><li data-type="taskItem">Task</li></ul>`
    Steps:
      1. Call migrateNestedListsToFlat() on the HTML
      2. Verify bullet list converted to flat paragraph
      3. Verify task list HTML unchanged (exact same `<ul data-type="taskList">` structure)
    Expected Result: Bullet list migrated, task list preserved exactly
    Failure Indicators: Task list converted to flat, task list attributes stripped
    Evidence: .sisyphus/evidence/task-12-migration-tasklist-preserved.txt
  ```

  **Evidence to Capture:**
  - [ ] task-12-migration-nested.txt
  - [ ] task-12-migration-idempotent.txt
  - [ ] task-12-migration-tasklist-preserved.txt

  **Commit**: YES
  - Message: `feat(editor): integrate data migration for existing notes`
  - Files: `packages/core/src/migrations.ts`, `packages/core/src/collections/content.ts`
  - Pre-commit: `npx vitest run`

- [ ] 13. Remove/Refactor Old Nested List Extensions

  **What to do**:
  - Refactor the old list extensions that are no longer needed for bullet/ordered/check lists:
    - `packages/editor/src/extensions/bullet-list/bullet-list.ts` — Remove or disable. The `BulletList` node type is no longer needed because bullets are now a `listType` attribute on paragraphs. However, the `parseHTML` rules must be kept (or moved to the migration/parser layer) so that existing HTML with `<ul>` tags can still be loaded.
    - `packages/editor/src/extensions/ordered-list/ordered-list.ts` — Same as bullet list: remove the node, keep parseHTML rules for backward compat.
    - `packages/editor/src/extensions/check-list/check-list.ts` and `packages/editor/src/extensions/check-list-item/check-list-item.ts` — Remove wrapper node. Check item rendering is now handled by the list-marker system.
    - `packages/editor/src/extensions/list-item/list-item.ts` — This is tricky: `ListItem` is still needed by task list and outline list. Keep the extension but remove any bullet/ordered/check-specific behavior from it.
    - Update `packages/editor/src/index.ts`:
      1. Remove `BulletList`, `OrderedList`, `CheckList`, `CheckListItem` from the extensions array
      2. Keep `ListItem` (needed by TaskList, OutlineList)
      3. Remove or update `ListKeymap` configuration — `ListKeymap` from `@tiptap/extension-list-keymap` handles Enter/Backspace in list items. It may still be needed for task/outline lists but NOT for flat-model blocks.
      4. Update `LIST_NODE_TYPES` in `packages/editor/src/utils/node-types.ts` — remove bulletList, orderedList, checkList from this array (they no longer exist as node types)
      5. Update `LIST_ITEM_NODE_TYPES` — keep taskItem, outlineListItem; remove checkListItem if it was there
    - Update `packages/editor/src/utils/list.ts`:
      - `isListActive()` — update to check `listType` attribute instead of checking for list wrapper node ancestry
      - `findListItemType()` — update or remove. This function finds the nearest list item node type for indent/outdent. With flat model, indent/outdent doesn't need this for bullet/ordered/check.
    - Update `packages/editor/src/utils/prosemirror.ts`:
      - `getParentAttributes()` — check if it references old list node types and update
  - Write tests:
    - Test that creating editor without old list extensions doesn't crash
    - Test that task list and outline list still register and work correctly
    - Test that `isListActive()` correctly detects flat-model list types
    - Test that content with old nested HTML still loads correctly (parseHTML compat)

  **Must NOT do**:
  - Do NOT remove TaskList, TaskItem, OutlineList, OutlineListItem extensions
  - Do NOT remove ListItem if it's still used by task/outline lists
  - Do NOT break the ability to load/parse old HTML content that contains `<ul>/<ol>/<li>` tags (backward compat for migration)
  - Do NOT remove `@tiptap/extension-list-keymap` if task lists still need it

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Removing interconnected extensions requires careful dependency analysis to avoid breaking task/outline lists. Need to trace every import and usage.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential — this must complete before Tasks 14, 15)
  - **Blocks**: Tasks 14, 15
  - **Blocked By**: Tasks 1-12 (all implementation must be done before removal)

  **References**:

  **Pattern References**:
  - `packages/editor/src/index.ts:45-80` — Extension imports. Shows where BulletList, OrderedList, CheckList, CheckListItem, ListItem are imported. These imports and their usage in the extensions array must be updated.
  - `packages/editor/src/index.ts:121-124` — CoreExtensions filtering. Shows how the editor filters out built-in extensions. May need to filter out default list extensions from StarterKit.
  - `packages/editor/src/index.ts:38` — `ListKeymap` import. Determine if this is still needed for task/outline lists only.
  - `packages/editor/src/utils/node-types.ts` — `LIST_NODE_TYPES` and `LIST_ITEM_NODE_TYPES` arrays. Must be updated to reflect which node types still exist.
  - `packages/editor/src/utils/list.ts` — `isListActive()` and `findListItemType()` utilities. Currently work by checking for nested list nodes in the document tree.

  **API/Type References**:
  - `packages/editor/src/extensions/task-list/task-list.ts` — Check what it imports from list-item, bullet-list, etc. Ensure no broken imports after removal.
  - `packages/editor/src/extensions/outline-list/outline-list.ts` — Same check for outline list dependencies.

  **Test References**:
  - `packages/editor/src/extensions/list-item/tests/list-item.test.ts` — Existing list item tests. Some may need updating, some may be removed (for bullet/ordered behavior), some kept (for task/outline behavior).

  **WHY Each Reference Matters**:
  - `index.ts` is the central registration point — all extension adds/removes happen here
  - `node-types.ts` arrays are used throughout the codebase for list detection — wrong arrays = broken features
  - `list.ts` utilities are called by toolbar, key-map, and other extensions — must be updated consistently
  - Task/outline list files must be checked to ensure they don't depend on removed extensions

  **Acceptance Criteria**:

  - [ ] BulletList, OrderedList, CheckList, CheckListItem node types no longer registered in editor
  - [ ] TaskList, TaskItem, OutlineList, OutlineListItem still work correctly
  - [ ] ListItem kept if needed by task/outline, removed if not
  - [ ] `LIST_NODE_TYPES` updated to only include remaining list types
  - [ ] `isListActive()` works with new flat-model `listType` attribute
  - [ ] Editor loads without errors after extension removal
  - [ ] Old HTML content with `<ul>/<ol>/<li>` still parseable (migration handles it)
  - [ ] `npx vitest run` → PASS (all tests pass, removed tests cleaned up)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Editor loads without old list extensions
    Tool: Playwright
    Preconditions: Fresh editor instance with updated extension list
    Steps:
      1. Open editor page
      2. Verify editor loads without console errors
      3. Type text, press Tab to indent
      4. Click bullet list button
      5. Verify bullet marker appears on indented text
    Expected Result: Editor functional without old list extensions
    Failure Indicators: Console errors about missing node types, extension registration errors, editor fails to load
    Evidence: .sisyphus/evidence/task-13-editor-loads.png

  Scenario: Task list still works after removal
    Tool: Playwright
    Preconditions: Editor loaded
    Steps:
      1. Create a task list item (if toolbar button exists, or via command)
      2. Type "Task item text"
      3. Press Tab → verify task item sinks (nests deeper)
      4. Press Shift+Tab → verify task item lifts
      5. Toggle checkbox
    Expected Result: Task list nesting and checkbox toggle work identically to before
    Failure Indicators: Task list not available, Tab doesn't nest, checkbox broken
    Evidence: .sisyphus/evidence/task-13-tasklist-works.png
  ```

  **Evidence to Capture:**
  - [ ] task-13-editor-loads.png
  - [ ] task-13-tasklist-works.png

  **Commit**: YES
  - Message: `refactor(editor): remove old nested list extensions`
  - Files: `packages/editor/src/index.ts`, `packages/editor/src/utils/node-types.ts`, `packages/editor/src/utils/list.ts`, old extension files
  - Pre-commit: `npx vitest run`

- [ ] 14. Task/Outline List Coexistence Testing

  **What to do**:
  - Verify that task lists and outline lists work correctly alongside the new flat indent model:
    - **Tab behavior context-switching**: When cursor is in a flat-model block (paragraph, heading, bullet-marked, etc.), Tab should call `indent()`. When cursor is in a task list item, Tab should call `sinkListItem(taskItem)`. When cursor is in an outline list item, Tab should call `sinkListItem(outlineListItem)`. The key-map (Task 5) should already handle this, but this task VERIFIES it end-to-end.
    - **Adjacent content**: Test blocks immediately before and after task/outline lists. Verify Tab does the right thing when moving between flat blocks and nested list items.
    - **Selection spanning both**: Test what happens when a selection spans flat-model blocks AND nested task list items, then user presses Tab. Expected: each block type responds to its own indent logic.
    - **Copy/paste interop**: Copy a flat-model bullet block and paste inside a task list → should it become a task item? Or stay as a flat paragraph? Decision: paste should respect the target context (task list paste produces task items, same as current behavior).
    - **HTML round-trip**: Export content with both flat blocks and task list items to HTML, then re-import. Verify both types preserved correctly.
  - Write comprehensive integration tests in `packages/editor/src/extensions/block-indent/__tests__/coexistence.test.ts`:
    - Test Tab in flat block → indent
    - Test Tab in task item → sink
    - Test Tab in outline item → sink
    - Test moving cursor from flat block to task item and pressing Tab
    - Test selection spanning flat + task items + Tab
    - Test copy flat bullet → paste in task list context
    - Test HTML export/import with mixed content

  **Must NOT do**:
  - Do NOT modify task list or outline list extension code (only test them)
  - Do NOT change task/outline Tab behavior
  - Do NOT introduce new dependencies between flat model and nested model

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration testing across two different document models (flat vs nested) with complex state transitions
  - **Skills**: [`playwright`]
    - `playwright`: Needed for end-to-end browser tests verifying keyboard behavior across different content types

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 15, after Task 13)
  - **Blocks**: F3, F4 (final QA and scope fidelity)
  - **Blocked By**: Task 13 (old extensions must be removed first to test the real final state)

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/key-map/key-map.ts` (updated in Task 5) — The Tab handler with context-switching logic. This is what determines whether Tab calls `indent()` or `sinkListItem()`. Tests must verify this logic works in the real editor.
  - `packages/editor/src/extensions/task-list/task-list.ts` — Task list extension. Check what keyboard shortcuts it registers and how it interacts with the global key-map.
  - `packages/editor/src/extensions/task-item/task-item.ts` — Task item node spec. Understand its structure to know how to create test content.
  - `packages/editor/src/extensions/outline-list/outline-list.ts` — Outline list extension. Same analysis.

  **Test References**:
  - `packages/editor/src/extensions/key-map/__tests__/key-map.test.ts` — Existing key-map tests. Shows how to test keyboard behavior in the editor (simulate key presses, assert on document state).
  - `packages/editor/src/extensions/list-item/tests/list-item.test.ts` — Shows how to test list nesting behavior.

  **WHY Each Reference Matters**:
  - The key-map is the central dispatch for Tab — tests must verify its context detection works
  - Task/outline list extensions may register their own keymap handlers that could conflict — need to understand their behavior
  - Existing test files show how to simulate keyboard input in the editor test framework

  **Acceptance Criteria**:

  - [ ] Tab in flat block → `indent()` (indent level increases)
  - [ ] Tab in task item → `sinkListItem()` (nests deeper in task list)
  - [ ] Tab in outline item → `sinkListItem()` (nests deeper in outline list)
  - [ ] Cursor movement between flat and nested blocks + Tab → correct behavior for each
  - [ ] Selection spanning both types + Tab → each type indents according to its own model
  - [ ] HTML round-trip preserves both flat blocks and nested task/outline items
  - [ ] `npx vitest run src/extensions/block-indent/__tests__/coexistence` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tab context-switches between flat and nested content
    Tool: Playwright
    Preconditions: Editor with: flat bullet paragraph, then task list with 2 items, then flat paragraph
    Steps:
      1. Click in flat bullet paragraph, press Tab → verify indent increases
      2. Click in first task item, press Tab → verify task item nests under previous (NOT indent attribute)
      3. Click in final flat paragraph, press Tab → verify indent increases
    Expected Result: Tab correctly context-switches between flat indent and nested sink
    Failure Indicators: Tab always indents (task items don't nest), or Tab always nests (flat blocks don't indent)
    Evidence: .sisyphus/evidence/task-14-tab-context.png

  Scenario: Mixed selection Tab behavior
    Tool: Playwright
    Preconditions: Editor with flat paragraph followed by task list item
    Steps:
      1. Select from middle of flat paragraph to middle of task item
      2. Press Tab
      3. Verify flat paragraph indent increased
      4. Verify task item nested deeper (or stayed put if selection-spanning-Tab is undefined for mixed)
    Expected Result: Each block type responds to its own indent logic within the selection
    Failure Indicators: One type's behavior overrides the other, errors thrown, content corrupted
    Evidence: .sisyphus/evidence/task-14-mixed-selection.png
  ```

  **Evidence to Capture:**
  - [ ] task-14-tab-context.png
  - [ ] task-14-mixed-selection.png

  **Commit**: YES
  - Message: `test(editor): verify task/outline list coexistence`
  - Files: `packages/editor/src/extensions/block-indent/__tests__/coexistence.test.ts`
  - Pre-commit: `npx vitest run src/extensions/block-indent/__tests__/coexistence`

- [ ] 15. Edge Cases & Regression Tests

  **What to do**:
  - Write comprehensive edge case and regression tests covering scenarios that individual task tests may have missed:
    - **Multi-block selection operations**:
      - Select 5 blocks at different indent levels, press Tab → all indent by 1
      - Select mixed list-type and plain blocks, press Tab → all indent, types preserved
      - Select and delete blocks at various indents → no orphaned indent attributes
    - **Undo/Redo coherence**:
      - Indent a block (Tab), then Undo (Ctrl+Z) → indent reverts to previous level
      - Change list type, then Undo → list type reverts, indent preserved
      - Multiple sequential indents, then Undo multiple times → each step undoes correctly
      - Indent, type change, indent → Undo 3 times → back to original state
    - **Drag and drop**:
      - Drag an indented block to a new position → indent level preserved
      - Drag a list-marked block between plain paragraphs → list type and indent preserved
    - **Enter/Backspace behavior**:
      - Press Enter at end of indented bullet block → new block inherits indent and listType
      - Press Enter at end of indented plain paragraph → new block inherits indent, no listType
      - Press Backspace at start of indented empty bullet block → remove listType, keep indent (or reduce indent? — follow OneNote: Backspace on empty list item removes marker first, second Backspace removes indent)
      - Press Backspace at start of indent-0 empty block → delete block (merge with previous)
    - **Empty document edge cases**:
      - Tab on the only (empty) paragraph in document → indents to level 1
      - Shift-Tab on indent 0 → no change, no error
    - **Large documents**:
      - Create 100 blocks at various indent levels → verify performance (no visible lag on Tab)
    - **Keyboard shortcuts**:
      - Verify no keyboard shortcut conflicts between indent and other features
      - Tab in table cell → moves to next cell (NOT indent)
      - Tab in code block → inserts tab/spaces (NOT indent)
  - All tests go in `packages/editor/src/extensions/block-indent/__tests__/edge-cases.test.ts`

  **Must NOT do**:
  - Do NOT fix bugs found by these tests within this task — if a test reveals a bug, file it as a note in the test (`.todo` or `.skip`) and report it. The fix should go back to the responsible task.
  - Do NOT duplicate tests that already exist in Tasks 1-14
  - Do NOT test task/outline list edge cases (covered by Task 14)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Edge case testing requires creative adversarial thinking and deep understanding of ProseMirror's transaction/history system
  - **Skills**: [`playwright`]
    - `playwright`: Needed for drag-and-drop, keyboard, and real-browser interaction tests

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 14, after Task 13)
  - **Blocks**: F3 (final QA)
  - **Blocked By**: Task 13 (old extensions must be removed first to test the real final state)

  **References**:

  **Pattern References**:
  - `packages/editor/src/extensions/block-indent/block-indent.ts` (Task 1) — The indent extension with `indent()` and `outdent()` commands. Edge cases test the boundaries of these commands.
  - `packages/editor/src/extensions/list-marker/list-marker.ts` (Task 2) — The list marker system. Edge cases test marker inheritance on Enter, removal on Backspace.
  - `packages/editor/src/extensions/key-map/key-map.ts` (Task 5) — The Tab handler. Edge cases verify it correctly delegates to indent vs table-next-cell vs code-block-tab.

  **Test References**:
  - `packages/editor/src/extensions/key-map/__tests__/key-map.test.ts` — Existing keyboard tests. Shows how to simulate multi-key sequences, test focus behavior.
  - `packages/editor/src/extensions/check-list-item/__tests__/check-list-item.test.ts` — Shows Enter/Backspace behavior testing patterns for list-like blocks.

  **WHY Each Reference Matters**:
  - Extension files define the commands being edge-case-tested — need to understand their semantics
  - Existing test files show patterns for simulating complex keyboard interactions

  **Acceptance Criteria**:

  - [ ] Multi-block selection Tab/Shift-Tab works correctly
  - [ ] Undo/Redo correctly reverts indent and list type changes
  - [ ] Enter inherits indent and list type from previous block
  - [ ] Backspace on empty list block removes marker first, then indent
  - [ ] Tab in table/code block NOT intercepted by indent system
  - [ ] Shift-Tab at indent 0 is a no-op (no error)
  - [ ] Performance: 100 blocks indent without visible lag
  - [ ] `npx vitest run src/extensions/block-indent/__tests__/edge-cases` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Undo reverts indent change
    Tool: Playwright
    Preconditions: Editor with paragraph at indent 0
    Steps:
      1. Press Tab → indent becomes 1
      2. Press Ctrl+Z
      3. Verify indent back to 0
    Expected Result: Undo cleanly reverts the indent attribute change
    Failure Indicators: Indent stays at 1, error thrown, extra undo steps needed
    Evidence: .sisyphus/evidence/task-15-undo-indent.txt

  Scenario: Enter inherits indent and list type
    Tool: Playwright
    Preconditions: Editor with bullet block at indent 2, cursor at end
    Steps:
      1. Press Enter
      2. Verify new block has indent 2
      3. Verify new block has listType bullet
      4. Type "new text"
    Expected Result: New line continues the list at same indent level
    Failure Indicators: New block at indent 0, no list marker, indent reset
    Evidence: .sisyphus/evidence/task-15-enter-inherit.txt

  Scenario: Tab in table cell moves to next cell
    Tool: Playwright
    Preconditions: Editor with a 2x2 table, cursor in first cell
    Steps:
      1. Press Tab
      2. Verify cursor moved to second cell (not indent applied)
    Expected Result: Tab navigates table cells, not indent
    Failure Indicators: Cell content indented, cursor stays in same cell
    Evidence: .sisyphus/evidence/task-15-tab-table.txt
  ```

  **Evidence to Capture:**
  - [ ] task-15-undo-indent.txt
  - [ ] task-15-enter-inherit.txt
  - [ ] task-15-tab-table.txt

  **Commit**: YES
  - Message: `test(editor): comprehensive edge case and regression tests`
  - Files: `packages/editor/src/extensions/block-indent/__tests__/edge-cases.test.ts`
  - Pre-commit: `npx vitest run src/extensions/block-indent/__tests__/edge-cases`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `tsc --noEmit` + linter + `npx vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
      Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
      Start from clean state. Load editor with sample content. Test:

  1. Tab on empty paragraph → indent increases (visually shifts right)
  2. Create bullet list → Tab → indent increases, bullet stays
  3. Change bullet to ordered → indent preserved, numbering correct
  4. Change ordered to checklist → indent preserved, checkbox appears
  5. Change checklist to plain paragraph → indent preserved, marker gone
  6. Paste nested HTML list → auto-converts to flat indent
  7. Copy flat-indent content → clipboard has nested HTML
  8. Task list Tab behavior unchanged
  9. Outline list behavior unchanged
  10. Ordered numbering: 1. → a. → i. at increasing indent levels
      Save to `.sisyphus/evidence/final-qa/`.
      Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(editor): add block indent extension with global indent attribute` — block-indent extension files + tests
- **Wave 1**: `feat(editor): add list marker attribute system` — list-marker extension files + tests
- **Wave 1**: `style(editor): add CSS for indent level rendering` — CSS files
- **Wave 1**: `feat(editor): add nested-to-flat HTML migration utility` — migration utility + tests
- **Wave 2**: `feat(editor): rework Tab/Shift-Tab for universal indent/outdent` — key-map changes + tests
- **Wave 2**: `feat(editor): implement flat list type toggle commands` — list toggle commands + tests
- **Wave 2**: `feat(editor): add OneNote-style ordered list numbering` — numbering logic + tests
- **Wave 2**: `feat(editor): update toolbar for universal indent/outdent` — toolbar changes
- **Wave 3**: `feat(editor): update clipboard serializer for flat-to-nested HTML export` — clipboard serializer + tests
- **Wave 3**: `feat(editor): update clipboard parser for nested-to-flat HTML import` — clipboard parser + tests
- **Wave 3**: `feat(editor): update Markdown export for indented lists` — Markdown changes + tests
- **Wave 3**: `feat(editor): integrate data migration for existing notes` — migration integration + tests
- **Wave 4**: `refactor(editor): remove old nested list extensions` — cleanup + tests
- **Wave 4**: `test(editor): verify task/outline list coexistence` — coexistence tests
- **Wave 4**: `test(editor): comprehensive edge case and regression tests` — edge case tests

---

## Success Criteria

### Verification Commands

```bash
npx vitest run                    # Expected: all tests pass, 0 failures
tsc --noEmit                      # Expected: no type errors
```

### Final Checklist

- [ ] All "Must Have" present and verified
- [ ] All "Must NOT Have" absent (no task/outline list changes, no prosemirror-flat-list dep, etc.)
- [ ] All Vitest tests pass
- [ ] Existing notes render identically after migration
- [ ] Tab/Shift-Tab works universally across all block types
- [ ] List type switching preserves indent
- [ ] Clipboard interop verified (copy produces nested HTML, paste converts to flat)
- [ ] Task list and outline list behavior completely unchanged
