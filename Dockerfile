FROM node:10

WORKDIR /usr/src/app
COPY . .

EXPOSE 1337
EXPOSE 1338

CMD [ "npm", "start" ]