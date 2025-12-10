FROM oven/bun:1.1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
COPY ui/package.json ui/

# Install dependencies
RUN bun install --frozen-lockfile
RUN cd ui && bun install --frozen-lockfile

# Copy source code
COPY . .

# Build UI
RUN cd ui && bun run build

# Expose ports
EXPOSE 3000

# Default command (can be overridden)
CMD ["bun", "run", "start"]
