// paperrocket-book: new file. The default logos come from public/ on disk, not over the network.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readPublicLogo } from "./readPublicLogo";

const WEBAPP = "https://book.example.test";
const root = mkdtempSync(path.join(tmpdir(), "prlogo-"));
const pub = path.join(root, "public");
mkdirSync(pub);
writeFileSync(path.join(pub, "favicon-32x32.png"), "PNG32");
writeFileSync(path.join(pub, "calcom-logo-white-word.svg"), "<svg/>");
writeFileSync(path.join(root, "secret.png"), "NOPE");

describe("readPublicLogo", () => {
  it("serves our own fallback file from public/ with its type", async () => {
    const png = await readPublicLogo(`${WEBAPP}/favicon-32x32.png`, WEBAPP, [pub]);
    expect(png?.buffer.toString()).toBe("PNG32");
    expect(png?.contentType).toBe("image/png");
    const svg = await readPublicLogo(`${WEBAPP}/calcom-logo-white-word.svg`, WEBAPP, [pub]);
    expect(svg?.contentType).toBe("image/svg+xml");
  });

  it("tries the next root when the first has no such file", async () => {
    const res = await readPublicLogo(`${WEBAPP}/favicon-32x32.png`, WEBAPP, [path.join(root, "nope"), pub]);
    expect(res?.buffer.toString()).toBe("PNG32");
  });

  it("refuses other hosts, unknown types, missing files and paths outside public/", async () => {
    expect(await readPublicLogo("https://evil.example/favicon-32x32.png", WEBAPP, [pub])).toBeNull();
    expect(await readPublicLogo(`${WEBAPP}/notes.txt`, WEBAPP, [pub])).toBeNull();
    expect(await readPublicLogo(`${WEBAPP}/missing.png`, WEBAPP, [pub])).toBeNull();
    expect(await readPublicLogo(`${WEBAPP}/..%2Fsecret.png`, WEBAPP, [pub])).toBeNull();
    expect(await readPublicLogo("not a url", WEBAPP, [pub])).toBeNull();
  });
});
