/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { describe, it, expect } from "vitest";
import { migrateNestedListsToFlat } from "../migrations.js";

describe("migrateNestedListsToFlat", () => {
  it("should convert simple nested bullet list to flat paragraphs with correct indent", () => {
    const html = `<ul><li>Item 1<ul><li>Item 1.1</li><li>Item 1.2</li></ul></li><li>Item 2</li></ul>`;
    const result = migrateNestedListsToFlat(html);

    // Check for converted items with correct list type and indent
    expect(result).toContain(`Item 1</p>`);
    expect(result).toContain(`data-list-type="bullet"`);
    expect(result).toContain(`Item 1.1</p>`);
    expect(result).toContain(`Item 1.2</p>`);
    expect(result).toContain(`data-indent="1"`);
    expect(result).toContain(`Item 2</p>`);
    // Original list should be removed
    expect(result).not.toContain(`<ul`);
    expect(result).not.toContain(`<li`);
  });

  it("should convert nested ordered list with correct data-list-type", () => {
    const html = `<ol><li>First<ol><li>First.1</li><li>First.2</li></ol></li><li>Second</li></ol>`;
    const result = migrateNestedListsToFlat(html);

    expect(result).toContain(`First</p>`);
    expect(result).toContain(`data-list-type="ordered"`);
    expect(result).toContain(`First.1</p>`);
    expect(result).toContain(`First.2</p>`);
    expect(result).toContain(`data-indent="1"`);
    expect(result).toContain(`Second</p>`);
  });

  it("should preserve task list HTML unchanged", () => {
    const html = `<ul data-type="taskList"><li data-checked="false" data-task-id="task1">Task 1</li><li data-checked="true" data-task-id="task2">Task 2</li></ul>`;
    const result = migrateNestedListsToFlat(html);

    // Task list should remain unchanged
    expect(result).toContain(`<ul data-type="taskList"`);
    expect(result).toContain(`data-task-id="task1"`);
    expect(result).toContain(`data-task-id="task2"`);
    // Should not have been converted to data-list-type
    expect(result).not.toContain(`data-list-type="check"`);
  });

  it("should preserve outline list HTML unchanged", () => {
    const html = `<ul data-type="outlineList"><li>Outline 1</li><li>Outline 2</li></ul>`;
    const result = migrateNestedListsToFlat(html);

    // Outline list should remain unchanged
    expect(result).toContain(`<ul data-type="outlineList"`);
    expect(result).toContain(`<li>Outline 1</li>`);
    expect(result).toContain(`<li>Outline 2</li>`);
  });

  it("should be idempotent - running twice produces identical output", () => {
    const html = `<ul><li>Item 1<ul><li>Item 1.1</li></ul></li></ul>`;
    const result1 = migrateNestedListsToFlat(html);
    const result2 = migrateNestedListsToFlat(result1);

    expect(result1).toBe(result2);
  });

  it("should not modify already-flat content with data-indent", () => {
    const html = `<p data-list-type="bullet">Item 1</p><p data-indent="1" data-list-type="bullet">Item 1.1</p>`;
    const result = migrateNestedListsToFlat(html);

    expect(result).toBe(html);
  });

  it("should handle mixed content with paragraphs and lists", () => {
    const html = `<p>Some text</p><ul><li>List item</li></ul><p>More text</p>`;
    const result = migrateNestedListsToFlat(html);

    expect(result).toContain(`<p>Some text</p>`);
    expect(result).toContain(`List item</p>`);
    expect(result).toContain(`data-list-type="bullet"`);
    expect(result).toContain(`<p>More text</p>`);
    // Original list should be removed
    expect(result).not.toContain(`<ul`);
    expect(result).not.toContain(`<li`);
  });

  it("should handle deeply nested lists (3+ levels)", () => {
    const html = `<ul><li>Level 1<ul><li>Level 2<ul><li>Level 3</li></ul></li></ul></li></ul>`;
    const result = migrateNestedListsToFlat(html);

    expect(result).toContain(`Level 1</p>`);
    expect(result).toContain(`Level 2</p>`);
    expect(result).toContain(`Level 3</p>`);
    expect(result).toContain(`data-list-type="bullet"`);
    expect(result).toContain(`data-indent="1"`);
    expect(result).toContain(`data-indent="2"`);
  });

  it("should handle checklists with proper attributes", () => {
    const html = `<ul class="checklist"><li data-checked="true">Checked item<ul class="checklist"><li data-checked="false">Unchecked nested</li></ul></li></ul>`;
    const result = migrateNestedListsToFlat(html);

    expect(result).toContain(`data-list-type="check"`);
    expect(result).toContain(`data-checked="true"`);
    expect(result).toContain(`data-indent="1"`);
  });

  it("should return original HTML if input is not a string", () => {
    const result = migrateNestedListsToFlat(null as any);
    expect(result).toBe(null);
  });

  it("should handle empty lists gracefully", () => {
    const html = `<ul><li></li></ul>`;
    const result = migrateNestedListsToFlat(html);

    expect(result).toContain(`<p data-list-type="bullet"></p>`);
  });
});
