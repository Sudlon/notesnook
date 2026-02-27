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

import { DOMSerializer } from "@tiptap/pm/model";
import { Fragment, Schema } from "prosemirror-model";

export class ClipboardDOMSerializer extends DOMSerializer {
  static fromSchema(schema: Schema): ClipboardDOMSerializer {
    return (
      schema.cached.clipboardDomSerializer ||
      (schema.cached.clipboardDomSerializer = new ClipboardDOMSerializer(
        this.nodesFromSchema(schema),
        this.marksFromSchema(schema)
      ))
    );
  }

  serializeFragment(
    fragment: Fragment,
    options?: { document?: Document | undefined } | undefined,
    target?: HTMLElement | DocumentFragment | undefined
  ): HTMLElement | DocumentFragment {
    const dom = super.serializeFragment(fragment, options, target);
    for (const p of dom.querySelectorAll("li > p")) {
      if (p.parentElement && p.parentElement.childElementCount > 1) continue;
      p.parentElement?.append(...p.childNodes);
      p.remove();
    }

    for (const element of dom.querySelectorAll("[data-block-id]")) {
      element.removeAttribute("data-block-id");
    }

    for (const p of dom.querySelectorAll('p[data-spacing="single"]')) {
      if (!p.previousElementSibling || p.previousElementSibling.tagName !== "P")
        continue;
      if (p.previousElementSibling.childNodes.length > 0)
        p.previousElementSibling.appendChild(document.createElement("br"));
      p.previousElementSibling.append(...p.childNodes);
      p.remove();
    }

    // Convert flat list blocks to nested HTML structure
    this.reconstructNestedLists(dom);

    return dom;
  }

  private reconstructNestedLists(dom: DocumentFragment | HTMLElement): void {
    const children = Array.from(dom.childNodes);
    let i = 0;

    while (i < children.length) {
      const node = children[i];

      // Skip non-element nodes and non-list blocks
      if (node.nodeType !== Node.ELEMENT_NODE) {
        i++;
        continue;
      }

      const element = node as Element;
      if (!element.hasAttribute("data-list-type")) {
        i++;
        continue;
      }

      // Start a new list group
      const listType = element.getAttribute("data-list-type") || "bullet";
      const groupStart = i;
      const group: Element[] = [];

      // Collect consecutive same-type list blocks
      while (i < children.length) {
        const current = children[i];
        if (current.nodeType !== Node.ELEMENT_NODE) {
          break;
        }
        const el = current as Element;
        if (!el.hasAttribute("data-list-type") || el.getAttribute("data-list-type") !== listType) {
          break;
        }
        group.push(el);
        i++;
      }

      // Build nested structure from the group
      const nestedList = this.buildNestedList(group, listType);

      // Replace flat blocks with nested list in DOM
      const firstNode = children[groupStart];
      dom.insertBefore(nestedList, firstNode);
      group.forEach((el) => dom.removeChild(el));
    }
  }

  private buildNestedList(blocks: Element[], listType: string): Element {
    const wrapper = listType === "ordered" ? document.createElement("ol") : document.createElement("ul");

    if (listType === "check") {
      wrapper.setAttribute("data-type", "taskList");
    }

    // Track (indent, list-container, last-li-added) for proper nesting
    const stack: { indent: number; container: Element; lastLi: Element | null }[] = [
      { indent: -1, container: wrapper, lastLi: null }
    ];

    for (const block of blocks) {
      const indent = parseInt(block.getAttribute("data-indent") || "0", 10);
      const li = document.createElement("li");

      // Copy custom attributes from block to li (except list-specific ones)
      for (const attr of block.attributes) {
        if (attr.name !== "data-indent" && attr.name !== "data-list-type" && attr.name !== "data-checked") {
          li.setAttribute(attr.name, attr.value);
        }
      }

      if (listType === "check") {
        li.setAttribute("data-type", "taskItem");
        const checked = block.getAttribute("data-checked") === "true";
        li.setAttribute("data-checked", String(checked));
      }

      // Move content from block to li
      while (block.firstChild) {
        li.appendChild(block.firstChild);
      }

      // Pop from stack until we find the correct parent level for this indent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      // Get parent container for current indent level
      const parentLevel = stack[stack.length - 1];
      
      // If indenting deeper, create nested list structure
      if (indent > parentLevel.indent) {
        // Create intermediate nested lists for multi-level jumps
        let currentLevel = parentLevel;
        
        while (currentLevel.indent < indent) {
          const newIndent = currentLevel.indent + 1;
          const newList = listType === "ordered" ? document.createElement("ol") : document.createElement("ul");
          if (listType === "check") {
            newList.setAttribute("data-type", "taskList");
          }

          // Find the li to nest this list into
          // If current level has a lastLi, nest into it
          // Otherwise, if this is root, this item will be first in wrapper
          if (currentLevel.lastLi) {
            currentLevel.lastLi.appendChild(newList);
            stack.push({ indent: newIndent, container: newList, lastLi: null });
          } else if (currentLevel.indent === -1) {
            // This is root, the item will be appended directly to wrapper
            // No need to create intermediate list yet
            stack.push({ indent: newIndent, container: currentLevel.container, lastLi: null });
          } else {
            // Shouldn't happen, but break to avoid infinite loop
            break;
          }
          
          currentLevel = stack[stack.length - 1];
        }
      }

      // Find the final container for this item
      const targetLevel = stack[stack.length - 1];
      targetLevel.container.appendChild(li);
      targetLevel.lastLi = li;

      // Clean up list-specific attributes from li
      li.removeAttribute("data-indent");
      li.removeAttribute("data-list-type");
      if (listType !== "check") {
        li.removeAttribute("data-checked");
      }

      // Clean up attributes from original block
      block.removeAttribute("data-indent");
      block.removeAttribute("data-list-type");
      block.removeAttribute("data-checked");
    }

    return wrapper;
  }

}
