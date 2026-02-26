import { test, expect } from "vitest";
import { createEditor } from "../../../../test-utils";
import { ListMarker } from "../list-marker";
import { BlockIndent } from "../../block-indent";

test("toggleBulletMarker on plain paragraph adds bullet", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: "<p>Text</p>"
  });

  editor.commands.toggleBulletMarker();

  expect(editor.getHTML()).toContain('data-list-type="bullet"');
});

test("toggleBulletMarker twice toggles on then off", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker
    },
    initialContent: "<p>Text</p>"
  });

  editor.commands.toggleBulletMarker();
  expect(editor.getHTML()).toContain('data-list-type="bullet"');

  editor.commands.toggleBulletMarker();
  expect(editor.getHTML()).not.toContain("data-list-type");
});

test("toggle preserves indent", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker,
      blockIndent: BlockIndent
    },
    initialContent: '<p data-indent="3">Text</p>'
  });

  editor.commands.toggleBulletMarker();

  const html = editor.getHTML();
  expect(html).toContain('data-indent="3"');
  expect(html).toContain('data-list-type="bullet"');
});

test("toggleChecked toggles checked state", () => {
  const { editor } = createEditor({
    extensions: {
      listMarker: ListMarker
    },
    initialContent: '<p data-list-type="check" data-checked="false">Task</p>'
  });

  editor.commands.toggleChecked();

  expect(editor.getHTML()).toContain('data-checked="true"');
});
