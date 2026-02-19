# TaaS Truth Node - Secure Compilation Build
# Usage: docker build -f taas-nodes/truth-node/Dockerfile . -t friehub/truth-node:latest

# --- STAGE 1: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.1.1

# Copy workspace configs
COPY pnpm-workspace.yaml package.json ./

# Copy PRIVATE Core Logic (The Brain)
COPY taas-core ./taas-core

# Copy Node Logic (The Requestor)
COPY taas-nodes ./taas-nodes
COPY taas-sdk ./taas-sdk

# Install dependencies (including private workspaces)
RUN pnpm install --no-frozen-lockfile

# Build strictly in dependency order to ensure all modules are available
# 1. Core Logic & SDK
RUN pnpm --filter @friehub/sovereign-logic run build
RUN pnpm --filter @friehub/taas-sdk run build

# 2. Execution Engine & Models
RUN pnpm --filter @friehub/execution-engine run build
RUN pnpm --filter @friehub/recipes run build

# 3. Finally, the Node itself
RUN pnpm --filter @friehub/truth-node run build

# --- STAGE 2: Runner ---
# This is the image the public user gets.
# It contains NO source code, only compiled artifacts.
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled artifacts from builder
# We only need the dist folders and package.json files
COPY --from=builder /app/taas-core/recipes/dist ./node_modules/@friehub/recipes/dist
COPY --from=builder /app/taas-core/recipes/package.json ./node_modules/@friehub/recipes/package.json

COPY --from=builder /app/taas-core/execution-engine/dist ./node_modules/@friehub/execution-engine/dist
COPY --from=builder /app/taas-core/execution-engine/package.json ./node_modules/@friehub/execution-engine/package.json

COPY --from=builder /app/taas-core/sovereign-logic/dist ./node_modules/@friehub/sovereign-logic/dist
COPY --from=builder /app/taas-core/sovereign-logic/package.json ./node_modules/@friehub/sovereign-logic/package.json

COPY --from=builder /app/taas-nodes/truth-node/dist ./dist
COPY --from=builder /app/taas-nodes/truth-node/package.json ./package.json

# Install ONLY production dependencies for the node
# We use 'npm install --production' inside the final image to get external deps (axios, viem, etc.)
# but skipping the workspace devDependencies
RUN npm install --production --ignore-scripts

EXPOSE 3000

CMD ["node", "dist/index.js"]
