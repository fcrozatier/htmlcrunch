import { assertEquals } from "@std/assert";
import { attribute, element, ElementKind, tagName } from "../parser.ts";

Deno.test("tag names are lowercased", () => {
  const name = tagName.parseOrThrow("Abc-d");
  assertEquals(name, "abc-d");
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
