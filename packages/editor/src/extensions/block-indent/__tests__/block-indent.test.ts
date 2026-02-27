import { test, expect } from "vitest";
import { createEditor, h, p } from "../../../../test-utils";
import { BlockIndent } from "../block-indent";

test("extension loads without errors", () => {
  const { editor } = createEditor({
    extensions: {
      blockIndent: BlockIndent
    },
    initialContent: "<p>Hello world</p>"
  });

  expect(editor).toBeDefined();
  expect(editor.getHTML()).toContain("Hello world");
});

test("indent() increases paragraph indent from 0 to 1", () => {
  const { editor } = createEditor({
    extensions: { blockIndent: BlockIndent },
    initialContent: "<p>Hello</p>"
  });
  
  editor.commands.indent();
  
  expect(editor.getHTML()).toContain('data-indent="1"');
});

test("outdent() at indent 0 stays at 0", () => {
  const { editor } = createEditor({
    extensions: { blockIndent: BlockIndent },
    initialContent: "<p>Text</p>"
  });
  
  editor.commands.outdent();
  
  expect(editor.getHTML()).not.toContain('data-indent');
});

test("setIndent sets specific level", () => {
  const { editor } = createEditor({
    extensions: { blockIndent: BlockIndent },
    initialContent: "<p>Text</p>"
  });
  
  editor.commands.setIndent(5);
  
  expect(editor.getHTML()).toContain('data-indent="5"');
});
