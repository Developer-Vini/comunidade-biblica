import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/database.js';
import { validateAndSanitize, registerSchema, loginSchema } from '../utils/validation.js';
import {
  generateTokens,
  verifyRefreshToken,
  storeRefreshToken,
  removeRefreshToken,
  removeAllUserRefreshTokens
} from '../middleware/auth.js';

const BCRYPT_ROUNDS = 12;

export const register = async (req, res) => {
  try {
    const validation = validateAndSanitize(registerSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0].message
      });
    }

    const { email, password, name } = validation.data;

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email já está em uso'
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const userId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash, name);

    const { accessToken, refreshToken } = generateTokens(userId);

    storeRefreshToken(userId, refreshToken);

    console.log(`[AUTH] New user registered: ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          email: email.toLowerCase(),
          name
        },
        accessToken,
        refreshToken
      },
      message: 'Conta criada com sucesso'
    });

  } catch (error) {
    console.error('[AUTH] Register error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar conta'
    });
  }
};

export const login = async (req, res) => {
  try {
    const validation = validateAndSanitize(loginSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0].message
      });
    }

    const { email, password } = validation.data;

    const user = db.prepare(`
      SELECT id, email, password_hash, name, bio
      FROM users WHERE email = ?
    `).get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log(`[AUTH] Failed login attempt for: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    storeRefreshToken(user.id, refreshToken);

    console.log(`[AUTH] User logged in: ${user.id}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio
        },
        accessToken,
        refreshToken
      },
      message: 'Login realizado com sucesso'
    });

  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer login'
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token é necessário'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token inválido ou expirado'
      });
    }

    const storedToken = db.prepare(`
      SELECT id, user_id FROM refresh_tokens
      WHERE token = ? AND user_id = ?
    `).get(refreshToken, decoded.userId);

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: 'Token não encontrado'
      });
    }

    const user = db.prepare(`
      SELECT id, email, name, bio FROM users WHERE id = ?
    `).get(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const tokens = generateTokens(user.id);

    removeRefreshToken(refreshToken);
    storeRefreshToken(user.id, tokens.refreshToken);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      message: 'Tokens renovados'
    });

  } catch (error) {
    console.error('[AUTH] Refresh error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao renovar tokens'
    });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      removeRefreshToken(refreshToken);
    }

    console.log(`[AUTH] User logged out: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('[AUTH] Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer logout'
    });
  }
};

export const me = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
};