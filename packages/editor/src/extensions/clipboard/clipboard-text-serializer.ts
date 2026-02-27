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

import { TextSerializer } from "@tiptap/core";
import { Schema, Slice } from "prosemirror-model";
import { ListItem } from "../list-item/index.js";
import { EditorView } from "@tiptap/pm/view";

export function clipboardTextSerializer(content: Slice, view: EditorView) {
  return getTextBetween(content, view.state.schema);
}

export function getTextBetween(slice: Slice, schema: Schema): string {
  const range = { from: 0, to: slice.size };
  const separator = "\n";
  let text = "";
  let separated = true;
  const orderedCounters = new Map<number, number>();
  const skipNodeRanges = new Set<string>(); // Track ranges to skip (e.g., inside flat lists)

  slice.content.nodesBetween(0, slice.size, (node, pos, parent, index) => {
    const nodeEnd = pos + node.nodeSize;
    
    // Check if this node is inside a skipped range
    for (const range of skipNodeRanges) {
      const [rangeStart, rangeEnd] = range.split("-").map(Number);
      if (pos >= rangeStart && nodeEnd <= rangeEnd) {
        return; // Skip this node
      }
    }

    // Check for flat list attributes (indent + listType)
    if (node.isBlock && (node.type.name === "paragraph" || node.type.name === "heading")) {
      const indent = node.attrs.indent || 0;
      const listType = node.attrs.listType;

      if (indent > 0 || listType) {
        // Mark this node's range to skip processing its children
        skipNodeRanges.add(`${pos}-${nodeEnd}`);

        // Ensure we have a separator before this block
        if (!separated && text.length > 0) {
          text += separator;
        }

        // Build prefix based on indent and listType
        let prefix = "  ".repeat(indent);

        if (listType === "bullet") {
          prefix += "- ";
        } else if (listType === "ordered") {
          // Track counters per indent level
          if (!orderedCounters.has(indent)) {
            orderedCounters.set(indent, 1);
          }
          const counter = orderedCounters.get(indent) || 1;
          prefix += `${counter}. `;
          orderedCounters.set(indent, counter + 1);
        } else if (listType === "check") {
          const checked = node.attrs.checked ? "x" : " ";
          prefix += `- [${checked}] `;
        }

        // Extract text from node recursively
        let nodeText = "";
        node.forEach((child) => {
          if (child.isText) {
            nodeText += child.text;
          } else if (!child.isBlock) {
            // Handle inline nodes like marks
            child.forEach((grandchild) => {
              if (grandchild.isText) {
                nodeText += grandchild.text;
              }
            });
          }
        });

        text += prefix + nodeText;
        separated = false;
        return; // Skip default processing for this node
      }
    }

    // Reset ordered counters when indentation decreases
    if (
      node.isBlock &&
      (node.type.name === "paragraph" || node.type.name === "heading")
    ) {
      const currentIndent = node.attrs.indent || 0;
      // Clean up counters for deeper levels
      for (const [level] of orderedCounters) {
        if (level > currentIndent) {
          orderedCounters.delete(level);
        }
      }
    }

    const textSerializer = schema.nodes[node.type.name]?.spec
      .toText as TextSerializer;

    if (textSerializer) {
      if (node.isBlock && !separated) {
        text += separator;
        separated = true;
      }

      if (parent) {
        text += textSerializer({
          node,
          pos,
          parent,
          index,
          range
        });
      }
    } else if (node.isText) {
      text += node?.text;
      separated = false;
    } else if (node.isBlock && !!text) {
      // we don't want double spaced list items when pasting
      if (index === 0 && parent?.type.name === ListItem.name) return;

      text += separator;
      if (node.attrs.spacing === "double" && node.childCount > 0)
        text += separator;
      separated = true;
    }
  });

  return text;
}
