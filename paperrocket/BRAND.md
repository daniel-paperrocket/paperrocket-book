# Brand folder

Each site mounts a folder at `/calcom/brand` in the container. At start, `scripts/paperrocket-start.sh` copies every file in it over the file with the same relative path in the web app's `public/` folder. A file with no match in `public/` is skipped with a warning, so a typo cannot add stray files.

Keep the same file type as the original (an SVG stays an SVG, a PNG stays a PNG), and similar proportions.

| File in the brand folder | Used for |
| --- | --- |
| `calcom-logo-white-word.svg` | `LOGO`: main logo (light wordmark, sits on dark backgrounds) |
| `cal-logo-word-black.svg` | `LOGO_DARK`: logo for light backgrounds |
| `cal-com-icon-white.svg` | `LOGO_ICON`: square icon mark |
| `favicon-16x16.png` | `FAVICON_16` |
| `favicon-32x32.png` | `FAVICON_32` |
| `favicon.ico` | Browser default favicon |
| `apple-touch-icon.png` | `APPLE_TOUCH_ICON` (180 x 180) |
| `mstile-150x150.png` | `MSTILE_ICON` |
| `android-chrome-192x192.png` | `ANDROID_CHROME_ICON_192` |
| `android-chrome-256x256.png` | `ANDROID_CHROME_ICON_256` |
| `safari-pinned-tab.svg` | Safari pinned tab mask icon (single colour) |
| `cal-logo-word-dark.svg` | Wordmark used by the apps pages |
| `emails/logo.png` | Logo at the top of every email (`${WEBAPP_URL}/emails/logo.png`) |

The constants are in `packages/lib/constants.ts`; the files are in `apps/web/public/`. On a self-hosted install the `/api/logo` route falls back to these same files, so replacing them covers the favicons, the web app manifest icons and the logo route.

Names and links (app name, company, support address, website, privacy and terms URLs) are env vars, not files: see `paperrocket/README.md`.

Limits: the files are replaced when the container starts, so a changed logo needs a container restart. Browsers and email clients cache logos, so a change can take a while to show.
