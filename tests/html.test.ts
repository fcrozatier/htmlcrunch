import { ParseError } from "@fcrozatier/monarch";
import {
  assert,
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertObjectMatch,
  assertStringIncludes,
  unreachable,
} from "@std/assert";
import {
  attribute,
  comment,
  COMMENT_REGEX,
  commentNode,
  customElementName,
  doctype,
  element,
  ElementKind,
  fragments,
  html,
  isCommentNode,
  isElementNode,
  isMNode,
  isTextNode,
  NodeKind,
  serializeFragments,
  serializeNode,
  shadowRoot,
  spacesAndComments,
  tagName,
  textNode,
} from "../parser.ts";

Deno.test("comments:regex", () => {
  const r = new RegExp(COMMENT_REGEX.source + "$", "v");

  // Can't start with >
  assertEquals(r.test(">"), false);
  // Can't start with ->
  assertEquals(r.test("->"), false);
  // Can't contain <!--
  assertEquals(r.test("a<!--b"), false);
  // Can't contain -->
  assertEquals(r.test("a-->b"), false);
  // Can't contain --!>
  assertEquals(r.test("a--!>b"), false);
  // Can't contain <!-
  assertEquals(r.test("a<!-"), false);
  // Can end in <!
  assertEquals(r.test("a<!"), true);
});

Deno.test("comments:simple", () => {
  const singleline = comment.parseOrThrow("<!-- A simple comment -->");
  assertEquals(singleline, { kind: "COMMENT", text: " A simple comment " });

  const multiline = comment.parseOrThrow(`<!--
     A
     multiline
     comment
     -->`);
  assertEquals(multiline, {
    kind: "COMMENT",
    text: `
     A
     multiline
     comment
     `,
  });

  const edgeCaseComment = comment.parseOrThrow(`
    <!--My favorite operators are > and <!-->
  `.trim());

  assertObjectMatch(edgeCaseComment, {
    kind: NodeKind.COMMENT,
    text: "My favorite operators are > and <!",
  });
});

Deno.test("comments:complex", () => {
  const consecutive_comments = spacesAndComments.parseOrThrow(`
    <!-- consecutive comments -->
    <!-- arrows ->-> -- > ->->->-- -> inside comments -->
  `);
  assertEquals(consecutive_comments, [
    textNode("\n    "),
    {
      kind: "COMMENT",
      text: " consecutive comments ",
    },
    {
      kind: "COMMENT",
      text: " arrows ->-> -- > ->->->-- -> inside comments ",
    },
    textNode("\n  "),
  ]);

  const html_inside_comment = element.parseOrThrow(`
    <div><!-- <span>html inside comment</span> --></div>
  `.trim());

  assertObjectMatch(html_inside_comment, {
    kind: ElementKind.NORMAL,
    tagName: "div",
    attributes: [],
    children: [
      { kind: "COMMENT", text: " <span>html inside comment</span> " },
    ],
  });
});

Deno.test("comments:nested", () => {
  const nestedComments = fragments.parseOrThrow(`
    <!-- This is a div -->

    <div>

      <!-- This is a p -->
      <p>
        Some text
        <!-- This is a button -->
        <button>click</button>
        <!-- Now below the button -->
      </p>

      <!-- Another section -->

      <!-- Another p -->
      <p>
        <input type="checkbox"> <!-- An input -->
      </p>
    </div>
    `);

  assertObjectMatch({ results: nestedComments }, {
    results: [
      textNode("\n    "),
      commentNode(" This is a div "),
      textNode("\n\n    "),
      {
        tagName: "div",
        kind: ElementKind.NORMAL,
        attributes: [],
        children: [
          textNode("\n\n      "),
          commentNode(" This is a p "),
          textNode("\n      "),
          {
            tagName: "p",
            kind: ElementKind.NORMAL,
            attributes: [],
            children: [
              { kind: "TEXT", text: "\n        Some text\n        " },
              commentNode(" This is a button "),
              textNode("\n        "),
              {
                tagName: "button",
                kind: ElementKind.NORMAL,
                attributes: [],
                children: [{ kind: "TEXT", text: "click" }],
              },
              textNode("\n        "),
              commentNode(" Now below the button "),
              textNode("\n      "),
            ],
          },
          textNode("\n\n      "),
          commentNode(" Another section "),
          textNode("\n\n      "),
          commentNode(" Another p "),
          textNode("\n      "),
          {
            tagName: "p",
            kind: ElementKind.NORMAL,
            attributes: [],
            children: [
              textNode("\n        "),
              {
                tagName: "input",
                kind: ElementKind.VOID,
                attributes: [["type", "checkbox"]],
              },
              textNode(" "),
              commentNode(" An input "),
              textNode("\n      "),
            ],
          },
          textNode("\n    "),
        ],
      },
      textNode("\n    "),
    ],
  });
});

