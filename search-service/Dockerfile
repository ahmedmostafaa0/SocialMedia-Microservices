FROM node:20-alpine
WORKDIR /use/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3004
CMD [ "node", "src/server.js" ]
