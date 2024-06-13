FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

ENV BUCKET=image-profil

ENV DB_HOST=34.34.220.217

ENV DB_USER=root

ENV DB_PASSWORD=wisyuk

ENV DB_NAME=wisyuk

ENV PROJECT_ID=wisyuk-project

ENV KEY=./service-account-key.json

RUN npm install

COPY . .

ENV PORT 6500

EXPOSE 6500

CMD [ "npm", "run", "start" ]
