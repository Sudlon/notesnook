# Decisions — OneNote Indentation

## [2026-02-26T21:36:36Z] Architectural Decisions from Planning

### Data Model

- **Indent Attribute**: Global attribute on paragraph, heading, blockquote (default: 0, no limit)
- **List Marker Attribute**: `listType` values: null, "bullet", "ordered", "check"
- **Check State**: Separate `checked` boolean attribute for check type
- **Ordered Numbers**: Computed at render-time per indent level (not stored)

### Scope Boundaries

- **IN SCOPE**: bullet, ordered, check lists → flat model
- **OUT OF SCOPE**: task list, outline list → stay nested
- **OUT OF SCOPE**: table/code block Tab behavior → unchanged

### Backward Compatibility

- **Migration Pattern**: Follow `tinyToTiptap` pattern in `packages/core/src/migrations.ts`
- **Detection**: Check for `<ul>`/`<ol>` without `data-type` attribute
- **Idempotency**: Already-flat content (has `data-indent`) skipped

### Export/Import

- **HTML Export**: Reconstruct nested `<ul>/<ol>/<li>` from flat blocks
- **HTML Import (Paste)**: Convert nested lists to flat blocks
- **Markdown**: Indented syntax (spaces before marker, 2 spaces per level)

### Keyboard Behavior

- **Tab**: Always indent (context-switches for task/outline)
- **Enter**: Inherit indent + listType from previous block
- **Backspace on empty**: Remove marker first, second Backspace reduces indent