Deno.test("doctype", () => {
  const res = doctype.parseOrThrow("<!Doctype Html >");

  assertEquals(res, textNode("<!DOCTYPE html>"));
});

Deno.test("attributes", () => {
  const unquotedAttribute = attribute.parseOrThrow(`value=yes`);
  assertEquals(unquotedAttribute, ["value", "yes"]);

  const singleQuoteAttribute = attribute.parseOrThrow(`type='text'`);
  assertEquals(singleQuoteAttribute, ["type", "text"]);

  const doubleQuotesAttribute = attribute.parseOrThrow(`class="a b c"`);
  assertEquals(doubleQuotesAttribute, ["class", "a b c"]);

  const booleanAttribute = attribute.parseOrThrow(`checked`);
  assertEquals(booleanAttribute, ["checked", ""]);

  const nonAsciiAttribute = attribute.parseOrThrow(`xml:lang="us"`);
  assertEquals(nonAsciiAttribute, ["xml:lang", "us"]);

  const hangingBracket = element.parseOrThrow(
    `<input
    disabled
    >`,
  );
  assertEquals(hangingBracket, {
    tagName: "input",
    kind: ElementKind.VOID,
    attributes: [
      [
        "disabled",
        "",
      ],
    ],
  });

  const recoverFromMissingWhiteSpace = element.parseOrThrow(
    `<input value="yes"class="a b c">`,
  );
  assertEquals(recoverFromMissingWhiteSpace, {
    tagName: "input",
    kind: ElementKind.VOID,
    attributes: [
      ["value", "yes"],
      ["class", "a b c"],
    ],
  });

  const allowDuplicateAttributes = element.parseOrThrow(
    `<input on:click="handleClick" on:click="log">`,
  );
  assertEquals(allowDuplicateAttributes, {
    tagName: "input",
    kind: ElementKind.VOID,
    attributes: [
      ["on:click", "handleClick"],
      ["on:click", "log"],
    ],
  });

  const keepAttributesCasing = element.parseOrThrow(
    `<input prop:ariaChecked="checked">`,
  );
  assertEquals(keepAttributesCasing, {
    tagName: "input",
    kind: ElementKind.VOID,
    attributes: [
      ["prop:ariaChecked", "checked"],
    ],
  });
});

Deno.test("custom element names", () => {
  try {
    // Must include a dash
    customElementName.parseOrThrow("abc");
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assertStringIncludes(error?.message, "Invalid custom element name");
  }

  try {
    // Cannot be a forbidden name
    customElementName.parseOrThrow("annotation-xml");
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assertStringIncludes(error?.message, "Forbidden custom element name");
  }
});

Deno.test("tag names", () => {
  const name = tagName.parseOrThrow("Abc-d");
  assertEquals(name, "abc-d");
});

Deno.test("disallow self-closing non-void element", () => {
  try {
    element.parseOrThrow("<div />");
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assert(
      error.message.includes(
        "Unexpected self-closing tag on a non-void element",
      ),
    );
  }
});

Deno.test("void element", () => {
  const input = element.parseOrThrow('<input type="text">');
  assertEquals(input, {
    tagName: "input",
    kind: ElementKind.VOID,
    attributes: [["type", "text"]],
  });

  // The closing slash becomes part of the unquoted attribute value
  // https://html.spec.whatwg.org/#start-tags
  const unquoted_attr_then_slash = element.parseOrThrow("<input type=text/>");
  assertEquals(unquoted_attr_then_slash, {
    tagName: "input",
    kind: ElementKind.VOID,
    attributes: [["type", "text/"]],
  });
});

Deno.test("void elements shouldn't have a closing tag", () => {
  try {
    element.parseOrThrow('<input type="text"></input>');
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assert(error.message.includes("Unexpected end tag on a void element"));
  }

  try {
    element.parseOrThrow(
      `<input type="text">

      </input>`,
    );
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assert(error.message.includes("Unexpected end tag on a void element"));
  }
});

Deno.test("void elements", () => {
  const content = fragments.parseOrThrow(
    '<img src="something.png"><br><input type=submit value=Ok />',
  );
  assertEquals(content, [
    {
      tagName: "img",
      kind: ElementKind.VOID,
      attributes: [["src", "something.png"]],
    },
    { tagName: "br", kind: ElementKind.VOID, attributes: [] },
    {
      tagName: "input",
      kind: ElementKind.VOID,
      attributes: [["type", "submit"], ["value", "Ok"]],
    },
  ]);
});

