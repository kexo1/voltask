FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN DATABASE_URL=postgresql://ucm:ucm_local_password@localhost:5432/ucm_tasks npm run db:generate
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
