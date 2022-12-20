# this is an official Node runtime, used as the parent image
FROM node:14.17.1-alpine

# Create app directory
WORKDIR /edge-app

# Add source files to filesystem of container
COPY ./app.js /edge-app
COPY ./package.json /edge-app

# Install app dependencies (all modules listed in package.json)
RUN npm install


#Run application
CMD ["node", "app.js"]