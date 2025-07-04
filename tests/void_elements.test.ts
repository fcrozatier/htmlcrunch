import { ParseError } from "@fcrozatier/monarch";
import {
  assert,
  assertInstanceOf,
  assertObjectMatch,
  unreachable,
} from "@std/assert";
import { element, ElementKind, fragments } from "../parser.ts";

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
        "Unexpected self-closing tag on a non-void element",
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
