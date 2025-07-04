import {
  alt,
  between,
  createParser,
  fail,
  many,
  type Parser,
  result,
  sepBy,
  seq,
} from "@fcrozatier/monarch";
import {
  literal,
  regex,
  whitespaces,
  whitespaces1,
} from "@fcrozatier/monarch/common";
import { assert, assertEquals, assertExists } from "@std/assert";

/**
 * @internal
 */
interface MNodeBase {
  kind: string;
  parent?: MElement | undefined;
  children?: MFragment | undefined;
}

/**
 * A comment node
 *
 * @see {@linkcode MTextNode}
 * @see {@linkcode MElement}
 */
export interface MCommentNode extends MNodeBase {
  /**
   * The kind of node
   */
  kind: "COMMENT";
  /**
   * The content of the comment
   */
  text: string;
  /**
   * Comment nodes don't have children
   */
  children?: never;
}

/**
 * A text node
 *
 * @see {@linkcode MCommentNode}
 * @see {@linkcode MElement}
 */
export interface MTextNode extends MNodeBase {
  /**
   * The kind of node
   */
  kind: "TEXT";
  /**
   * The content of the text node
   */
  text: string;
  /**
   * Text nodes don't have children
   */
  children?: never;
}

/**
 * A CDATA node
 *
 * @see {@linkcode MCommentNode}
 * @see {@linkcode MElement}
 */
export interface MCDATANode extends MNodeBase {
  /**
   * The kind of node
   */
  kind: "CDATA";
  /**
   * The CDATA content
   */
  text: string;
  /**
   * CDATA nodes don't have children
   */
  children?: never;
}

/**
 * An element node
 *
 * @see {@linkcode MCommentNode}
 * @see {@linkcode MTextNode}
 */
export interface MElement extends MNodeBase {
  /**
   * The element tag name
   */
  tagName: string;
  /**
   * The kind of element
   *
   * One of the six [kinds of HTML elements](https://html.spec.whatwg.org/#elements-2)
   */
  kind: ElementKind;
  /**
   * The attributes of the element
   */
  attributes: [string, string][];
  /**
   * The children elements
   */
  children?: MFragment;
  /**
   * Whether a node is a self-closing void or foreign element
   */
  selfClosing?: boolean;
}

/**
 * Describes sequences of comments and whitespaces text nodes
 */
export type MSpacesAndComments = (MTextNode | MCommentNode)[];

/**
 * The generic node type
 */
export type MNode = MCommentNode | MTextNode | MElement | MCDATANode;

/**
 * A fragment node
 */
export type MFragment = MNode[];

/**
 * The different [kinds of HTML elements](https://html.spec.whatwg.org/#elements-2)
 *
 * @example
 *
 * ```ts
 * import { Kind, element } from "@fcrozatier/htmlcrunch";
 * import { assertObjectMatch } from "@std/assert";
 *
 * const input = element.parseOrThrow(`<input type=checkbox>`);
 *
 * assertObjectMatch(input, {
 *   tagName: "input",
 *   kind: "VOID",
 *   attributes: []
 * });
 * ```
 */
export const ElementKind = {
  VOID: "VOID",
  TEMPLATE: "TEMPLATE",
  RAW_TEXT: "RAW_TEXT",
  ESCAPABLE_RAW_TEXT: "ESCAPABLE_RAW_TEXT",
  FOREIGN: "FOREIGN",
  NORMAL: "NORMAL",
} as const;

/**
 * The different types HTML elements
 */
type ElementKind = keyof typeof ElementKind;

/**
 * The different types of nodes
 *
 * @see {@linkcode ElementKind}
 */
export const NodeKind = {
  COMMENT: "COMMENT",
  TEXT: "TEXT",
  CDATA: "CDATA",
  ...ElementKind,
} as const;

/**
 * Helper function to create text nodes
 *
 * @example
 *
 ```ts
 * import { textNode } from "@fcrozatier/htmlcrunch";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *  textNode("My text"),
 *  { kind: "TEXT", text: "My text" }
 * )
 * ```
 *
 * @param text The content of the text node
 *
 * @see {@linkcode commentNode}
 */
export const textNode = (text: string): MTextNode => ({ kind: "TEXT", text });

