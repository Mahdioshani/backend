FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && cp -r node_modules prod_modules
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build && cp -r /build/dist/ app

FROM node:20-alpine

RUN mkdir -p /db && chmod 777 /db

USER node
WORKDIR /app
COPY --from=builder /build/app ./
COPY --from=builder /build/prod_modules ./node_modules

CMD ["node", "main.js", "--enable-source-maps"]
