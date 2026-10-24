import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDirectory = path.join(projectRoot, "src", "app");

function appFile(name) {
  return path.join(appDirectory, name);
}

function readPngSize(name) {
  const png = readFileSync(appFile(name));
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  assert.deepEqual(png.subarray(0, 8), pngSignature, `${name} must be a valid PNG`);

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

test("file-based favicon metadata uses square brand assets", () => {
  const svg = readFileSync(appFile("icon.svg"), "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);

  assert.deepEqual(viewBox, [0, 0, 64, 64]);
  assert.match(svg, /Original neutral link mark/);

  for (const [name, size] of [
    ["icon1.png", 48],
    ["icon2.png", 96],
    ["icon3.png", 192],
    ["apple-icon.png", 180],
  ]) {
    assert.deepEqual(readPngSize(name), { width: size, height: size });
  }
});

test("favicon.ico contains square 16, 32, and 48 pixel images", () => {
  const ico = readFileSync(appFile("favicon.ico"));

  assert.equal(ico.readUInt16LE(0), 0, "ICO reserved field must be zero");
  assert.equal(ico.readUInt16LE(2), 1, "ICO type must describe icons");

  const imageCount = ico.readUInt16LE(4);
  const sizes = [];

  for (let index = 0; index < imageCount; index += 1) {
    const entryOffset = 6 + index * 16;
    const width = ico[entryOffset] || 256;
    const height = ico[entryOffset + 1] || 256;
    const imageLength = ico.readUInt32LE(entryOffset + 8);
    const imageOffset = ico.readUInt32LE(entryOffset + 12);

    assert.equal(width, height, `ICO image ${index + 1} must be square`);
    assert.ok(imageOffset + imageLength <= ico.length, `ICO image ${index + 1} must be complete`);
    assert.deepEqual(
      ico.subarray(imageOffset, imageOffset + 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      `ICO image ${index + 1} must contain a valid PNG frame`,
    );
    sizes.push(width);
  }

  assert.deepEqual(sizes, [16, 32, 48]);
});

test("root metadata does not override the file-based favicon convention", () => {
  const layout = readFileSync(appFile("layout.tsx"), "utf8");

  assert.doesNotMatch(layout, /\bicons\s*:/);
});
