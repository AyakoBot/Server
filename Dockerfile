FROM node:22

WORKDIR /app
RUN corepack enable
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
ENV PKG_CONFIG_PATH=/usr/lib/x86_64-linux-gnu/pkgconfig
COPY . .
RUN pnpm install

WORKDIR /app/apps/Website
RUN pnpm link ../../packages/Server
RUN pnpm build

WORKDIR /app/packages/Server
RUN pnpm link ../../apps/Website
RUN pnpm build
COPY ./packages/Bot/.env /app/packages/Bot/.env.template