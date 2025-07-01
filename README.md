# HTMLCrunch

A lightweight HTML parser

- spec compliant
- supports tag omissions

This is the HTML parser used by the Radish framework. It's built on top of the
[Monarch](https://github.com/fcrozatier/monarch) parsing library

[documentation](https://jsr.io/@radish/htmlcrunch)

Example:

```ts
import { fragments, serializeFragments } from "@fcrozatier/htmlcrunch";

const html = `<div>html string...</div>`;
const parsed = fragments.parseOrThrow(html);
const serialized = serializeFragments(parsed);

html === serialized; // true
```
