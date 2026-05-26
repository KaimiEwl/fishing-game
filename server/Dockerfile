FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV HOOKLOOT_API_PORT=8787
ENV HOOKLOOT_DATA_DIR=/data

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY shared ./shared

EXPOSE 8787
CMD ["node", "server/index.mjs"]
