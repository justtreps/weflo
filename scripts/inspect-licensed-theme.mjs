#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Inspect ZIP central-directory filenames only. No theme Liquid/CSS is retained.
const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/inspect-licensed-theme.mjs path/to/licensed-theme.zip");
const bytes = await readFile(resolve(file));
const names = [];
for (let i = 0; i + 46 <= bytes.length; i += 1) {
  if (bytes.readUInt32LE(i) !== 0x02014b50) continue;
  const nameLength = bytes.readUInt16LE(i + 28); const extraLength = bytes.readUInt16LE(i + 30); const commentLength = bytes.readUInt16LE(i + 32);
  if (i + 46 + nameLength > bytes.length) break;
  names.push(bytes.subarray(i + 46, i + 46 + nameLength).toString("utf8"));
  i += 46 + nameLength + extraLength + commentLength - 1;
}
const directories = [...new Set(names.map((name) => name.split("/")[0]).filter(Boolean))].sort();
console.log(JSON.stringify({ archive: resolve(file), fileCount: names.length, directories, hasThemeLayout: names.some((name) => /(^|\/)layout\/theme\.liquid$/i.test(name)), hasAppBlocks: names.some((name) => /blocks\//i.test(name)), note: "Only archive structure was inspected; no third-party source was copied." }, null, 2));
