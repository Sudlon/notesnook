import { Extension } from "@tiptap/core";

export const BlockIndent = Extension.create({
  name: "blockIndent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const value = element.getAttribute("data-indent");
              return value ? parseInt(value, 10) : 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent === 0) return {};
              return {
                "data-indent": attributes.indent
              };
            }
          }
        }
      }
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          // Placeholder - will implement in next task
          return false;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          // Placeholder - will implement in next task
          return false;
        },
      setIndent:
        (level: number) =>
        ({ tr, state, dispatch }) => {
          // Placeholder - will implement in next task
          return false;
        }
    };
  }
});
