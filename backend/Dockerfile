FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn prisma:generate:prod && yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock prisma.config.ts ./
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/infrastructure/prisma ./src/infrastructure/prisma
USER node
EXPOSE 5000
CMD ["sh", "-c", "yarn prisma:deploy:prod && node dist/src/main"]