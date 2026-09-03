import type { ThemeFile } from "./adapters/types";

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(value: number): number[] { return [value & 255, (value >>> 8) & 255]; }
function u32(value: number): number[] { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }

/** Deterministic, store-only ZIP: forward-slash keys and no wrapping parent folder. */
export function createThemeZip(files: ThemeFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const entries = [...files].sort((a, b) => a.key.localeCompare(b.key)).map((file) => ({ key: file.key.replaceAll("\\", "/"), name: encoder.encode(file.key.replaceAll("\\", "/")), body: encoder.encode(file.value) }));
  const output: number[] = []; const central: number[] = []; let offset = 0;
  for (const entry of entries) {
    const crc = crc32(entry.body); const local = [0x50, 0x4b, 3, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(entry.body.length), ...u32(entry.body.length), ...u16(entry.name.length), 0, 0, 0, ...entry.name, ...entry.body];
    output.push(...local);
    central.push(0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(entry.body.length), ...u32(entry.body.length), ...u16(entry.name.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(offset), ...entry.name);
    offset += local.length;
  }
  const centralOffset = output.length; output.push(...central); output.push(0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(entries.length), ...u16(entries.length), ...u32(central.length), ...u32(centralOffset), 0, 0);
  return Uint8Array.from(output);
}
