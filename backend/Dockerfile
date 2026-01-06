FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN yarn install

COPY . .

# Generate Prisma client using environment variables (not .env.development.local)
RUN npx prisma generate --schema=src/core/prisma/schema.prisma

RUN yarn build

EXPOSE 5000

# Use environment variables directly, not .env.development.local
CMD ["sh", "-c", "npx prisma migrate deploy --schema=src/core/prisma/schema.prisma && yarn start:prod"]