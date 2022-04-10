FROM node:lts-slim AS stage1
COPY ["package.json", "package-lock.json", "server.js", "/app/"]
WORKDIR /app
RUN npm install --only=production

FROM node:lts-slim
COPY --from=stage1 /app /app
WORKDIR /app
EXPOSE 8080
CMD ["npm", "start"]
