FROM node:22-alpine AS builder
WORKDIR /app
# Chromium ставится системным пакетом в runner-стадии: скачанный puppeteer'ом бинарник
# собран под glibc и в alpine не запускается, а весит ~150 МБ.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn prisma:generate:prod && yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Chromium — рендер PDF-счетов преподавателям. ttf-dejavu/font-noto нужны, чтобы в бланке
# отрисовались и кириллица, и польские диакритики.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-dejavu font-noto
COPY package.json yarn.lock prisma.config.ts ./
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/infrastructure/prisma ./src/infrastructure/prisma
# исходные файлы могут иметь урезанные права (600/700) — нормализуем, чтобы
# пользователь node мог читать миграции при prisma migrate deploy на старте
RUN chmod -R a+rX ./src/infrastructure/prisma
USER node
EXPOSE 5000
CMD ["sh", "-c", "yarn prisma:deploy:prod && node dist/src/main"]