Deno.test("raw text elements", () => {
  const style = element.parseOrThrow(`
    <style>
      .box {
        color: blue;
      }
    </style>
    `.trim());

  assertObjectMatch(style, {
    tagName: "style",
    kind: ElementKind.RAW_TEXT,
    attributes: [],
    children: [{
      kind: "TEXT",
      text: `
      .box {
        color: blue;
      }
    `,
    }],
  });

  const script = element.parseOrThrow(`
    <script>
      <
      </
      </s
      </sc
      </scr
      </scri
      </scrip
      console.log(1 < 2);
    </script>
    `.trim());

  assertObjectMatch(script, {
    tagName: "script",
    kind: ElementKind.RAW_TEXT,
    attributes: [],
    children: [{
      kind: "TEXT",
      text: `
      <
      </
      </s
      </sc
      </scr
      </scri
      </scrip
      console.log(1 < 2);
    `,
    }],
  });
});

Deno.test("empty raw text element", () => {
  const script = element.parseOrThrow(
    `<script type="module" src="/src/module.js"></script>`,
  );

  assertEquals(script, {
    tagName: "script",
    kind: ElementKind.RAW_TEXT,
    attributes: [["type", "module"], ["src", "/src/module.js"]],
    children: [],
  });
});

Deno.test("normal element", () => {
  const empty_span = element.parseOrThrow(
    `<span class="icon"></span>`,
  );
  assertObjectMatch(empty_span, {
    tagName: "span",
    kind: ElementKind.NORMAL,
    attributes: [["class", "icon"]],
    children: [],
  });

  const p = element.parseOrThrow(
    `<p>lorem</p>`,
  );
  assertObjectMatch(p, {
    tagName: "p",
    kind: ElementKind.NORMAL,
    attributes: [],
    children: [{ kind: "TEXT", text: "lorem" }],
  });
});

Deno.test("custom elements", () => {
  const res = fragments.parseOrThrow(`
    <something-different>
      <atom-text-editor mini>
        Hello
      </atom-text-editor>
    </something-different>
    `.trim());

  const node = {
    tagName: "something-different",
    kind: ElementKind.NORMAL,
    attributes: [],
    children: [textNode("\n      "), {
      tagName: "atom-text-editor",
      kind: ElementKind.NORMAL,
      attributes: [["mini", ""]],
      children: [textNode("\n        Hello\n      ")],
    }, textNode("\n    ")],
  };

  assertExists(res[0]);
  assertObjectMatch(res[0], node);
});

Deno.test("end tag omission ", () => {
  const li_omissions = element.parseOrThrow(
    `<ul>
      <li>Apples
      <li>Bananas
    </ul>`,
  );

  assertEquals(
    serializeNode(li_omissions),
    `<ul>
      <li>Apples
      </li><li>Bananas
    </li></ul>`,
  );

  const in_dl_omissions = element.parseOrThrow(
    `<dl>
      <dt>Coffee
      <dd>Black hot drink
      <dt>Milk
      <dd>White cold drink
    </dl>`,
  );

  assertEquals(
    serializeNode(in_dl_omissions),
    `<dl>
      <dt>Coffee
      </dt><dd>Black hot drink
      </dd><dt>Milk
      </dt><dd>White cold drink
    </dd></dl>`,
  );

  const p_omissions = element.parseOrThrow(
    `<body>
      <p>This is the first paragraph.
      <p>This is the second paragraph, and it ends when the next div begins.
      <div>A block element</div>
    </body>`,
  );

  assertEquals(
    serializeNode(p_omissions),
    `<body>
      <p>This is the first paragraph.
      </p><p>This is the second paragraph, and it ends when the next div begins.
      </p><div>A block element</div>
    </body>`,
  );

  const option_omissions = element.parseOrThrow(
    `<select>
      <option value="1">One
      <option value="2">Two
      <option value="3">Three
    </select>`,
  );

  assertEquals(
    serializeNode(option_omissions),
    `<select>
      <option value="1">One
      </option><option value="2">Two
      </option><option value="3">Three
    </option></select>`,
  );

  const in_table_omissions = element.parseOrThrow(
    `<table>
  <caption>37547 TEE Electric Powered Rail Car Train Functions (Abbreviated)
  <colgroup><col><col><col>
  <thead>
    <tr> <th>Function                              <th>Control Unit     <th>Central Station
  <tbody>
    <tr> <td>Headlights                            <td>✔                <td>✔
    <tr> <td>Interior Lights                       <td>✔                <td>✔
    <tr> <td>Electric locomotive operating sounds  <td>✔                <td>✔
    <tr> <td>Engineer's cab lighting               <td>                 <td>✔
    <tr> <td>Station Announcements - Swiss         <td>                 <td>✔
  </table>`,
  );

  assertEquals(
    serializeNode(in_table_omissions),
    `<table>
  <caption>37547 TEE Electric Powered Rail Car Train Functions (Abbreviated)
  </caption><colgroup><col><col><col>
  </colgroup><thead>
    <tr> <th>Function                              </th><th>Control Unit     </th><th>Central Station
  </th></tr></thead><tbody>
    <tr> <td>Headlights                            </td><td>✔                </td><td>✔
    </td></tr><tr> <td>Interior Lights                       </td><td>✔                </td><td>✔
    </td></tr><tr> <td>Electric locomotive operating sounds  </td><td>✔                </td><td>✔
    </td></tr><tr> <td>Engineer's cab lighting               </td><td>                 </td><td>✔
    </td></tr><tr> <td>Station Announcements - Swiss         </td><td>                 </td><td>✔
  </td></tr></tbody></table>`,
  );
});

