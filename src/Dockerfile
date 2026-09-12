# Build context must be the project root (not src/), since this app
# imports ../dbConfig.js relative to src/app.js.
#
#   docker build -f src/Dockerfile -t switch-backend .
#
FROM node:20-alpine

WORKDIR /app

# Install deps first so this layer is cached unless package.json changes
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app (dbConfig.js lives at repo root, src/ has the app)
COPY . .

EXPOSE 3000

CMD ["node", "src/app.js"]
