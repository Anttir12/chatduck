FROM node:18.6.0

RUN mkdir /app
WORKDIR /app
ENV TZ=UTC
RUN apt-get update && apt-get install -y ffmpeg

ADD . /app/

RUN npm install -g typescript
RUN npm install
RUN npm run build