FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src/ ./src/

# Set environment to production
ENV NODE_ENV=production

# Run the bot
CMD ["npm", "start"]
