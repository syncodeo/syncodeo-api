FROM node:10
WORKDIR /usr/src/app
COPY . .
EXPOSE 1337
CMD [ "npm", "start" ]