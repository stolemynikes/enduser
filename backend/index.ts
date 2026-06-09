import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import cron from 'node-cron';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import jwt from 'jsonwebtoken';
import { typeDefs } from './schema.ts';
import { submissionResolvers } from './resolvers/submission.ts';
import { authResolvers } from './resolvers/auth.ts';
import { extractIdDocument } from './services/idExtraction.ts';
import { prisma } from './lib/prisma.ts';

const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

const ALLOWED_ORIGIN = process.env.FRONTEND_URL ?? (IS_PROD ? null : '*');

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype));
  },
});

const resolvers = {
  Query: { ...submissionResolvers.Query },
  Mutation: {
    ...submissionResolvers.Mutation,
    ...authResolvers.Mutation,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: !IS_PROD,
});
await server.start();

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false, // allow Vite in dev
  contentSecurityPolicy: IS_PROD ? undefined : false,
}));

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// 120 requests per minute per IP across all API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for login: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Extract ID document — image processed in memory, never saved to disk
app.post('/extract-id', memoryUpload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  try {
    const result = await extractIdDocument(req.file.buffer, req.file.mimetype);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Extraction failed' });
  }
});

// Login-specific rate limiter applied before GraphQL based on operation name
app.use('/graphql', (req, res, next) => {
  const body = req.body as { query?: string };
  if (typeof body?.query === 'string' && body.query.includes('adminLogin')) {
    return loginLimiter(req, res, next);
  }
  return next();
});

// GraphQL endpoint
app.use(
  '/graphql',
  apiLimiter,
  expressMiddleware(server, {
    context: async ({ req }) => {
      const auth = req.headers.authorization ?? '';
      if (auth.startsWith('Bearer ')) {
        try {
          const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { adminId: string };
          return { admin: true, adminId: payload.adminId };
        } catch {
          return {};
        }
      }
      return {};
    },
  })
);

// Delete submissions older than 18 months — runs daily at 02:00
cron.schedule('0 2 * * *', async () => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 18);
  const { count } = await prisma.submission.deleteMany({
    where: { idDataCollectedAt: { not: null, lt: cutoff } },
  });
  if (count > 0) console.log(`Retention: deleted ${count} submission(s) older than 18 months`);
});

app.listen(3000, () => {
  console.log('Backend running at http://localhost:3000/graphql');
});
