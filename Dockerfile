FROM node:10.15.3
WORKDIR /usr/src/app
COPY . .
EXPOSE 1337
CMD [ "npm", "start" ]