#!/bin/sh
set -x

# Replace the statically built BUILT_NEXT_PUBLIC_WEBAPP_URL with run-time NEXT_PUBLIC_WEBAPP_URL
# NOTE: if these values are the same, this will be skipped.
scripts/replace-placeholder.sh "$BUILT_NEXT_PUBLIC_WEBAPP_URL" "$NEXT_PUBLIC_WEBAPP_URL"

# paperrocket-book: runtime branding and brand files (see paperrocket/README.md)
scripts/paperrocket-start.sh

scripts/wait-for-it.sh ${DATABASE_HOST} -- echo "database is up"
# paperrocket-book: the image ships Next's standalone output (see PATCHES.md): the Prisma CLI has its own folder,
# the app store seed was bundled to JavaScript at build time, and the server is started directly.
# HOSTNAME is set here because Docker sets it to the container id, and the standalone server binds to it.
/prisma-cli/node_modules/.bin/prisma migrate deploy --schema /calcom/packages/prisma/schema.prisma
node /calcom/scripts/seed-app-store.js
HOSTNAME=0.0.0.0 PORT=3000 exec node /calcom/apps/web/server.js
