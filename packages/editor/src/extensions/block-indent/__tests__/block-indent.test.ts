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
