FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production || true
COPY . .
EXPOSE 8080
ENV PORT=8080
ENV HOST=0.0.0.0
CMD ["node", "server.js"]
