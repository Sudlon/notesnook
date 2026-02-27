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

import { expect, test } from "vitest";
import { createEditor, h, li, p, ul } from "../../../../test-utils/index.js";
import { ListItem } from "../index.js";
import { Paragraph } from "../../paragraph/paragraph.js";
import { ImageNode } from "../../image/image.js";
import { createEditor, h, p } from "../../../../test-utils/index.js";
import { ListItem } from "../index.js";
import { Paragraph } from "../../paragraph/paragraph.js";
import { ImageNode } from "../../image/image.js";

test("inline image as first child in list item", async () => {
  const el = ul([
    li([p(["item 1"])]),
    li([h("img", [], { src: "image.png" })])
  ]);

  const { editor } = createEditor({
    initialContent: el.outerHTML,
    extensions: {
      listItem: ListItem,
      paragraph: Paragraph,
      image: ImageNode
    }
  });

  expect(editor.getHTML()).toMatchSnapshot();
});