Deno.test("entities", () => {
  const entities = fragments.parseOrThrow(`
    <p>Named entities: &nbsp; dolor sit &copy; amet.</p>
    <p>Numeric entities: &#160; dolor sit &#8212; amet.</p>
    <p>Misc entities: &#xA0; dolor &#xa0; sit &nbsp; amet.</p>
  `.trim());

  assertObjectMatch({ entities }, {
    entities: [
      {
        tagName: "p",
        kind: ElementKind.NORMAL,
        attributes: [],
        children: [{
          kind: "TEXT",
          text: `Named entities: &nbsp; dolor sit &copy; amet.`,
        }],
      },
      textNode("\n    "),
      {
        tagName: "p",
        kind: ElementKind.NORMAL,
        attributes: [],
        children: [{
          kind: "TEXT",
          text: "Numeric entities: &#160; dolor sit &#8212; amet.",
        }],
      },
      textNode("\n    "),
      {
        tagName: "p",
        kind: ElementKind.NORMAL,
        attributes: [],
        children: [{
          kind: "TEXT",
          text: "Misc entities: &#xA0; dolor &#xa0; sit &nbsp; amet.",
        }],
      },
    ],
  });
});

Deno.test("serialize", () => {
  const samples = ["text", "<!-- comment -->", "<span>no whitespace</span>"];

  const indentation = `<span>
            <a href="#">First</a>
            <a href="#">Second</a>
  </span>`;

  const spaces = `Hello, <a href="#"> World </a>!`;

  const nested = `
    <div>
      <p>
        <button>click</button>
      </p>
      <p>
        Multi-line
        text
      </p>
      <p>
        <input type="checkbox">
      </p>
    </div>
    `.trim();

  for (const sample of [...samples, indentation, spaces, nested]) {
    assertEquals(serializeFragments(fragments.parseOrThrow(sample)), sample);
  }

  assertEquals(
    serializeFragments(
      fragments.parseOrThrow(
        `<!-- A form --><form><input value='"' checked></form>`,
      ),
      {
        removeComments: true,
      },
    ),
    `<form><input value='"' checked></form>`,
  );
});

// A single newline at the start or end of pre blocks is ignored by the HTML parser but a space followed by a newline is not
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
Deno.test("serialize pre elements", () => {
  const newlines = `<pre>

Two newlines, only the first one would be dropped

</pre>
`;
  const spaces = `<pre>
A single whitespace before the linebreak is not dropped
 </pre>
`;

  const indentation = `<pre>
    Indentation is kept
</pre>
`;

  const samples = [newlines, spaces, indentation];
  for (const sample of samples) {
    assertEquals(
      serializeFragments(fragments.parseOrThrow(sample)),
      sample,
    );
  }
});

Deno.test("declarative shadowroot", () => {
  try {
    shadowRoot.parseOrThrow(`<span></span>`);
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assert(error.message.includes("Expected a template element"));
  }

  try {
    shadowRoot.parseOrThrow(`<template></template>`);
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assert(error.message.includes("Expected a declarative shadow root"));
  }

  shadowRoot.parseOrThrow(
    `<template shadowrootmode="open">
  <style>
    h1 {
      color: red;
    }
    ::slotted(p) {
      color: green;
    }
  </style>

  <article>
    <h1><slot name="title"></slot></h1>
    <h2><slot name="subtitle"></slot></h2>
    <button on:click="hi">hi</button>
    <slot></slot>
  </article>
</template>
`,
  );
});

Deno.test("html", () => {
  html.parseOrThrow(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>

</body>
</html>`,
  );
});

Deno.test("guards", () => {
  const [comment] = fragments.parseOrThrow("<!-- -->");
  assert(isCommentNode(comment));

  const [element] = fragments.parseOrThrow("<input>");
  assert(isElementNode(element));

  const [text] = fragments.parseOrThrow("Hello");
  assert(isTextNode(text));

  assertEquals(isMNode(null), false);
  assertEquals(isMNode(1), false);
  assertEquals(isMNode({}), false);
});
