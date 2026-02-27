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

import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";

export const orderedNumberingPluginKey = new PluginKey("orderedNumbering");

/**
 * Converts a number to lowercase alphabetic format (a, b, c, ..., z, aa, ab, ...)
 */
function formatAlpha(n: number): string {
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(97 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/**
 * Converts a number to lowercase roman numeral format (i, ii, iii, iv, v, ...)
 */
function formatRoman(n: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = [
    "m",
    "cm",
    "d",
    "cd",
    "c",
    "xc",
    "l",
    "xl",
    "x",
    "ix",
    "v",
    "iv",
    "i"
  ];
  let result = "";
  for (let i = 0; i < values.length; i++) {
    while (n >= values[i]) {
      result += symbols[i];
      n -= values[i];
    }
  }
  return result;
}

/**
 * Converts a number to decimal format (1, 2, 3, ...)
 */
function formatDecimal(n: number): string {
  return String(n);
}

/**
 * Formats a number based on indent level using OneNote-style cycling:
 * - Indent 0: decimal (1, 2, 3, ...)
 * - Indent 1: alpha (a, b, c, ...)
 * - Indent 2: roman (i, ii, iii, ...)
 * - Indent 3: decimal (repeats)
 * - Pattern: decimal → alpha → roman → cycle
 */
function formatNumberByIndent(num: number, indent: number): string {
  const format = indent % 3;
  switch (format) {
    case 0:
      return formatDecimal(num);
    case 1:
      return formatAlpha(num);
    case 2:
      return formatRoman(num);
    default:
      return formatDecimal(num);
  }
}

/**
 * Computes ordered list numbers for all ordered blocks in the document.
 * Returns a map of node positions to their formatted numbers.
 * Tracks counters per indent level independently.
 * Counters reset when returning to an indent level after it had a non-ordered block.
 */
export function computeOrderedNumbers(
  doc: ProsemirrorNode
): Map<number, string> {
  const numbers = new Map<number, string>();
  const counters = new Map<number, number>();
  const lastBlockWasOrderedAtIndent = new Map<number, boolean>();

  doc.descendants((node, pos) => {
    // Only process paragraph and heading nodes
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      const indent = node.attrs.indent || 0;
      const listType = node.attrs.listType;

      if (listType === "ordered") {
        // Check if we need to reset the counter for this indent level
        // Reset if: this is first time at this indent, OR previous block at this indent wasn't ordered
        if (!counters.has(indent) || !lastBlockWasOrderedAtIndent.get(indent)) {
          counters.set(indent, 1);
        } else {
          // Continue the counter at this indent level
          counters.set(indent, (counters.get(indent) || 0) + 1);
        }

        const counter = counters.get(indent) || 1;
        const formatted = formatNumberByIndent(counter, indent);
        numbers.set(pos, formatted);

        lastBlockWasOrderedAtIndent.set(indent, true);
      } else {
        // Non-ordered block: mark that this indent is no longer ordered
        lastBlockWasOrderedAtIndent.set(indent, false);
      }
    }
    return true; // Continue traversal
  });

  return numbers;
}

/**
 * Helper to apply computed numbers to a transaction
 */
export function applyNumberingToTransaction(
  tr: any,
  doc: ProsemirrorNode
): boolean {
  const numbers = computeOrderedNumbers(doc);
  let hasChanges = false;

  doc.descendants((node, pos) => {
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      const currentNumber = node.attrs?.listNumber;
      const newNumber = numbers.get(pos) || null;

      if (currentNumber !== newNumber) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          listNumber: newNumber
        });
        hasChanges = true;
      }
    }
    return true;
  });

  return hasChanges;
}

/**
 * Creates a ProseMirror plugin that computes ordered list numbers at render-time.
 * Numbers are computed based on indent level and position in the ordered block sequence.
 * The numbers are attached as the listNumber attribute on nodes via appendTransaction.
 */
export function createOrderedNumberingPlugin() {
  return new Plugin({
    key: orderedNumberingPluginKey,
    state: {
      init(config, editorState) {
        // Apply numbering on first initialization
        const tr = editorState.tr;
        if (applyNumberingToTransaction(tr, editorState.doc)) {
          // Note: Can't dispatch here, just return the state
        }
        return null;
      },
      apply(tr, value, oldState, newState) {
        // Recompute whenever document changes
        if (tr.docChanged) {
          applyNumberingToTransaction(tr, newState.doc);
        }
        return null;
      }
    },
    appendTransaction(transactions, oldState, newState) {
      // Skip if no document changes
      if (!transactions.some((tr) => tr.docChanged)) {
        return;
      }

      const tr = newState.tr;
      const hasChanges = applyNumberingToTransaction(tr, newState.doc);

      return hasChanges ? tr : undefined;
    }
  });
}

// Export helper functions for testing
export { formatAlpha, formatRoman, formatDecimal, formatNumberByIndent };
