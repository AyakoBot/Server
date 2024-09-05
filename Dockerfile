FROM node:22
WORKDIR /app
RUN corepack enable
COPY . .
WORKDIR /app/apps/Website
RUN pnpm install
RUN pnpm build
WORKDIR /app/packages/Server
RUN pnpm install
RUN pnpx prisma generate
RUN pnpm build
COPY ./packages/Bot/.env /app/packages/Bot/.env.template