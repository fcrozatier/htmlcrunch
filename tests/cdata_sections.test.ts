import { assertEquals } from "@std/assert";
import { element, serializeNode } from "../parser.ts";

Deno.test("cdata sections", () => {
  const markup = `<math>
 <ms><![CDATA[x<y]]></ms>
 <mo>+</mo>
 <mn>3</mn>
 <mo>=</mo>
 <ms><![CDATA[x<y3]]></ms>
</math>`;

  const math = element.parseOrThrow(markup);
  assertEquals(serializeNode(math), markup);
});
