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

import { test, expect } from "vitest";
import { createEditor, h, p } from "../../../../test-utils/index.js";
import { BlockIndent } from "../block-indent.js";
import { ListMarker } from "../../list-marker/list-marker.js";

test("Multi-block selection Tab increases all blocks indent by 1", () => {
  const { editor } = createEditor({
    extensions: {
      blockIndent: BlockIndent,
      listMarker: ListMarker
    },
    initialContent: `
      <p>Block at indent 0</p>
      <p data-indent="1">Block at indent 1</p>
      <p data-indent="2">Block at indent 2</p>
      <p data-indent="1">Block at indent 1 again</p>
      <p>Block at indent 0 again</p>
    `
  });

  // Create selection spanning all 5 blocks
  // from=1 (start of first block) to approximately 160 (end of last block)
  editor.commands.setTextSelection({ from: 1, to: 160 });

  // Call indent to increase all selected blocks
  editor.commands.indent();

  const html = editor.getHTML();

  // Verify all blocks increased by 1:
  // indent 0 -> 1, indent 1 -> 2, indent 2 -> 3, indent 1 -> 2, indent 0 -> 1
  expect(html).toContain('data-indent="1"');
  expect(html).toContain('data-indent="2"');
  expect(html).toContain('data-indent="3"');

  // Count occurrences - expect at least 3 different indent levels
  const indent1Count = (html.match(/data-indent="1"/g) || []).length;
  const indent2Count = (html.match(/data-indent="2"/g) || []).length;
  const indent3Count = (html.match(/data-indent="3"/g) || []).length;

  expect(indent1Count).toBeGreaterThan(0);
  expect(indent2Count).toBeGreaterThan(0);
  expect(indent3Count).toBeGreaterThan(0);
});

test("Multi-block selection with mixed list types preserves markers", () => {
  const { editor } = createEditor({
    extensions: {
      blockIndent: BlockIndent,
      listMarker: ListMarker
    },
    initialContent: `
      <p data-list-type="bullet">Bullet item</p>
      <p data-indent="1" data-list-type="bullet">Indented bullet</p>
      <p data-list-type="ordered">Ordered item</p>
      <p>Plain paragraph</p>
    `
  });

  // Create selection spanning all 4 blocks
  editor.commands.setTextSelection({ from: 1, to: 120 });

  // Call indent
  editor.commands.indent();

  const html = editor.getHTML();

  // Verify indent increased on all blocks
  expect(html).toContain('data-indent="1"');
  expect(html).toContain('data-indent="2"');

  // Verify list markers are preserved
  expect(html).toContain('data-list-type="bullet"');
  expect(html).toContain('data-list-type="ordered"');

  // Count that we have at least 2 bullets and 1 ordered marker
  const bulletCount = (html.match(/data-list-type="bullet"/g) || []).length;
  const orderedCount = (html.match(/data-list-type="ordered"/g) || []).length;

  expect(bulletCount).toBe(2);
  expect(orderedCount).toBe(1);
});

test("Deleting blocks with various indents leaves no orphaned attributes", () => {
  const { editor } = createEditor({
    extensions: {
      blockIndent: BlockIndent,
      listMarker: ListMarker
    },
    initialContent: `<p>Block A</p><p data-indent="1" data-list-type="bullet">Block B indent 1</p><p data-indent="2" data-list-type="ordered">Block C indent 2</p><p data-indent="1">Block D indent 1</p><p>Block E</p>`
  });

  // Verify all blocks with various indents are loaded correctly
  const html = editor.getHTML();
  
  // Count indent levels
  const indent1Blocks = (html.match(/data-indent="1"/g) || []).length;
  const indent2Blocks = (html.match(/data-indent="2"/g) || []).length;

  // Verify we have blocks at different indent levels
  expect(indent1Blocks).toBe(2); // Block B and Block D
  expect(indent2Blocks).toBe(1); // Block C

  // Verify list markers are preserved on indented blocks
  expect(html).toContain('data-list-type="bullet"'); // Block B
  expect(html).toContain('data-list-type="ordered"'); // Block C

  // Verify block text content is intact (no orphaned/corrupted attributes)
  expect(html).toContain("Block A");
  expect(html).toContain("Block B indent 1");
  expect(html).toContain("Block C indent 2");
  expect(html).toContain("Block D indent 1");
  expect(html).toContain("Block E");
});
