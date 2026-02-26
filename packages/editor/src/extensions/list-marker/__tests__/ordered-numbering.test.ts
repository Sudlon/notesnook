import { test, expect } from "vitest";
import { createEditor } from "../../../../test-utils";
import { ListMarker } from "../list-marker";
import { BlockIndent } from "../../block-indent";
import {
  formatAlpha,
  formatRoman,
  formatDecimal,
  formatNumberByIndent,
  computeOrderedNumbers,
  applyNumberingToTransaction
} from "../ordered-numbering";

/**
 * Test Suite: OneNote-Style Ordered List Numbering
 */

// Helper to apply numbering to an editor
function applyNumbering(editor: any) {
  const { state, view } = editor;
  const tr = state.tr;
  const hasChanges = applyNumberingToTransaction(tr, state.doc);
  if (tr.docChanged || hasChanges) {
    view.dispatch(tr);
  }
}

// ============================================================================
// TEST 1: Simple sequential numbering at indent 0
// ============================================================================
test("three consecutive ordered blocks at indent 0 show 1, 2, 3", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: `
      <p data-indent="0" data-list-type="ordered">First</p>
      <p data-indent="0" data-list-type="ordered">Second</p>
      <p data-indent="0" data-list-type="ordered">Third</p>
    `
  });

  applyNumbering(editor);
  const html = editor.getHTML();
  expect(html).toContain('data-list-number="1"');
  expect(html).toContain('data-list-number="2"');
  expect(html).toContain('data-list-number="3"');
});

// ============================================================================
// TEST 2: Format cycling by indent level
// ============================================================================
test("format cycles by indent level: 0=decimal, 1=alpha, 2=roman", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: `
      <p data-indent="0" data-list-type="ordered">Indent 0</p>
      <p data-indent="1" data-list-type="ordered">Indent 1</p>
      <p data-indent="2" data-list-type="ordered">Indent 2</p>
      <p data-indent="3" data-list-type="ordered">Indent 3</p>
    `
  });

  applyNumbering(editor);
  const html = editor.getHTML();
  expect(html).toContain('data-list-number="1"');
  expect(html).toContain('data-list-number="a"');
  expect(html).toContain('data-list-number="i"');
  const matches = html.match(/data-list-number="[^"]+"/g) || [];
  expect(matches.length).toBe(4);
});

// ============================================================================
// TEST 3: Counter reset after non-ordered block
// ============================================================================
test("counter resets after non-ordered block", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: `
      <p data-indent="0" data-list-type="ordered">First</p>
      <p data-indent="0" data-list-type="bullet">Bullet</p>
      <p data-indent="0" data-list-type="ordered">After bullet</p>
    `
  });

  applyNumbering(editor);
  const html = editor.getHTML();
  const lines = html.split("<p");

  expect(lines[1]).toContain('data-list-number="1"');
  expect(lines[2]).not.toContain("data-list-number");
  expect(lines[3]).toContain('data-list-number="1"');
});

// ============================================================================
// TEST 4: Independent counters per indent level
// ============================================================================
test("each indent level maintains independent counter", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: `
      <p data-indent="0" data-list-type="ordered">A</p>
      <p data-indent="1" data-list-type="ordered">A1</p>
      <p data-indent="1" data-list-type="ordered">A2</p>
      <p data-indent="0" data-list-type="ordered">B</p>
    `
  });

  applyNumbering(editor);
  const html = editor.getHTML();
  const numbers = [...html.matchAll(/data-list-number="([^"]+)"/g)].map(m => m[1]);
  expect(numbers).toEqual(["1", "a", "b", "2"]);
});

// ============================================================================
// TEST 5: formatAlpha utility
// ============================================================================
test("alpha format: 1=a, 26=z, 27=aa, 28=ab, 52=az, 53=ba", () => {
  expect(formatAlpha(1)).toBe("a");
  expect(formatAlpha(26)).toBe("z");
  expect(formatAlpha(27)).toBe("aa");
  expect(formatAlpha(28)).toBe("ab");
  expect(formatAlpha(52)).toBe("az");
  expect(formatAlpha(53)).toBe("ba");
});

// ============================================================================
// TEST 6: formatRoman utility
// ============================================================================
test("roman format: 1=i, 2=ii, 3=iii, 4=iv, 5=v, 9=ix, 10=x", () => {
  expect(formatRoman(1)).toBe("i");
  expect(formatRoman(2)).toBe("ii");
  expect(formatRoman(3)).toBe("iii");
  expect(formatRoman(4)).toBe("iv");
  expect(formatRoman(5)).toBe("v");
  expect(formatRoman(9)).toBe("ix");
  expect(formatRoman(10)).toBe("x");
});

