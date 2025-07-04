import { assertEquals } from "@std/assert";
import { doctype, html, serializeFragments, textNode } from "../parser.ts";

Deno.test("doctype", () => {
  const res = doctype.parseOrThrow("<!Doctype Html >");

  assertEquals(res, textNode("<!DOCTYPE html>"));
});

Deno.test("html document structure", () => {
  const content = html.parseOrThrow(
    `\ufeff

<!-- Before doctype -->

<!DOCTYPE html>

<!-- Before html -->

<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
    The body
</body>
</html>

<!-- After html -->

`,
  );

  assertEquals(
    serializeFragments(content),
    `\ufeff

<!-- Before doctype -->

<!DOCTYPE html>

<!-- Before html -->

<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
    The body
</body>
</html>

<!-- After html -->

`,
  );
});
