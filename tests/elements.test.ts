import { ParseError } from "@fcrozatier/monarch";
import { assert } from "@std/assert";
import { assertEquals } from "@std/assert/equals";
import { assertInstanceOf } from "@std/assert/instance-of";
import { assertObjectMatch } from "@std/assert/object-match";
import { assertStringIncludes } from "@std/assert/string-includes";
import { unreachable } from "@std/assert/unreachable";
import {
  customElementName,
  element,
  ElementKind,
  fragments,
  serializeNode,
  tagName,
  textNode,
} from "../parser.ts";

Deno.test("html tag names are lowercased", () => {
  const name = tagName.parseOrThrow("Abc-d");
  assertEquals(name, "abc-d");
});

Deno.test("foreign elements tag name casing is preserved", () => {
  const markup = "<svg><animateTransform/></svg>";
  const svg = element.parseOrThrow(markup);
  assertEquals(serializeNode(svg), markup.replace("/>", ">"));
});

Deno.test("simple void element", () => {
  const input = element.parseOrThrow('<input type="text">');

  assertObjectMatch(input, {
    tagName: "input",
    kind: ElementKind.VOID,
    attributes: [["type", "text"]],
  });
});

Deno.test("On void elements the closing slash is part of the unquoted attribute value", () => {
  // https://html.spec.whatwg.org/#start-tags
  const unquoted_attr_then_slash = element.parseOrThrow("<input type=text/>");

  assertObjectMatch(unquoted_attr_then_slash, {
    tagName: "input",
    kind: ElementKind.VOID,
    attributes: [["type", "text/"]],
  });
});

Deno.test("disallow self-closing non-void elements", () => {
  try {
    element.parseOrThrow("<div />");
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assert(
      error.message.includes(
        "Unexpected self-closing tag",
      ),
    );
  }
});

Deno.test("disallow closing tags on void elements", () => {
  try {
    element.parseOrThrow('<input type="text"></input>');
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assert(error.message.includes("Unexpected end tag"));
  }

  try {
    element.parseOrThrow(
      `<input type="text">

      </input>`,
    );
    unreachable();
  } catch (error) {
    assertInstanceOf(error, ParseError);
    assert(error.message.includes("Unexpected end tag"));
  }
});

Deno.test("multiple void elements", () => {
  const content = fragments.parseOrThrow(
    '<img src="something.png"><br><input type=submit value=Ok />',
  );

  assertObjectMatch({ content }, {
    content: [
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
    ],
  });
});

Deno.test("raw text elements", () => {
  const style = element.parseOrThrow(
    `<style>
      .box {
        color: blue;
      }
    </style>`,
  );

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

  const script = element.parseOrThrow(
    `<script>
      <
      </
      </s
      </sc
      </scr
      </scri
      </scrip
      console.log(1 < 2);
    </script>`,
  );

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

Deno.test("custom elements", () => {
  const res = element.parseOrThrow(
    `<something-different>
      <atom-text-editor mini>
        Hello
      </atom-text-editor>
    </something-different>`,
  );

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

  assertObjectMatch(res, node);
});

Deno.test("foreign svg elements", () => {
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
<!-- A self-closing tag -->
<circle cx="50" cy="50" r="40" stroke="green" fill="yellow"/>

<!-- Another self-closing tag but without the slash (valid in HTML, not in XML) -->
<rect x="10" y="10" width="30" height="30">

  <!-- Embedded foreign content  -->
  <script type="application/ecmascript">
      console.log("Inside SVG &lt;script&gt;");
  </script>

  <!-- Nested elements with same tag name -->
  <g>
    <g>
      <text x="10" y="90">Nested <tspan font-weight="bold">text</tspan> inside</text>
    </g>
  </g>

  <!-- Namespaced element -->
  <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="10s" repeatCount="indefinite"/>
</rect>
</svg>`;

  const svg = element.parseOrThrow(markup);

  assertEquals(serializeNode(svg), markup.replaceAll("/>", ">"));
});

Deno.test("foreign math elements", () => {
  const markup =
    `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <!-- Fractions -->
  <mfrac>
    <mrow>
      <mi>a</mi>
      <mo>+</mo>
      <mi>b</mi>
    </mrow>
    <mrow>
      <mi>c</mi>
      <mo>+</mo>
      <mi>d</mi>
    </mrow>
  </mfrac>

  <!-- Superscript and invisible multiplication -->
  <mo>&InvisibleTimes;</mo>
  <msup>
    <mi>x</mi>
    <mn>2</mn>
  </msup>

  <mo>/</mo>
  <msqrt>
    <mrow>
      <mi>e</mi>
      <mo>−</mo>
      <mi>f</mi>
    </mrow>
  </msqrt>

  <!-- Inline text -->
  <mtext fontstyle="italic">result ≠ expected</mtext>

  <semantics>
    <mrow>
      <mi>π</mi>
    </mrow>
    <annotation encoding="application/x-tex">pi</annotation>
  </semantics>
</math>`;

  const math = element.parseOrThrow(markup);
  assertEquals(serializeNode(math), markup);
});
