export function migrateNestedListsToFlat(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Find all UL/OL elements that are NOT task lists or outline lists
  const lists = doc.querySelectorAll("ul:not([data-type]), ol");

  lists.forEach((list) => {
    // Skip if it's a checklist with task-specific attributes (task list detection)
    if (
      list.classList.contains("checklist") &&
      list.querySelector("[data-task-id]")
    ) {
      return; // Skip task lists
    }

    // Convert list to flat paragraphs
    const flattenedNodes = flattenList(list, 0);
    const parent = list.parentElement;
    if (parent) {
      flattenedNodes.forEach((node) => parent.insertBefore(node, list));
      parent.removeChild(list);
    }
  });

  return doc.body.innerHTML;
}

function flattenList(list: Element, indentLevel: number): HTMLElement[] {
  const result: HTMLElement[] = [];
  const listType =
    list.tagName.toLowerCase() === "ul"
      ? list.classList.contains("checklist")
        ? "check"
        : "bullet"
      : "ordered";

  Array.from(list.children).forEach((item) => {
    if (item.tagName.toLowerCase() === "li") {
      // Extract content from <li>
      let content = "";
      const childNodes: (Element | Text)[] = [];
      let nestedList: Element | null = null;

      Array.from(item.childNodes).forEach((child) => {
        if (
          child.nodeType === Node.ELEMENT_NODE &&
          (child as Element).tagName.toLowerCase() === "ul"
        ) {
          nestedList = child as Element;
        } else if (
          child.nodeType === Node.ELEMENT_NODE &&
          (child as Element).tagName.toLowerCase() === "ol"
        ) {
          nestedList = child as Element;
        } else if (
          child.nodeType === Node.ELEMENT_NODE &&
          (child as Element).tagName.toLowerCase() === "p"
        ) {
          content = (child as HTMLElement).innerHTML;
        } else {
          childNodes.push(child as Element | Text);
        }
      });

      // If no <p> found, use text content directly
      if (!content && childNodes.length > 0) {
        content = childNodes
          .map((n) =>
            n.nodeType === Node.TEXT_NODE
              ? n.textContent
              : (n as HTMLElement).outerHTML
          )
          .join("");
      }

      // Create flat paragraph
      const p = document.createElement("p");
      p.innerHTML = content;
      if (indentLevel > 0) {
        p.setAttribute("data-indent", indentLevel.toString());
      }
      p.setAttribute("data-list-type", listType);

      // Check if it's a checked item
      if (
        listType === "check" &&
        item.getAttribute("data-checked") === "true"
      ) {
        p.setAttribute("data-checked", "true");
      }

      result.push(p);

      // Process nested list
      if (nestedList) {
        const nestedFlattened = flattenList(nestedList, indentLevel + 1);
        result.push(...nestedFlattened);
      }
    }
  });

  return result;
}
