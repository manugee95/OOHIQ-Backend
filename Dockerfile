# 1. Use the official lightweight Node.js image
FROM node:18-slim

# 2. Install required system dependencies for PM2 (procps) and cleanup
RUN apt-get update && \
    apt-get install -y \
      procps \
      openssl \
      libssl1.1 \
      ca-certificates && \
    npm install -g pm2 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Set working directory
WORKDIR /app

# 4. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 5. Copy the rest of your application code
COPY . .

# 6. Run Prisma generate
RUN npx prisma generate

# 7. Expose the port your server listens on (adjust if different)
EXPOSE 8000

# 8. Start both processes using PM2
CMD ["pm2-runtime", "ecosystem.config.js"]
