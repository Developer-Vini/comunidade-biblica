import jwt from 'jsonwebtoken';
import db from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-temporary';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('⚠️  ERRO: JWT_SECRET não definido no .env!');
}
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRES_DAYS}d` }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token de acesso necessário'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Token expirado ou inválido'
    });
  }

  const user = db.prepare('SELECT id, email, name, bio FROM users WHERE id = ?').get(decoded.userId);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Usuário não encontrado'
    });
  }

  req.user = user;
  next();
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (decoded) {
    const user = db.prepare('SELECT id, email, name, bio FROM users WHERE id = ?').get(decoded.userId);
    if (user) {
      req.user = user;
    }
  }

  next();
};

export const storeRefreshToken = (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(crypto.randomUUID(), userId, token, expiresAt.toISOString());
};

export const removeRefreshToken = (token) => {
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
};

export const removeAllUserRefreshTokens = (userId) => {
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
};

export const cleanupExpiredTokens = () => {
  db.prepare('DELETE FROM refresh_tokens WHERE expires_at < datetime("now")').run();
};

setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

export { JWT_EXPIRES_IN };