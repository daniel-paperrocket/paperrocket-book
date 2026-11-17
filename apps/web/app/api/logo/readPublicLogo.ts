// paperrocket-book: new file. Serves the default logos from the web app's public/ folder on disk.
import { readFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * Given a fallback URL on our own WEBAPP_URL (for example https://host/favicon-32x32.png), returns
 * the file from public/ on disk, or null when it is not ours, not an image we know, or not found.
 * Only plain file names under public/ are served: no "..", no subfolders outside public/.
 */
export async function readPublicLogo(
  url: string,
  webappUrl: string,
  roots: string[] = [path.join(process.cwd(), "public"), path.join(process.cwd(), "apps", "web", "public")]
): Promise<{ buffer: Buffer; contentType: string } | null> {
  let pathname: string;
  try {
    const parsed = new URL(url);
    const base = new URL(webappUrl);
    if (parsed.origin !== base.origin) return null;
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  const contentType = CONTENT_TYPES[path.extname(pathname).toLowerCase()];
  if (!contentType) return null;
  for (const root of roots) {
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(path.resolve(root) + path.sep)) return null;
    try {
      return { buffer: await readFile(file), contentType };
    } catch {
      // try the next root
    }
  }
  return null;
}
