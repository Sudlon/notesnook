import { test, expect } from "vitest";
import { migrateNestedListsToFlat } from "../indent-migration";

test("migrates simple bullet list", () => {
  const input = `<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>`;
  const output = migrateNestedListsToFlat(input);

  expect(output).toContain('data-list-type="bullet"');
  expect(output).toContain("Item 1");
  expect(output).toContain("Item 2");
  expect(output).not.toContain("<ul>");
  expect(output).not.toContain("<li>");
});

test("migrates nested bullet list with correct indent levels", () => {
  const input = `<ul><li><p>Item 1</p><ul><li><p>Sub item</p></li></ul></li><li><p>Item 2</p></li></ul>`;
  const output = migrateNestedListsToFlat(input);

  expect(output).toContain('data-list-type="bullet"');
  expect(output).toContain('data-indent="1"');
  expect(output).toContain("Item 1");
  expect(output).toContain("Sub item");
  expect(output).toContain("Item 2");
});

test("migrates ordered list", () => {
  const input = `<ol><li><p>First</p></li><li><p>Second</p></li></ol>`;
  const output = migrateNestedListsToFlat(input);

  expect(output).toContain('data-list-type="ordered"');
  expect(output).toContain("First");
  expect(output).toContain("Second");
});

test("passes through non-list content unchanged", () => {
  const input = `<p>Normal paragraph</p><h1>Heading</h1>`;
  const output = migrateNestedListsToFlat(input);

  expect(output).toContain("Normal paragraph");
  expect(output).toContain("Heading");
  expect(output).toContain("<h1>");
});

test("skips task lists with data-task-id attribute", () => {
  const input = `<ul class="checklist"><li data-task-id="123"><p>Task</p></li></ul>`;
  const output = migrateNestedListsToFlat(input);

  // Should remain unchanged
  expect(output).toContain("<ul");
  expect(output).toContain("data-task-id");
});
