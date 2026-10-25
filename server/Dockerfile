FROM node:20-alpine AS base
WORKDIR /app

# All "today"/day-of-week logic (schedule, streaks, progress) runs in the
# server's local time. Alpine ships without tz data, so a bare container ran
# in UTC and the day boundary fell at 05:00 in Tashkent — a quiz at 02:00
# counted as yesterday. Override TZ at deploy time for another region.
RUN apk add --no-cache tzdata
ENV TZ=Asia/Tashkent

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed-if-empty && node dist/server.js"]
