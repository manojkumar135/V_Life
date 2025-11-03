# Use official Node.js image as base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy rest of the project
COPY . .

RUN npm run build

# Expose Vite dev port
EXPOSE 5173

# Set environment (optional, helpful for debugging)
ENV NODE_ENV=development

# Run Vite dev server (no host restriction, fast refresh support)
CMD ["npm", "start"]
