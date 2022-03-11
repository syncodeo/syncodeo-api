FROM node:16.14.0

WORKDIR /usr/src/app
COPY . .

RUN npm ci && npm run build

EXPOSE 1337
EXPOSE 1338

CMD [ "npm", "start" ]