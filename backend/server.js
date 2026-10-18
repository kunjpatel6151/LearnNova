require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');
const { enforceRequestSafety } = require('./src/middleware/requestSecurity');
const prisma = require('./src/config/db');

const app = express();


app.use(helmet());

const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const normalized = origin.trim().replace(/\/$/, '');
      const isAllowedExplicitly = allowedOrigins.includes(normalized) || allowedOrigins.includes('*');
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
      const isVercel = /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/i.test(normalized);

      if (isAllowedExplicitly || isLocalhost || isVercel) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(enforceRequestSafety);




app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});


app.use('/api', routes);


app.use(errorHandler);


const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`Learnova server running on port ${PORT}`);

    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('PostgreSQL connected via Prisma');
    } catch (err) {
      console.error('PostgreSQL connection failed:', err.message);
    }
  });
}

module.exports = app;
