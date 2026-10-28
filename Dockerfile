FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node server/package*.json ./server/
RUN npm ci --prefix server --omit=dev
COPY --chown=node:node server ./server
RUN chown -R node:node /app/server && chmod -R u+rX /app/server
ENV NODE_ENV=production
EXPOSE 8788
USER node
CMD ["node", "server/index.mjs"]
