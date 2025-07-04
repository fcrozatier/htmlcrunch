import { assertEquals } from "@std/assert";
import { assertObjectMatch } from "@std/assert/object-match";
import {
  comment,
  COMMENT_REGEX,
  commentNode,
  element,
  ElementKind,
  fragments,
  NodeKind,
  spacesAndComments,
  textNode,
} from "../parser.ts";

Deno.test("the comments regex follows the spec", () => {
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

Deno.test("single and multiline comments", () => {
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
});

Deno.test("arrows and comment-like patterns inside comments", () => {
  const edgeCaseComment = comment.parseOrThrow(
    `<!--My favorite operators are > and <!-->`,
  );

  assertObjectMatch(edgeCaseComment, {
    kind: NodeKind.COMMENT,
    text: "My favorite operators are > and <!",
  });

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

Deno.test("nested comments", () => {
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
