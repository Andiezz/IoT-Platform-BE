FROM node:18-alpine as build
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY --chown=node:node . .
RUN yarn build

FROM node:18-alpine
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --only=production
COPY --from=build --chown=node:node /app/dist ./dist

CMD ["node", "dist/main.js"]