// ============================================================================
// TEST 7: Complex scenario
// ============================================================================
test("complex scenario: mixed indents with interruptions", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: `
      <p data-indent="0" data-list-type="ordered">1</p>
      <p data-indent="0" data-list-type="ordered">2</p>
      <p data-indent="1" data-list-type="ordered">2a</p>
      <p data-indent="1" data-list-type="ordered">2b</p>
      <p data-indent="0" data-list-type="ordered">3</p>
      <p data-indent="0">Plain text</p>
      <p data-indent="0" data-list-type="ordered">Restart</p>
    `
  });

  applyNumbering(editor);
  const html = editor.getHTML();
  const numbers = [...html.matchAll(/data-list-number="([^"]+)"/g)].map(m => m[1]);
  expect(numbers).toEqual(["1", "2", "a", "b", "3", "1"]);
});

// ============================================================================
// TEST 8: Deep nesting
// ============================================================================
test("deep nesting shows format cycle: 0-6 = 1,a,i,1,a,i,1", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: `
      <p data-indent="0" data-list-type="ordered">L0</p>
      <p data-indent="1" data-list-type="ordered">L1</p>
      <p data-indent="2" data-list-type="ordered">L2</p>
      <p data-indent="3" data-list-type="ordered">L3</p>
      <p data-indent="4" data-list-type="ordered">L4</p>
      <p data-indent="5" data-list-type="ordered">L5</p>
      <p data-indent="6" data-list-type="ordered">L6</p>
    `
  });

  applyNumbering(editor);
  const html = editor.getHTML();
  const numbers = [...html.matchAll(/data-list-number="([^"]+)"/g)].map(m => m[1]);
  expect(numbers).toEqual(["1", "a", "i", "1", "a", "i", "1"]);
});

// ============================================================================
// TEST 9: formatNumberByIndent
// ============================================================================
test("formatNumberByIndent cycles: indent%3 determines format", () => {
  expect(formatNumberByIndent(1, 0)).toBe("1");
  expect(formatNumberByIndent(2, 3)).toBe("2");
  expect(formatNumberByIndent(3, 6)).toBe("3");

  expect(formatNumberByIndent(1, 1)).toBe("a");
  expect(formatNumberByIndent(2, 4)).toBe("b");
  expect(formatNumberByIndent(3, 7)).toBe("c");

  expect(formatNumberByIndent(1, 2)).toBe("i");
  expect(formatNumberByIndent(2, 5)).toBe("ii");
  expect(formatNumberByIndent(3, 8)).toBe("iii");
});

// ============================================================================
// TEST 10: Non-ordered blocks
// ============================================================================
test("non-ordered blocks (bullet, check, plain) have no data-list-number", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: `
      <p data-indent="0" data-list-type="bullet">Bullet</p>
      <p data-indent="0" data-list-type="check" data-checked="false">Check</p>
      <p data-indent="0">Plain</p>
    `
  });

  applyNumbering(editor);
  const html = editor.getHTML();
  const numbers = [...html.matchAll(/data-list-number="([^"]+)"/g)];
  expect(numbers.length).toBe(0);
});

// ============================================================================
// TEST 11: formatDecimal
// ============================================================================
test("formatDecimal returns string number", () => {
  expect(formatDecimal(1)).toBe("1");
  expect(formatDecimal(10)).toBe("10");
  expect(formatDecimal(100)).toBe("100");
});

// ============================================================================
// TEST 12: Dynamic updates
// ============================================================================
test("inserting new ordered block updates numbering", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: `
      <p data-indent="0" data-list-type="ordered">First</p>
      <p data-indent="0" data-list-type="ordered">Third</p>
    `
  });

  applyNumbering(editor);
  let html = editor.getHTML();
  let numbers = [...html.matchAll(/data-list-number="([^"]+)"/g)].map(m => m[1]);
  expect(numbers).toEqual(["1", "2"]);

  // Update content with 3 items
  editor.commands.setContent(
    `
      <p data-indent="0" data-list-type="ordered">First</p>
      <p data-indent="0" data-list-type="ordered">Second</p>
      <p data-indent="0" data-list-type="ordered">Third</p>
    `
  );

  applyNumbering(editor);
  html = editor.getHTML();
  numbers = [...html.matchAll(/data-list-number="([^"]+)"/g)].map(m => m[1]);
  expect(numbers).toEqual(["1", "2", "3"]);
});
