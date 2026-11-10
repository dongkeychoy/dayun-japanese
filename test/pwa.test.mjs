import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = new URL("../public/", import.meta.url);

test("PWA manifest meets Android Chrome installation requirements", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", base), "utf8"));
  assert.ok(manifest.name || manifest.short_name);
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.notEqual(manifest.prefer_related_applications, true);
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((i) => i.sizes === `${size}x${size}` && i.type === "image/png");
    assert.ok(icon, `missing PNG icon: ${size}`);
    const buf = await readFile(new URL(icon.src.replace(/^\//, ""), base));
    assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(buf.readUInt32BE(16), size);
    assert.equal(buf.readUInt32BE(20), size);
  }
});

test("Document links PWA manifest and app icon", async () => {
  const html = await readFile(new URL("index.html", base), "utf8");
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" href="\/icons\/dayun-192\.png"/);
});

test("Cloudflare serves web manifest with JSON MIME type", async () => {
  const headers = await readFile(new URL("_headers", base), "utf8");
  assert.match(headers, /\/manifest\.webmanifest\s+Content-Type:\s+application\/manifest\+json/);
});
