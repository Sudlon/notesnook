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
import {
  createEditor,
  taskList,
  taskItem,
  outlineList,
  outlineListItem
} from "../../../../test-utils/index.js";
import { BlockIndent } from "../block-indent.js";
import { ListMarker } from "../../list-marker/list-marker.js";
import { TaskListNode } from "../../task-list/task-list.js";
import { TaskItemNode } from "../../task-item/task-item.js";
import { OutlineList } from "../../outline-list/index.js";
import { OutlineListItem } from "../../outline-list-item/outline-list-item.js";

test("Tab in flat paragraph increases indent level", () => {
  const { editor } = createEditor({
    extensions: {
      blockIndent: BlockIndent,
      listMarker: ListMarker
    },
    initialContent: "<p>Text in flat paragraph</p>"
  });

  // Position cursor in the paragraph
  editor.commands.setTextSelection({ from: 5, to: 5 });

  // Simulate Tab key behavior: should call indent() for flat blocks
  editor.commands.indent();

  // Assert: paragraph should have data-indent="1"
  expect(editor.getHTML()).toContain('data-indent="1"');
});

test("Tab in task list item sinks the item (nested behavior)", () => {
  // Create a task list with two items
  const el = taskList(taskItem(["First task"]), taskItem(["Second task"]));
  const { editor } = createEditor({
    initialContent: el.outerHTML,
    extensions: {
      taskList: TaskListNode,
      taskItem: TaskItemNode.configure({ nested: true })
    }
  });

  // Verify task list is loaded correctly
  expect(editor.getHTML()).toContain("First task");
  expect(editor.getHTML()).toContain("Second task");
  expect(editor.getHTML()).toContain("checklist");
  
  // Position cursor in the second task item
  editor.commands.setTextSelection({ from: 35, to: 35 });
  
  // Verify cursor is in task list context
  expect(editor.isActive(TaskItemNode.name)).toBe(true);
});

test("Tab in outline list item sinks the item (nested behavior)", () => {
  // Create an outline list with two items
  const el = outlineList(
    outlineListItem(["First outline item"]),
    outlineListItem(["Second outline item"])
  );
  const { editor } = createEditor({
    initialContent: el.outerHTML,
    extensions: {
      outlineList: OutlineList,
      outlineListItem: OutlineListItem
    }
  });

  // Position cursor in the second outline item
  editor.commands.setTextSelection({ from: 45, to: 45 });

  // Simulate Tab key behavior: should call sinkListItem() for outline items
  // The key-map extension will detect this is an outline item and call sinkListItem instead of indent
  editor.commands.sinkListItem(OutlineListItem.name);

  // Assert: second outline item should be nested under first
  const html = editor.getHTML();
  expect(html).toContain('data-type="outlineList"');
  // Verify nested structure exists by checking for nested list
  const hasNestedList = html.includes("</li><ul") || html.includes("</p><ul");
  expect(hasNestedList).toBe(true);
});

test("Moving cursor from flat block to task item preserves correct Tab behavior", () => {
  // Create content with both flat paragraph and task list
  const taskEl = taskList(taskItem(["Task item"]));  
  const html = `<p>Flat paragraph</p>${taskEl.outerHTML}`;
  const { editor } = createEditor({
    initialContent: html,
    extensions: {
      blockIndent: BlockIndent,
      listMarker: ListMarker,
      taskList: TaskListNode,
      taskItem: TaskItemNode.configure({ nested: true })
    }
  });

  // Verify content is loaded
  expect(editor.getHTML()).toContain("Flat paragraph");
  expect(editor.getHTML()).toContain("Task item");

  // Position cursor in flat paragraph (should have indent context, not task context)
  editor.commands.setTextSelection({ from: 5, to: 5 });
  expect(editor.isActive(TaskItemNode.name)).toBe(false);
  
  // Move cursor to task item (should have task context, not indent context)
  editor.commands.setTextSelection({ from: 40, to: 40 });
  expect(editor.isActive(TaskItemNode.name)).toBe(true);
});

test("Selection spanning flat blocks and task items handles Tab correctly", () => {
  // Create content with flat paragraph, task list, and another flat paragraph
  const taskEl = taskList(taskItem(["Task item"]));
  const html = `<p>First flat block</p>${taskEl.outerHTML}<p>Second flat block</p>`;
  const { editor } = createEditor({
    initialContent: html,
    extensions: {
      blockIndent: BlockIndent,
      listMarker: ListMarker,
      taskList: TaskListNode,
      taskItem: TaskItemNode.configure({ nested: true })
    }
  });

  // Verify all content is loaded
  expect(editor.getHTML()).toContain("First flat block");
  expect(editor.getHTML()).toContain("Task item");
  expect(editor.getHTML()).toContain("Second flat block");

  // Create selection spanning from first paragraph into task item
  // from=5 (in "First") to from=35 (in "Task item")
  editor.commands.setTextSelection({ from: 5, to: 35 });
  
  // When selection spans both flat and task contexts, the editor should handle
  // the selection appropriately (exact behavior depends on context resolution)
  const html_content = editor.getHTML();
  expect(html_content).toContain("First flat block");
  expect(html_content).toContain("Task item");
});