const whitespaceOnlyText = whitespaces.map(textNode);

/**
 * Helper function to create comment nodes
 *
 * @example
 *
 * ```ts
 * import { commentNode } from "@fcrozatier/htmlcrunch";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *  commentNode("My comment"),
 *  { kind: "COMMENT", text: "My comment" }
 * )
 * ```
 *
 * @param text The content of the comment
 *
 * @see {@linkcode commentNode}
 */
export const commentNode = (text: string): MCommentNode => ({
  kind: "COMMENT",
  text,
});

/**
 * @internal
 */
export const COMMENT_REGEX = /^(?!>|->)((?!<!--[^>]|-->|--!>|<!-$)\p{Any})*/v;

/**
 * Parses [HTML comments](https://html.spec.whatwg.org/#comments)
 */
export const comment: Parser<MCommentNode> = between(
  literal("<!--"),
  regex(COMMENT_REGEX),
  literal("-->"),
).map(commentNode);

/**
 * Parses a sequence of comments maybe surrounded by whitespace
 */
export const spacesAndComments: Parser<MSpacesAndComments> = seq(
  whitespaceOnlyText,
  sepBy(comment, whitespaces),
  whitespaceOnlyText,
).map((res) => res.flat());

/**
 * Parses a modern [HTML doctype](https://html.spec.whatwg.org/#syntax-doctype)
 */
export const doctype: Parser<MTextNode> = regex(/^<!DOCTYPE\s+html\s*>/i)
  .map(() => textNode("<!DOCTYPE html>"))
  .error("Expected a valid doctype");

const singleQuote = literal("'");
const doubleQuote = literal('"');

/**
 * Parses HTML text
 */
const text: Parser<MTextNode> = regex(/^[^<]+/).map(textNode);

/**
 * Parses raw text inside raw text elements and escapable raw text elements
 *
 * Restrictions on the contents of raw text and escapable raw text elements
 * https://html.spec.whatwg.org/#cdata-rcdata-restrictions
 */
const rawText: (tagName: string) => Parser<MTextNode[]> = (tagName: string) =>
  regex(
    new RegExp(String.raw`^(?:(?!</(?i:${tagName})[\t\n\f\r\u0020>/]).|\n)*`),
  ).map((t) => t.length > 0 ? [textNode(t)] : []);

/**
 * Parses [CDATA Sections](https://html.spec.whatwg.org/#cdata-sections)
 */
const cdata: Parser<MCDATANode> = between(
  literal("<![CDATA["),
  regex(/^(?:(?!\]\]>)\p{Any})*/u),
  literal("]]>"),
).map((text) => ({ kind: "CDATA", text }));

/**
 * Parses an HTML attribute name
 *
 * https://html.spec.whatwg.org/#attributes-2 + skip ASCII whitespaces
 */
