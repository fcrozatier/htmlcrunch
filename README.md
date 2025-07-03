# HTMLCrunch

A simple, lightweight HTML parser

## Features

- follows the spec closely
- parse [elements](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/element),
  [fragments](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/fragments) and whole
  [html](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/html) documents
- [`isCommentNode`](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/isCommentNode),
  [`isTextNode`](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/isTextNode) and
  [`isElementNode`](https://jsr.io/@fcrozatier/htmlcrunch/doc/~/isElementNode)
  guards to assist in tree walking
- supports tag omissions

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
as well as the end tags of `<table>` children elements can be omitted for a
terser authoring experience

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

## [API](https://jsr.io/@fcrozatier/htmlcrunch/doc)
