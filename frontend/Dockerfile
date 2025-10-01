FROM node:20-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

# 👇 передаём переменную окружения в build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