const attributeName = regex(
  /^[^\x7f-\x9f\s"'>\/=\p{Noncharacter_Code_Point}]+/u,
)
  .skipTrailing(whitespaces)
  .error("Expected a valid attribute name");

const attributeValue = alt(
  between(singleQuote, regex(/^[^']*/), singleQuote),
  between(doubleQuote, regex(/^[^"]*/), doubleQuote),
  regex(/^[^\s='"<>`]+/),
);

/**
 * Parsers an HTML attribute
 */
export const attribute: Parser<[string, string]> = alt<[string, string]>(
  seq(
    attributeName,
    literal("=").skipTrailing(whitespaces),
    attributeValue,
  ).map(([name, _, value]) => [name, value]),
  attributeName.map((name) => [name, ""]),
).skipTrailing(whitespaces);

const FORBIDDEN_CUSTOM_ELEMENT_NAMES = [
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph",
];

/**
 * https://html.spec.whatwg.org/multipage/custom-elements.html#prod-pcenchar
 */
const potentialCustomElementNameChars = regex(
  /^(?:[-._]|[0-9]|[a-z]|\xB7|[\xC0-\xD6]|[\xD8-\xF6]|[\xF8-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u203F-\u2040]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\u{10000}-\u{EFFFF}])*/ui,
);

const potentialCustomElementName = seq(
  regex(/^[a-z]/i),
  potentialCustomElementNameChars,
).map((value) => value.join("").toLowerCase())
  .error("Invalid custom element name");

/**
 * Validates Custom Element names
 *
 * https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 */
export const customElementName: Parser<string> = potentialCustomElementName
  .chain((name) => {
    if (FORBIDDEN_CUSTOM_ELEMENT_NAMES.includes(name)) {
      return fail.error("Forbidden custom element name");
    }
    if (!name.includes("-")) {
      return fail.error("Invalid custom element name (should include a dash)");
    }
    return result(name);
  });

// Tracks the stack of foreign namespaces
const foreignStack: string[] = [];

/**
 * HTML tag names are ASCII alphanumeric only
 *
 * https://html.spec.whatwg.org/#syntax-tag-name
 */
const htmlTagName = regex(/^[a-z][a-z0-9]*/i)
  .map((name) => foreignStack.length > 0 ? name : name.toLowerCase())
  .error("Invalid html tag name");

/**
 * HTML tag-name
 * https://html.spec.whatwg.org/#tag-name-state
 *
 * More generally XML names can have colons, dashes etc.
 * https://www.w3.org/TR/REC-xml/#NT-NameStartChar
 */
export const tagName: Parser<string> = alt(customElementName, htmlTagName);

// https://html.spec.whatwg.org/#start-tags
const startTag: Parser<MElement> = seq(
  literal("<"),
  tagName,
  alt(
    whitespaces1.chain(() => many(attribute)),
    result([]),
  ),
  regex(/\/?>/),
).error("Invalid start tag")
  .chain(([_, tagName, attributes, end]) => {
    const kind = elementKind(tagName);
    const selfClosing = end === "/>" || kind === ElementKind.VOID;

    if (
      selfClosing &&
      kind !== ElementKind.VOID &&
      kind !== ElementKind.FOREIGN
    ) {
      return fail.error("Unexpected self-closing tag on a non-void element");
    }

    return result({ tagName, kind, attributes, selfClosing });
  });

/**
 * Parses an HTML element and returns an {@linkcode MElement} node
 *
 * @example Hanging bracket
 *
 * ```ts
 * import { commentNode } from "@fcrozatier/htmlcrunch";
 * import { assertObjectMatch } from "@std/assert";
 *
 * const hangingBracket = element.parseOrThrow(
 *   `<input
 *   disabled
 *   >`,
 * );
 *
 * assertObjectMatch(hangingBracket, {
 *   tagName: "input",
 *   kind: "VOID",
 *   attributes: [["disabled",""]],
 * });
 * ```
 *
 * @example Element with commented content
 *
 * ```ts
 * import { commentNode } from "@fcrozatier/htmlcrunch";
 * import { assertObjectMatch } from "@std/assert";
 *
 * assertObjectMatch(
 *  element.parseOrThrow(`<div><!-- <span>html inside comment</span> --></div>`),
 *  {
 *  kind: "NORMAL",
 *  tagName: "div",
 *  attributes: [],
 *  children: [
 *    { kind: "COMMENT", text: " <span>html inside comment</span> " },
 *  ],
 * })
 * ```
 *
 * @see {@linkcode fragments}
 */
export const element: Parser<MElement> = createParser((input, position) => {
  const openTag = startTag.parse(input, position);

  if (!openTag.success) return openTag;

  assertEquals(openTag.results.length, 1);
  const [openTagResult] = openTag.results;
  assertExists(openTagResult);

  const {
    value: { tagName, kind, attributes, selfClosing },
    remaining,
    position: openTagPosition,
  } = openTagResult;

  if (selfClosing) {
    // Void elements only have a start tag, end tags must not be specified
    // https://html.spec.whatwg.org/#syntax-tags
    if (remaining.match(new RegExp(String.raw`^\s*</${tagName}>`, "i"))) {
      return {
        success: false,
        message: "Unexpected end tag",
        position: openTagPosition,
      };
    }
    return openTag;
  }

  const avoidOpenTags = endTagOmission[tagName]?.open
    ?.map((tag) => `(?!<${tag})`).join("");

  let childrenElementsParser: Parser<MFragment>;

  if (
    kind === ElementKind.RAW_TEXT ||
    kind === ElementKind.ESCAPABLE_RAW_TEXT
  ) {
    childrenElementsParser = rawText(tagName);
  } else {
    childrenElementsParser = many(
      alt<MNode>(
        text,
        avoidOpenTags
          ? regex(new RegExp("^" + avoidOpenTags, "i")).chain(() => element)
          : element,
        ...(foreignStack.length > 0 ? [cdata] : []),
        comment,
      ),
    );
  }

  const elementNode: MElement = {
    tagName,
    kind,
    attributes,
    children: [],
  };

  let childrenRemaining = remaining;
  let childrenPosition = openTagPosition;

  const childrenElements = childrenElementsParser.parse(
    childrenRemaining,
    childrenPosition,
  );

  if (!childrenElements.success) {
    return childrenElements;
  }

  assertEquals(childrenElements.results.length, 1);
  const [childrenElementsResult] = childrenElements.results;
  assertExists(childrenElementsResult);

  childrenRemaining = childrenElementsResult.remaining;
  childrenPosition = childrenElementsResult.position;

  for (const child of childrenElementsResult.value) {
    child.parent = elementNode;
    elementNode.children?.push(child);
  }

  const endTagPattern = [
    endTagOmission[tagName]?.open?.map((tag) => `^(?=<${tag})`),
    endTagOmission[tagName]?.closed?.map((tag) =>
      String.raw`^(?=</${tag}\s*>)`
    ),
    endTagOmission[tagName]?.regex,
    String.raw`^</${tagName}\s*>`,
  ].flat().filter(Boolean).join("|");

  const endTagRegex = new RegExp(endTagPattern, "i");

  const endTagParser = tagName in endTagOmission
    ? regex(endTagRegex)
    : regex(endTagRegex).error(`Expected a '</${tagName}>' end tag`);

  const res = endTagParser.parse(childrenRemaining, childrenPosition);
  if (!res.success) return res;

  const [result] = res.results;
  assertExists(result);

  if (tagName === "svg" || tagName === "math") {
    assert(foreignStack.length > 0);
    foreignStack.pop();
  }

  return {
    success: true,
    results: [{
      value: elementNode,
      remaining: result.remaining,
      position: result.position,
    }],
  };
});

/**
 * Parses HTML {@linkcode MFragment fragments}
 *
 * @example
 *
 * ```ts
 * import { fragments, Kind } from "@fcrozatier/htmlcrunch";
 * import { assertObjectMatch } from "@std/assert";
 *
 * const content = fragments.parseOrThrow(
 *   '<img src="image.png"><br><input type=submit value=Ok />',
 * )
 *
 * assertObjectMatch({ content }, { content: [
 *   {
 *     tagName: "img",
 *     kind: Kind.VOID,
 *     attributes: [["src", "image.png"]],
 *   },
 *   { tagName: "br", kind: Kind.VOID, attributes: [] },
 *   {
 *     tagName: "input",
 *     kind: Kind.VOID,
 *     attributes: [["type", "submit"], ["value", "Ok"]],
 *   },
 * ]});
 * ```
 *
 * @see {@linkcode element}
 */
export const fragments: Parser<MFragment> = many(
  alt<MNode>(text, element, comment),
);

/**
 * Parses a template element with declarative shadow root and returns a fragment
 *
 * Expects a declarative shadowroot template
 *
 * @example Declarative shadowroot template file
 *
 * ```ts
 * import { shadowRoot } from "@fcrozatier/htmlcrunch";
 *
 * shadowRoot.parseOrThrow(
 *  `<template shadowrootmode="open">
 *    <style>
 *      h1 {
 *        color: red;
 *      }
 *      ::slotted(p) {
 *        color: green;
 *      }
 *    </style>
 *
 *    <article>
 *      <h1><slot name="title"></slot></h1>
 *      <h2><slot name="subtitle"></slot></h2>
 *      <button on:click="hi">hi</button>
 *      <slot></slot>
 *    </article>
 *  </template>`);
 * ```
 *
 * @see {@linkcode fragments}
 * @see {@linkcode element}
 */
export const shadowRoot: Parser<MFragment> = createParser(
  (input, position) => {
    const result = seq(
      spacesAndComments,
      element,
    ).map((res) => res.flat()).parse(input, position);

    if (!result.success) return result;

    const maybeTemplate = result.results[0]?.value.at(-1) as MElement;

    if (maybeTemplate.tagName !== "template") {
      return {
        success: false,
        message: "Expected a template element",
        position,
      };
    }

    if (
      !maybeTemplate.attributes.find(([k, v]) =>
        k === "shadowrootmode" && v === "open"
      )
    ) {
      return {
        success: false,
        message: "Expected a declarative shadow root",
        position,
      };
    }

    return result;
  },
);

/**
 * Parses an [HTML document](https://html.spec.whatwg.org/#writing)
 *
 * @example
 *
 * ```ts
 * import { html } from "@fcrozatier/htmlcrunch";
 * import { assertEquals } from "@std/assert";
 *
 * html.parseOrThrow(
 *  `<!DOCTYPE html>
 *   <html lang="en">
 *   <head>
 *     <meta charset="UTF-8">
 *     <meta name="viewport" content="width=device-width, initial-scale=1.0">
 *     <title>Document</title>
 *   </head>
 *   <body>
 *   </body>
 *   </html>
 * `);
 * ```
 *
 * @return A fragment containing the doctype as a text node and the html element node
 */
export const html: Parser<MFragment> = seq(
  spacesAndComments,
  doctype,
  spacesAndComments,
  element,
  spacesAndComments,
).map((fragments) => fragments.flat());

/**
 * The serialization options
 */
export type SerializationOptions = {
  /**
   * Whether comments should be included in the serialization
   */
  removeComments?: boolean;
};

/**
 * Serializes a {@linkcode MNode node}
 *
 * Follows the [end tag omission rules](https://html.spec.whatwg.org/#syntax-tag-omission) of HTML
 *
 * Optionally remove comments
 *
 * @example Omitted `</li>`
 *
 * ```ts
 * import { element, serializeNode } from "@fcrozatier/htmlcrunch";
 * import { assertEquals } from "@std/assert";
 *
 * // Omit `<li>` end tags
 * const ul = element.parseOrThrow(
 *  `<ul>
 *    <li>Apples
 *    <li>Bananas
 *  </ul>`
 * );
 *
 * assertEquals(serializeNode(ul),
 *  `<ul>
 *    <li>Apples
 *    </li><li>Bananas
 *  </li></ul>`
 * );
 * ```
 *
 * @example Remove comments
 *
 * ```ts
 * import { element, serializeNode } from "@fcrozatier/htmlcrunch";
 * import { assertEquals } from "@std/assert";
 *
 * const dl = element.parseOrThrow(
 *  `<dl>
 *     <!-- Comment -->
 *     <dt>Coffee
 *     <dd>Black hot drink
 *     <dt>Milk
 *     <dd>White cold drink
 *  </dl>`,
 * );
 *
 *  console.log(serializeNode(dl, { removeComments: true }));
 *  //<dl>
 *  //
 *  //  <dt>Coffee
 *  //  </dt><dd>Black hot drink
 *  //  </dd><dt>Milk
 *  //  </dt><dd>White cold drink
 *  //</dd></dl>
 * ```
 *
 * @param node The node to serialize
 * @param options Serialization options
 *
 * @see {@linkcode serializeFragments}
 */
export const serializeNode = (
  node: MNode,
  options?: SerializationOptions,
): string => {
  const { removeComments } = Object.assign(
    {},
    { removeComments: false },
    options,
  );

  if (node.kind === "TEXT") return node.text;
  if (node.kind === "COMMENT") {
    return removeComments ? "" : `<!--${node.text}-->`;
  }
  if (node.kind === "CDATA") {
    return `<![CDATA[${node.text}]]>`;
  }

  const attributes = node.attributes.map(([k, v]) => {
    const quotes = v.includes('"') ? "'" : '"';
    return booleanAttributes.includes(k) ? k : `${k}=${quotes}${v}${quotes}`;
  });

  const attributesString = attributes.length > 0
    ? ` ${attributes.join(" ")}`
    : "";
  const startTag = `<${node.tagName}${attributesString}>`;

  if (node.selfClosing) return startTag;

  const content = node.children
    ? node.children.map((node) => serializeNode(node, options))
      .join("")
    : "";
  return `${startTag}${content}</${node.tagName}>`;
};

/**
 * Serializes a {@linkcode MFragment fragment} node
 *
 * @example
 *
 * ```ts
 * import { fragments, serializeFragments } from "@fcrozatier/htmlcrunch";
 * import { assertEquals } from "@std/assert";
 *
 * const content = fragments.parseOrThrow(
 * `<!-- A form -->
 *  <form>
 *   <input type="checkbox" checked>
 *   <input type="text" checked>
 *   <button>Send</button>
 *  </form>`);
 *
 * assertEquals(
 *  serializeFragments(content, { removeComments: true }),
 *  `
 *  <form>
 *   <input type="checkbox" checked>
 *   <input type="text" checked>
 *   <button>Send</button>
 *  </form>`
 * );
 * ```
 *
 * @param fragment The fragment to serialize
 * @param options Serialization options
 *
 * @see {@linkcode serializeNode}
 */
export const serializeFragments = (
  fragment: MFragment,
  options?: SerializationOptions,
): string => {
  return fragment.map((node) => serializeNode(node, options)).join("");
};

/**
 * Associates a tag name to its corresponding {@linkcode ElementKind}
 *
 * The final kind is determined by the {@linkcode element} parser depending on the foreign element stack
 */
const elementKind = (tag: string): ElementKind => {
  if (tag === "template") return ElementKind.TEMPLATE;
  if (voidElements.includes(tag)) return ElementKind.VOID;
  if (rawTextElements.includes(tag)) return ElementKind.RAW_TEXT;
  if (escapableRawTextElements.includes(tag)) {
    return ElementKind.ESCAPABLE_RAW_TEXT;
  }
  if (tag === "svg" || tag === "math") {
    foreignStack.push(tag);
    return ElementKind.FOREIGN;
  }
  if (foreignStack.length > 0) {
    return ElementKind.FOREIGN;
  }
  return ElementKind.NORMAL;
};

/**
 * Checks whether an {@linkcode MNode} is an {@linkcode MCommentNode}
 *
 * @example
 *
 * ```ts
 * import { fragments, isCommentNode } from "@fcrozatier/htmlcrunch";
 * import { assert } from "@std/assert";
 *
 * const [comment] = fragments.parseOrThrow("<!-- -->");
 * assert(isCommentNode(comment));
 * ```
 *
 * @see {@linkcode isTextNode}
 * @see {@linkcode isElementNode}
 */
export const isCommentNode = (node: unknown): node is MCommentNode => {
  return isMNode(node) && node.kind === "COMMENT";
};

/**
 * Checks whether an {@linkcode MNode} is an {@linkcode MTextNode}
 *
 * @example
 *
 * ```ts
 * import { fragments, isTextNode } from "@fcrozatier/htmlcrunch";
 * import { assert } from "@std/assert";
 *
 * const [text] = fragments.parseOrThrow("Hello");
 * assert(isTextNode(text));
 * ```
 * @see {@linkcode isCommentNode}
 * @see {@linkcode isElementNode}
 */
export const isTextNode = (node: unknown): node is MTextNode => {
  return isMNode(node) && node.kind === "TEXT";
};

/**
 * Checks whether an {@linkcode MNode} is an {@linkcode MElement}
 *
 * @example
 *
 * ```ts
 * import { element, isTextNode } from "@fcrozatier/htmlcrunch";
 * import { assert } from "@std/assert";
 *
 * const [element] = fragments.parseOrThrow("<input>");
 * assert(isElementNode(element));
 *
 * @see {@linkcode isCommentNode}
 * @see {@linkcode isTextNode}
 */
export const isElementNode = (node: unknown): node is MElement => {
  return isMNode(node) && Object.keys(ElementKind).includes(node.kind);
};

/**
 * An {@linkcode MNode} guard
 *
 * @example
 *
 * ```ts
 * import { isMNode } from "@fcrozatier/htmlcrunch";
 * import { assert } from "@std/assert";
 *
 * assertEquals(isMNode({}), false);
 *
 * @see {@linkcode isCommentNode}
 * @see {@linkcode isElementNode}
 * @see {@linkcode isTextNode}
 */
export const isMNode = (node: unknown): node is MNode => {
  if (node === null) return false;
  if (typeof node !== "object") return false;

  if (
    ("kind" in node) && typeof (node.kind) === "string" &&
    Object.keys(NodeKind).includes(node.kind)
  ) {
    if (node.kind === NodeKind.COMMENT || node.kind === NodeKind.TEXT) {
      return "text" in node;
    }

    return "tagName" in node && "attributes" in node;
  }

  return false;
};

/**
 * End tag omission data
 *
 * The map of elements that can omit their end tag when followed by specific open or closed tags or if a specific regex pattern matches
 *
 * @see https://html.spec.whatwg.org/#syntax-tag-omission
 */
const endTagOmission: Record<
  string,
  { open?: string[]; closed?: string[]; regex?: string }
> = {
  body: { closed: ["html"], regex: "$" },
  caption: {
    open: ["colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td"],
  },
  colgroup: {
    open: ["thead", "tbody", "tfoot", "tr"],
  },
  head: { open: ["body"] },
  html: { regex: "$" },
  li: { open: ["li"], closed: ["ul", "ol", "menu"] },
  dd: { open: ["dd", "dt"], closed: ["dl", "div"] },
  dt: { open: ["dd", "dt"] },
  option: {
    open: ["option", "optgroup", "hr"],
    closed: ["select", "datalist", "optgroup"],
  },
  optgroup: { open: ["optgroup", "hr"], closed: ["select"] },
  p: {
    open: [
      "address",
      "article",
      "aside",
      "blockquote",
      "div",
      "dl",
      "fieldset",
      "figcaption",
      "figure",
      "footer",
      "form",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "hgroup",
      "hr",
      "main",
      "menu",
      "nav",
      "ol",
      "p",
      "pre",
      "section",
      "table",
      "ul",
    ],
    closed: [
      "address",
      "article",
      "aside",
      "body",
      "blockquote",
      "caption",
      "details",
      "dialog",
      "div",
      "dd",
      "dt",
      "fieldset",
      "figure",
      "figcaption",
      "footer",
      "form",
      "header",
      "hgroup",
      "li",
      "main",
      "nav",
      "object",
      "search",
      "section",
      "td",
      "th",
      "template",
    ],
  },
  rt: { open: ["rt", "rp"], closed: ["ruby"] },
  rp: { open: ["rt", "rp"], closed: ["ruby"] },
  thead: { open: ["tbody", "tfoot"] },
  tbody: { open: ["tbody", "tfoot"], closed: ["table"] },
  tfoot: { closed: ["table"] },
  td: { open: ["td", "th", "tr"], closed: ["tr", "table"] },
  th: { open: ["td", "th", "tbody"], closed: ["tr", "thead"] },
  tr: { open: ["tr", "tbody"], closed: ["table", "thead"] },
};

/**
 * The [void elements](https://html.spec.whatwg.org/#void-elements)
 */
const voidElements = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
];

/**
 * The [raw text elements](https://html.spec.whatwg.org/#raw-text-elements)
 */
const rawTextElements = ["script", "style"];

/**
 * The [escapable raw text elements](https://html.spec.whatwg.org/#escapable-raw-text-elements)
 */
const escapableRawTextElements = ["textarea", "title"];

/**
 * All the HTML boolean attributes
 */
export const booleanAttributes = [
  "allowfullscreen", // on <iframe>
  "async", // on <script>
  "autofocus", // on <button>, <input>, <select>, <textarea>
  "autoplay", // on <audio>, <video>
  "checked", // on <input type="checkbox">, <input type="radio">
  "controls", // on <audio>, <video>
  "default", // on <track>
  "defer", // on <script>
  "disabled", // on form elements like <button>, <fieldset>, <input>, <optgroup>, <option>,<select>, <textarea>
  "formnovalidate", // on <button>, <input type="submit">
  "hidden", // global
  "inert", // global
  "ismap", // on <img>
  "itemscope", // global; part of microdata
  "loop", // on <audio>, <video>
  "multiple", // on <input type="file">, <select>
  "muted", // on <audio>, <video>
  "nomodule", // on <script>
  "novalidate", // on <form>
  "open", // on <details>
  "readonly", // on <input>, <textarea>
  "required", // on <input>, <select>, <textarea>
  "reversed", // on <ol>
  "selected", // on <option>
];
