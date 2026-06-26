FROM node:20-alpine

RUN npm install -g @mockoon/cli@latest

WORKDIR /app