import { ParseError } from "@fcrozatier/monarch";
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertObjectMatch,
  unreachable,
} from "@std/assert";
import {
  ElementKind,
  fragments,
  isCommentNode,
  isElementNode,
  isMNode,
  isTextNode,
  serializeFragments,
  shadowRoot,
  textNode,
} from "../parser.ts";

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
