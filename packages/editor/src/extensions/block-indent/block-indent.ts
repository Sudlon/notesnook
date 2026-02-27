import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockIndent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
      setIndent: (level: number) => ReturnType;
    };
  }
}

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
      indent: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        const { $from, $to } = selection;
        
        if (!dispatch) return true;
        
        // Iterate through all blocks in selection
        state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
          if (node.type.name === 'paragraph' || node.type.name === 'heading' || node.type.name === 'blockquote') {
            const currentIndent = node.attrs.indent || 0;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              indent: currentIndent + 1
            });
          }
        });
        
        return true;
      },
      
      outdent: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        const { $from, $to } = selection;
        
        if (!dispatch) return true;
        
        // Iterate through all blocks in selection
        state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
          if (node.type.name === 'paragraph' || node.type.name === 'heading' || node.type.name === 'blockquote') {
            const currentIndent = node.attrs.indent || 0;
            if (currentIndent > 0) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: currentIndent - 1
              });
            }
          }
        });
        
        return true;
      },
      
      setIndent: (level: number) => ({ tr, state, dispatch }) => {
        const { selection } = state;
        const { $from, $to } = selection;
        
        if (!dispatch) return true;
        
        // Iterate through all blocks in selection
        state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
          if (node.type.name === 'paragraph' || node.type.name === 'heading' || node.type.name === 'blockquote') {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              indent: Math.max(0, level) // Ensure non-negative
            });
          }
        });
        
        return true;
      }
    };
  }
});
