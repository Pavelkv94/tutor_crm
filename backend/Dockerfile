FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN yarn install

COPY . .

RUN yarn prisma:generate

RUN yarn build

EXPOSE 5000

CMD ["sh", "-c", "yarn prisma:deploy && yarn start:prod"]