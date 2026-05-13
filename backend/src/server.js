import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import commentsRoutes from './routes/comments.js';
import usersRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';

import './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || ['*'];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Muitas requisições. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Muitas tentativas. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);
app.use('/api', globalLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', commentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(join(__dirname, '..', '..')));

app.get('/', (req, res) => {
  const indexPath = join(__dirname, '..', '..', 'index.html');
  res.sendFile(indexPath);
});

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, '..', '..', 'admin', 'index.html'));
});

app.use('/admin', express.static(join(__dirname, '..', '..', 'admin')));

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint não encontrado' });
});

app.use((err, req, res, next) => {
  console.error('[SERVER] Error:', err.message);
  const message = process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message;
  res.status(500).json({ success: false, error: message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🕯️  Comunidade Bíblica                                      ║
║                                                               ║
║   Servidor iniciado: http://localhost:${PORT}                   ║
║   Mode: ${process.env.NODE_ENV || 'development'}                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;