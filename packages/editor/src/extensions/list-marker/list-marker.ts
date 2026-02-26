import { Extension, InputRule } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    listMarker: {
      toggleBulletMarker: () => ReturnType;
      toggleOrderedMarker: () => ReturnType;
      toggleCheckMarker: () => ReturnType;
      setListType: (type: string | null) => ReturnType;
      toggleChecked: () => ReturnType;
    };
  }
}

export const ListMarker = Extension.create({
  name: "listMarker",


  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          listType: {
            default: null,
            parseHTML: (element) => {
              return element.getAttribute("data-list-type") || null;
            },
            renderHTML: (attributes) => {
              if (!attributes.listType) return {};
              return {
                "data-list-type": attributes.listType
              };
            }
          },
          checked: {
            default: false,
            parseHTML: (element) => {
              return element.getAttribute("data-checked") === "true";
            },
            renderHTML: (attributes) => {
              if (attributes.listType !== "check") return {};
              return {
                "data-checked": attributes.checked ? "true" : "false"
              };
            }
          }
        }
      }
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\s*([-*])\s$/,
        handler: ({ state, range, match }) => {
          const { from, to } = range;
          const $from = state.selection.$from;
          const node = $from.parent;
          const tr = state.tr;

          // Replace the matched text
          tr.delete(from, to);

          // Set listType attribute on the current node
          tr.setNodeMarkup(from - 1, undefined, {
            ...node.attrs,
            listType: "bullet"
          });
        }
      }),
      new InputRule({
        find: /^\s*(\d+)\.\s$/,
        handler: ({ state, range, match }) => {
          const { from, to } = range;
          const $from = state.selection.$from;
          const node = $from.parent;
          const tr = state.tr;

          // Replace the matched text
          tr.delete(from, to);

          // Set listType attribute on the current node
          tr.setNodeMarkup(from - 1, undefined, {
            ...node.attrs,
            listType: "ordered"
          });
        }
      }),
      new InputRule({
        find: /^\s*\[\s?\]\s$/,
        handler: ({ state, range, match }) => {
          const { from, to } = range;
          const $from = state.selection.$from;
          const node = $from.parent;
          const tr = state.tr;

          // Replace the matched text
          tr.delete(from, to);

          // Set listType and checked attributes on the current node
          tr.setNodeMarkup(from - 1, undefined, {
            ...node.attrs,
            listType: "check",
            checked: false
          });
        }
      }),
      new InputRule({
        find: /^\s*\[[xX]\]\s$/,
        handler: ({ state, range, match }) => {
          const { from, to } = range;
          const $from = state.selection.$from;
          const node = $from.parent;
          const tr = state.tr;

          // Replace the matched text
          tr.delete(from, to);

          // Set listType and checked attributes on the current node
          tr.setNodeMarkup(from - 1, undefined, {
            ...node.attrs,
            listType: "check",
            checked: true
          });
        }
      })
    ];
  },

  addCommands() {
    return {
      toggleBulletMarker:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from, $to } = selection;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              const currentType = node.attrs.listType;
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                listType: currentType === "bullet" ? null : "bullet",
                checked: false
              });
            }
          });

          return true;
        },

      toggleOrderedMarker:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from, $to } = selection;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              const currentType = node.attrs.listType;
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                listType: currentType === "ordered" ? null : "ordered",
                checked: false
              });
            }
          });

          return true;
        },

      toggleCheckMarker:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from, $to } = selection;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              const currentType = node.attrs.listType;
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                listType: currentType === "check" ? null : "check",
                checked: currentType === "check" ? false : node.attrs.checked
              });
            }
          });

          return true;
        },

      setListType:
        (type: string | null) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from, $to } = selection;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                listType: type,
                checked: type === "check" ? node.attrs.checked : false
              });
            }
          });

          return true;
        },

      toggleChecked:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from, $to } = selection;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (
              (node.type.name === "paragraph" ||
                node.type.name === "heading") &&
              node.attrs.listType === "check"
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                checked: !node.attrs.checked
              });
            }
          });

          return true;
        }
    };
  }
});
