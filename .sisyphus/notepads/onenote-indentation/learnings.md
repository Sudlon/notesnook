1#KM|# Learnings — OneNote Indentation
2#KM|
3#YT|## [2026-02-26T21:36:36Z] Session Start
4#RW|
5#BJ|### Architecture Overview
6#SY|
7#QY|- **Flat Model**: Every block has `indent` attribute (0-∞), list markers are separate `listType` attribute
8#WV|- **Backward Compat**: Data migration in `preProcess()` runs on existing notes
9#JS|- **Clipboard Round-trip**: Flat→nested HTML on copy, nested→flat on paste
10#RT|- **Task/Outline Untouched**: Stay fully nested, Tab still sinks/lifts
11#TJ|
12#KY|### Key Technical Decisions
13#BQ|
14#QY|- Use `addGlobalAttributes()` for indent (not prosemirror-flat-list)
15#VX|- `data-indent` attribute for persistence (not just CSS)
16#QZ|- Migration is idempotent (won't re-process already-flat content)
17#HX|- OneNote-style numbering: 1. → a. → i. per indent level
18#KS|
19#XY|### Test Infrastructure
20#YQ|
21#MN|- Framework: Vitest (`npx vitest run` in packages/editor)
22#TX|- Helper: `createEditor()` from `packages/editor/test-utils/`
23#VM|- Patterns: Snapshot-based with `getHTML()`, DOM helpers `h()`, `p()`, `ul()`, `li()`
24#JJ|- TDD approach: RED → GREEN → REFACTOR
25#XW|
26#ZJ|### File Organization
27#JJ|
28#JS|- Extensions: `packages/editor/src/extensions/{block-indent,list-marker}/`
29#MZ|- Utils: `packages/editor/src/utils/indent-migration.ts`
30#SK|- Tests: `__tests__/` subdirs within each extension
31#BH|- CSS: `packages/editor/src/extensions/block-indent/block-indent.css`
32#KM|
33#RW|### [2026-02-26T22:XX:XXZ] Task 3: CSS Indent & Marker Rendering — COMPLETE
34#BJ|
35#SY|**CSS Implementation Complete**
36#QY|- File: `packages/editor/src/extensions/block-indent/block-indent.css` (120 lines)
37#WV|- Indent rules: `[data-indent="N"]` with progressive `padding-left: Nem * 2` for levels 1-20
38#JS|- Bullet markers: `[data-list-type="bullet"]::before { content: "•"; margin-right: 0.5em; }`
39#RT|- Ordered markers: `[data-list-type="ordered"]::before { content: attr(data-list-number) "."; margin-right: 0.5em; }`
40#TJ|- Check placeholders: `[data-list-type="check"]` with relative positioning for checkbox injection (Task 2)
41#KS|
42#HX|**Import & Integration**
43#VX|- Added import to `packages/editor/styles/styles.css` at top of file
44#QZ|- No conflicts with existing list CSS (task lists, outline lists remain nested)
45#JS|- CSS-only solution: no JavaScript involved in visual indentation
46#RT|
47#BJ|**Visual Verification**
48#SY|✅ Playwright automated testing completed:
49#QY|- Screenshot 1: Indent progression (levels 0-3) showing 0em, 2em, 4em, 6em spacing
50#WV|- Screenshot 2: List markers visible (bullets •) before text with correct indentation
51#JS|- Console validation: 0 errors, 0 warnings in browser
52#RT|- Evidence: `.sisyphus/evidence/task-3-indent-rendering.png` and `task-3-marker-rendering.png`
53#TJ|
54#KS|**Git Commit**
55#HX|- Commit: `767a5db0c` "editor: add CSS for indent level and list marker rendering"
56#VX|- Files: `block-indent.css` (new), `styles.css` (modified import)
57#QZ|- Format: Conventional commit with signed-off-by per repo commitlint rules
58#BH|
