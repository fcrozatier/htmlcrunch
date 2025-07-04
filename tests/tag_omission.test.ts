import { assertEquals } from "@std/assert";
import { element, serializeNode } from "../parser.ts";

Deno.test("<li> end tag omission ", () => {
  const ul = element.parseOrThrow(
    `<ul>
      <li>Apples
      <li>Bananas
    </ul>`,
  );

  assertEquals(
    serializeNode(ul),
    `<ul>
      <li>Apples
      </li><li>Bananas
    </li></ul>`,
  );
});

Deno.test("<dt> and <dd> end tag omission", () => {
  const dl = element.parseOrThrow(
    `<dl>
      <dt>Coffee
      <dd>Black hot drink
      <dt>Milk
      <dd>White cold drink
    </dl>`,
  );

  assertEquals(
    serializeNode(dl),
    `<dl>
      <dt>Coffee
      </dt><dd>Black hot drink
      </dd><dt>Milk
      </dt><dd>White cold drink
    </dd></dl>`,
  );
});

Deno.test("<p> end tag omission", () => {
  const body = element.parseOrThrow(
    `<body>
      <p>This is the first paragraph.
      <p>This is the second paragraph, and it ends when the next div begins.
      <div>A block element</div>
    </body>`,
  );

  assertEquals(
    serializeNode(body),
    `<body>
      <p>This is the first paragraph.
      </p><p>This is the second paragraph, and it ends when the next div begins.
      </p><div>A block element</div>
    </body>`,
  );
});

Deno.test("<option> end tag omission", () => {
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
});

Deno.test("end tag omission in <table>", () => {
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

  assertEquals(
    serializeNode(table),
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

Deno.test("<body> end tag omission", () => {
  const body = element.parseOrThrow(
    `<body>
      <p>This is the first paragraph.
      <p>This is the second paragraph, and it ends when the next div begins.
      <div>A block element</div>`,
  );

  assertEquals(
    serializeNode(body),
    `<body>
      <p>This is the first paragraph.
      </p><p>This is the second paragraph, and it ends when the next div begins.
      </p><div>A block element</div></body>`,
  );
});

Deno.test("<html> end tag omission", () => {
  const html = element.parseOrThrow(
    `<html>
      <body>
      <p>This is the first paragraph.
      <p>This is the second paragraph, and it ends when the next div begins.
      <div>A block element</div>`,
  );

  assertEquals(
    serializeNode(html),
    `<html>
      <body>
      <p>This is the first paragraph.
      </p><p>This is the second paragraph, and it ends when the next div begins.
      </p><div>A block element</div></body></html>`,
  );
});

Deno.test("<head> end tag omission", () => {
  const html = element.parseOrThrow(
    `<html>
      <head>
        <title>This is the title</title>
      <body>
      <p>This is the first paragraph.
      <p>This is the second paragraph, and it ends when the next div begins.
      <div>A block element</div>`,
  );

  assertEquals(
    serializeNode(html),
    `<html>
      <head>
        <title>This is the title</title></head>
      <body>
      <p>This is the first paragraph.
      </p><p>This is the second paragraph, and it ends when the next div begins.
      </p><div>A block element</div></body></html>`,
  );
});
