<div align="center">
  <img src="/assets/htmlcrunch.png" width="300" alt="">
</div>

# HTMLCrunch

A simple, lightweight HTML parser built on top of [Monarch](https://jsr.io/@fcrozatier/monarch)

## Features

- follows the [spec](https://html.spec.whatwg.org/) closely
- parse [elements](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/element),
  [fragments](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/fragments) and whole
  [html](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/html) documents
- transform the parse tree and use [`isCommentNode`](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/isCommentNode), [`isTextNode`](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/isTextNode) [`isElementNode`](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/isElementNode)
  or the generic [`isMNode`](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/isMNode) guards to branch on the different cases
- serialize [nodes](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/serializeNode) and [fragments](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/serializeFragments) back to strings and optionally [remove comments](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/SerializationOptions)
- the parser supports HTML [end tag omissions](#end-tag-omission)

## Simple example

```ts
import { fragments, serializeFragments } from "@fcrozatier/htmlcrunch";
import { assertEquals } from "@std/assert";

// A string of html or an html file
const content = `<div>html string...</div>`;

// Parse it with the `element`, `fragments` or `html` parsers
const parsed = fragments.parseOrThrow(content);

// Walk the parse tree, analyse and modify it ...

// Serialize the result with `serializeNode` or `serializeFragments`
const serialized = serializeFragments(parsed);

assertEquals(content, serialized);
```

## End tag omission

In HTML, the end tags of `<li>`, `<dt>`, `<dd>`, `<p>` and `<option>` elements,
as well as the end tags of `<table>` children elements [can be omitted](https://html.spec.whatwg.org/#syntax-tag-omission) for a lighter authoring experience

```ts
import { element, serializeNode } from "@fcrozatier/htmlcrunch";

// Omit `<li>` end tags
element.parseOrThrow(
  `<ul>
    <li>Apples
    <li>Bananas
  </ul>`,
);

// Omit `<dt>` and `<dd>` end tags
element.parseOrThrow(
  `<dl>
    <dt>Coffee
    <dd>Black hot drink
    <dt>Milk
    <dd>White cold drink
  </dl>`,
);

// Omit `<p>` end tags
element.parseOrThrow(
  `<body>
    <p>This is the first paragraph.
    <p>This is the second paragraph, and it ends when the next div begins.
    <div>A block element</div>
  </body>`,
);

// Omit `<option>` end tags
element.parseOrThrow(
  `<select>
    <option value="1">One
    <option value="2">Two
    <option value="3">Three
  </select>`,
);

// Omit end tags inside a `<table>`
const table = element.parseOrThrow(
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
```

## API

See the [interactive documentation](https://jsr.io/@fcrozatier/htmlcrunch/doc) on JSR.

The [elements](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/element), [fragments](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/fragments), [html](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/html) and [shadowRoot](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/shadowRoot) parsers are Monarch [Parsers](https://jsr.io/@fcrozatier/monarch/doc/~/Parser) and can thus be composed and extended with other Monarch parsers.

Their main methods are [`parse`](https://jsr.io/@fcrozatier/monarch/doc/~/Parser.prototype.parse) and [`parseOrThrow`](https://jsr.io/@fcrozatier/monarch/doc/~/Parser.prototype.parseOrThrow). See [Monarch](https://jsr.io/@fcrozatier/monarch) documentation for the other available methods.