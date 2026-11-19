FROM --platform=$BUILDPLATFORM node:22 AS builder

WORKDIR /calcom

## If we want to read any ENV variable from .env file, we need to first accept and pass it as an argument to the Dockerfile
ARG NEXT_PUBLIC_LICENSE_CONSENT
ARG NEXT_PUBLIC_WEBSITE_TERMS_URL
ARG NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL
ARG CALCOM_TELEMETRY_DISABLED
ARG DATABASE_URL
ARG NEXTAUTH_SECRET=secret
ARG CALENDSO_ENCRYPTION_KEY=secret
ARG MAX_OLD_SPACE_SIZE=6144
ARG NEXT_PUBLIC_API_V2_URL
ARG CSP_POLICY

## We need these variables as required by Next.js build to create rewrites
ARG NEXT_PUBLIC_SINGLE_ORG_SLUG
ARG ORGANIZATIONS_ENABLED

ENV NEXT_PUBLIC_WEBAPP_URL=http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \
  NEXT_PUBLIC_API_V2_URL=$NEXT_PUBLIC_API_V2_URL \
  NEXT_PUBLIC_LICENSE_CONSENT=$NEXT_PUBLIC_LICENSE_CONSENT \
  NEXT_PUBLIC_WEBSITE_TERMS_URL=${NEXT_PUBLIC_WEBSITE_TERMS_URL:-https://PRBOOK_PLACEHOLDER_TERMS_URL} \
  NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL=${NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL:-https://PRBOOK_PLACEHOLDER_PRIVACY_URL} \
  NEXT_PUBLIC_APP_NAME=PRBOOK_PLACEHOLDER_APP_NAME \
  NEXT_PUBLIC_COMPANY_NAME=PRBOOK_PLACEHOLDER_COMPANY_NAME \
  NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS=PRBOOK_PLACEHOLDER_SUPPORT_MAIL_ADDRESS \
  NEXT_PUBLIC_WEBSITE_URL=https://PRBOOK_PLACEHOLDER_WEBSITE_URL \
  NEXT_PUBLIC_DISABLE_SIGNUP=PRBOOK_PLACEHOLDER_DISABLE_SIGNUP \
  CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED \
  DATABASE_URL=$DATABASE_URL \
  DATABASE_DIRECT_URL=$DATABASE_URL \
  NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
  CALENDSO_ENCRYPTION_KEY=${CALENDSO_ENCRYPTION_KEY} \
  NEXT_PUBLIC_SINGLE_ORG_SLUG=$NEXT_PUBLIC_SINGLE_ORG_SLUG \
  ORGANIZATIONS_ENABLED=$ORGANIZATIONS_ENABLED \
  NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE} \
  BUILD_STANDALONE=true \
  CSP_POLICY=$CSP_POLICY

COPY package.json yarn.lock .yarnrc.yml playwright.config.ts turbo.json i18n.json ./
COPY .yarn ./.yarn
COPY apps/web ./apps/web
COPY apps/api/v2 ./apps/api/v2
COPY packages ./packages

RUN yarn config set httpTimeout 1200000
RUN npx turbo prune --scope=@calcom/web --scope=@calcom/trpc --docker
RUN yarn install
# Build and make embed servable from web/public/embed folder
RUN yarn workspace @calcom/trpc run build
RUN yarn --cwd packages/embeds/embed-core workspace @calcom/embed-core run build
RUN yarn --cwd apps/web workspace @calcom/web run copy-app-store-static
RUN yarn --cwd apps/web workspace @calcom/web run build
RUN rm -rf node_modules/.cache .yarn/cache apps/web/.next/cache

FROM node:22 AS builder-two

WORKDIR /calcom
ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000

ENV NODE_ENV=production

COPY package.json .yarnrc.yml turbo.json i18n.json ./
COPY .yarn ./.yarn
COPY --from=builder /calcom/yarn.lock ./yarn.lock
COPY --from=builder /calcom/node_modules ./node_modules
COPY --from=builder /calcom/packages ./packages
COPY --from=builder /calcom/apps/web ./apps/web
COPY --from=builder /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma
COPY scripts scripts
RUN chmod +x scripts/*

# Save value used during this build stage. If NEXT_PUBLIC_WEBAPP_URL and BUILT_NEXT_PUBLIC_WEBAPP_URL differ at
# run-time, then start.sh will find/replace static values again.
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
  BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL

RUN scripts/replace-placeholder.sh http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER ${NEXT_PUBLIC_WEBAPP_URL}

# paperrocket-book: the app store seed runs at every start. Bundle it to plain JavaScript here, so the run stage
# needs neither ts-node nor the workspace sources. Prisma's client and pg stay external: the standalone output has them.
RUN node_modules/.bin/esbuild scripts/seed-app-store.ts --bundle --platform=node --target=node22 --format=cjs   --outfile=scripts/seed-app-store.js --external:@prisma/client --external:pg --external:pg-native --log-level=warning

# paperrocket-book: source maps are never read at run time.
RUN find apps/web/.next -name '*.map' -type f -delete

# paperrocket-book: files the app reads from the monorepo at run time by a path built in code, which Next's file
# tracing can't see: the sign-in email template and the app store descriptions.
RUN mkdir -p /runtime-extra && cd packages   && cp --parents emails/templates/confirm-email.html /runtime-extra/   && find app-store -maxdepth 2 -name DESCRIPTION.md -exec cp --parents {} /runtime-extra/ ;

# paperrocket-book: the Prisma CLI for "migrate deploy" at start, on its own, so the run stage needs no workspace node_modules.
FROM node:22-slim AS prisma-cli
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /prisma-cli
RUN npm install --omit=dev --no-audit --no-fund --no-package-lock prisma@6.16.1 && npm cache clean --force

# paperrocket-book: the run stage is Next's standalone output on a slim base (same Debian release and Node as the
# build stages), instead of the whole monorepo with every workspace's node_modules. See PATCHES.md.
FROM node:22-slim AS runner

WORKDIR /calcom

RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd wget openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=prisma-cli /prisma-cli /prisma-cli
COPY --from=builder-two /calcom/apps/web/.next/standalone ./
COPY --from=builder-two /calcom/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder-two /calcom/apps/web/public ./apps/web/public
COPY --from=builder-two /calcom/packages/prisma/schema.prisma ./packages/prisma/schema.prisma
COPY --from=builder-two /calcom/packages/prisma/migrations ./packages/prisma/migrations
COPY --from=builder-two /calcom/scripts ./scripts
COPY --from=builder-two /runtime-extra ./packages
ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
  BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --retries=5 \
  CMD wget --spider http://localhost:3000 || exit 1

CMD ["/calcom/scripts/start.sh"]
