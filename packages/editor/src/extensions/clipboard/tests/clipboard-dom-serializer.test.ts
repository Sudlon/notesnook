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
import { ClipboardDOMSerializer } from "../clipboard-dom-serializer.js";

/**
 * Helper to test the flat-to-nested reconstruction
 * Creates a serializer instance and calls the private reconstruction method
 */
function reconstructHTML(htmlString: string): string {
  const template = document.createElement("template");
  template.innerHTML = htmlString;
  const fragment = template.content as any;

  // Create a serializer instance
  const serializer = new ClipboardDOMSerializer({}, {});

  // Call the private method through bracket notation
  (serializer as any).reconstructNestedLists(fragment);

  // Fragment doesn't have innerHTML, so we need to serialize it back
  // by copying to a container element
  const container = document.createElement("div");
  while (fragment.firstChild) {
    container.appendChild(fragment.firstChild);
  }

  return container.innerHTML;
}

describe("ClipboardDOMSerializer - Flat-to-Nested List Reconstruction", () => {
  it("should convert flat bullet list at indent 0 to nested <ul><li>", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet">Item 1</p>' +
      '<p data-indent="0" data-list-type="bullet">Item 2</p>';

    const output = reconstructHTML(input);

    expect(output).toContain("<ul>");
    expect(output).toContain("<li>Item 1</li>");
    expect(output).toContain("<li>Item 2</li>");
    expect(output).toContain("</ul>");
    // Should not have flat attributes in output
    expect(output).not.toContain('data-list-type="bullet"');
    expect(output).not.toContain('data-indent="0"');
  });

  it("should convert nested bullets with proper <ul> nesting", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet">A</p>' +
      '<p data-indent="1" data-list-type="bullet">B</p>' +
      '<p data-indent="2" data-list-type="bullet">C</p>';

    const output = reconstructHTML(input);

    // Check for nested structure
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>A");
    expect(output).toContain("<li>B");
    expect(output).toContain("<li>C</li>");
    // Should have multiple levels of nesting
    const nestedUlCount = (output.match(/<ul[\s>]/g) || []).length;
    expect(nestedUlCount).toBeGreaterThanOrEqual(2);
  });

  it("should convert flat ordered list to <ol> wrapper", () => {
    const input =
      '<p data-indent="0" data-list-type="ordered">First</p>' +
      '<p data-indent="0" data-list-type="ordered">Second</p>';

    const output = reconstructHTML(input);

    expect(output).toContain("<ol>");
    expect(output).toContain("<li>First</li>");
    expect(output).toContain("<li>Second</li>");
    expect(output).toContain("</ol>");
    expect(output).not.toContain("<ul>");
  });

  it("should convert check list to taskList format with data-type attributes", () => {
    const input =
      '<p data-indent="0" data-list-type="check" data-checked="false">Todo Item</p>';

    const output = reconstructHTML(input);

    expect(output).toContain('data-type="taskList"');
    expect(output).toContain('data-type="taskItem"');
    expect(output).toContain('data-checked="false"');
    expect(output).not.toContain('data-list-type="check"');
  });

  it("should handle checked check list items", () => {
    const input =
      '<p data-indent="0" data-list-type="check" data-checked="true">Done</p>' +
      '<p data-indent="0" data-list-type="check" data-checked="false">Todo</p>';

    const output = reconstructHTML(input);

    expect(output).toContain('data-checked="true"');
    expect(output).toContain('data-checked="false"');
    expect(output).toContain('data-type="taskList"');
  });

  it("should create separate list groups when interrupted by non-list block", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet">A</p>' +
      '<p data-indent="0">Plain text</p>' +
      '<p data-indent="0" data-list-type="bullet">B</p>';

    const output = reconstructHTML(input);

    // Should have two separate <ul> elements
    const ulCount = (output.match(/<ul[\s>]/g) || []).length;
    expect(ulCount).toBeGreaterThanOrEqual(2);
    expect(output).toContain("Plain text");
    expect(ulCount).toBe(2);
    expect(output).toContain("Plain text");
  });

  it("should preserve data-indent on non-list indented paragraphs", () => {
    const input =
      '<p data-indent="0">Normal</p>' +
      '<p data-indent="2">Indented paragraph</p>';

    const output = reconstructHTML(input);

    expect(output).toContain("Normal");
    expect(output).toContain('data-indent="2"');
    expect(output).toContain("Indented paragraph");
    expect(output).not.toContain("<ul>");
    expect(output).not.toContain("<ol>");
  });

  it("should handle indent decrease and properly close nested lists", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet">A</p>' +
      '<p data-indent="1" data-list-type="bullet">B</p>' +
      '<p data-indent="0" data-list-type="bullet">C</p>';

    const output = reconstructHTML(input);

    expect(output).toContain("<li>A");
    expect(output).toContain("<li>B</li>");
    expect(output).toContain("<li>C</li>");
    // Should have proper closing tags
    expect(output).toContain("</li>");
    expect(output).toContain("</ul>");
  });

  it("should create separate lists for different list types", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet">Bullet</p>' +
      '<p data-indent="0" data-list-type="ordered">Number</p>';

    const output = reconstructHTML(input);

    const ulCount = (output.match(/<ul[\s>]/g) || []).length;
    const olCount = (output.match(/<ol[\s>]/g) || []).length;
    expect(ulCount).toBeGreaterThanOrEqual(1); // At least one wrapper
    expect(olCount).toBeGreaterThanOrEqual(1); // At least one wrapper
    expect(output).toContain("<li>Bullet</li>");
    expect(olCount).toBeGreaterThanOrEqual(1); // At least one wrapper
    expect(olCount).toBe(1);
    expect(output).toContain("<li>Bullet</li>");
    expect(output).toContain("<li>Number</li>");
  });

  it("should handle empty list items", () => {
    const input = '<p data-indent="0" data-list-type="bullet"></p>';

    const output = reconstructHTML(input);

    expect(output).toContain("<ul>");
    expect(output).toContain("<li></li>");
    expect(output).toContain("</ul>");
  });

  it("should handle mixed indentation levels with gaps", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet">Level 0</p>' +
      '<p data-indent="2" data-list-type="bullet">Level 2</p>' +
      '<p data-indent="1" data-list-type="bullet">Level 1</p>';

    const output = reconstructHTML(input);

    expect(output).toContain("<li>Level 0");
    expect(output).toContain("<li>Level 2</li>");
    expect(output).toContain("<li>Level 1</li>");
    // Should have proper nesting
    expect(output).toContain("</ul>");
    expect(output).toContain("</li>");
  });

  it("should handle check list with nested items", () => {
    const input =
      '<p data-indent="0" data-list-type="check" data-checked="false">Parent</p>' +
      '<p data-indent="1" data-list-type="check" data-checked="true">Child</p>';

    const output = reconstructHTML(input);


    expect(output).toContain('data-type="taskList"');
    expect(output).toContain('data-type="taskItem"');
    expect(output).toContain('data-checked="false"');
    expect(output).toContain('data-checked="true"');
    // Check for proper nesting
    const ulCount = (output.match(/<ul[\s>]/g) || []).length;
    expect(ulCount).toBeGreaterThanOrEqual(2); // wrapper + nested
  });

  it("should not modify nested list extensions (task lists, outline lists)", () => {
    const input =
      '<ul class="simple-checklist"><li class="simple-checklist--item">Task</li></ul>';

    const output = reconstructHTML(input);

    // Should preserve the nested structure as-is
    expect(output).toContain("simple-checklist");
    expect(output).toContain("simple-checklist--item");
  });

  it("should handle complex mixed scenario with multiple list types and paragraphs", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet">Bullet 1</p>' +
      '<p data-indent="1" data-list-type="bullet">Nested Bullet</p>' +
      "<p>Paragraph</p>" +
      '<p data-indent="0" data-list-type="ordered">Order 1</p>' +
      '<p data-indent="1" data-list-type="ordered">Nested Order</p>' +
      '<p data-indent="0" data-list-type="check" data-checked="false">Check</p>';

    const output = reconstructHTML(input);

    // Should have separate lists
    const ulCount = (output.match(/<ul[\s>]/g) || []).length;
    const olCount = (output.match(/<ol[\s>]/g) || []).length;
    expect(ulCount).toBeGreaterThan(0); // At least wrapper + potentially nested
    expect(olCount).toBeGreaterThanOrEqual(1); // At least one ordered list
    expect(output).toContain("Paragraph");
    expect(output).toContain('data-type="taskList"');
  });

  it("should clean up all data-list-type and data-indent attributes from list items", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet" data-other="keep">Item</p>';

    const output = reconstructHTML(input);

    expect(output).not.toContain("data-list-type=");
    // Note: data-indent is removed from list items (structural attribute)
    // Original paragraph attributes are also removed as content is restructured into <li>
    // Note: data-indent is removed from list items but may stay on non-list blocks
    const ulContent = output.match(/<ul>[\s\S]*?<\/ul>/)?.[0] || "";
    expect(ulContent).not.toContain('data-indent="0"');
    expect(ulContent).not.toContain('data-indent="0"');
    // Custom attributes should be preserved
    expect(output).toContain('data-other="keep"');
  });

  it("should handle content with inline formatting in list items", () => {
    const input =
      '<p data-indent="0" data-list-type="bullet">Item with <strong>bold</strong></p>' +
      '<p data-indent="0" data-list-type="bullet">Item with <em>italic</em></p>';

    const output = reconstructHTML(input);

    expect(output).toContain("<strong>bold</strong>");
    expect(output).toContain("<em>italic</em>");
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>");
  });

  it("should preserve document structure with multiple paragraphs in sequence", () => {
    const input =
      "<p>Para 1</p>" +
      "<p>Para 2</p>" +
      '<p data-indent="0" data-list-type="bullet">List 1</p>' +
      '<p data-indent="0" data-list-type="bullet">List 2</p>' +
      "<p>Para 3</p>";

    const output = reconstructHTML(input);

    expect(output).toContain("Para 1");
    expect(output).toContain("Para 2");
    expect(output).toContain("Para 3");
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>List 1</li>");
    expect(output).toContain("<li>List 2</li>");
  });
});
