# Use official Node.js image as base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the project
COPY . .

# Accept build arguments for secrets or tokens
ARG KEY_ID
ARG OAUTH_TOKEN

# Set environment variables for build
ENV KEY_ID=$KEY_ID
ENV OAUTH_TOKEN=$OAUTH_TOKEN
ENV NODE_ENV=production

# Build the Next.js app
RUN npm run build

# Expose the production port
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]

