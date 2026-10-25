FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: one of the dependencies (msedge-tts) declares a "preinstall: only-allow pnpm" script that would fail under npm
RUN npm ci --omit=dev --ignore-scripts
COPY server.js ./
COPY public ./public
COPY bridge-kit ./bridge-kit
ENV NODE_ENV=production DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
