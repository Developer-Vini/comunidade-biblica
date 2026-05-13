import db from '../db/database.js';
import { validateAndSanitize, updateProfileSchema } from '../utils/validation.js';

export const getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = db.prepare(`
      SELECT id, name, bio, created_at
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const postCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(userId).count;
    const likeCount = db.prepare(`
      SELECT COUNT(*) as count FROM likes l
      JOIN posts p ON l.post_id = p.id
      WHERE p.user_id = ?
    `).get(userId).count;

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          post_count: postCount,
          like_count: likeCount,
          created_at: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('[USERS] Get user error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar usuário'
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para editar este perfil'
      });
    }

    const validation = validateAndSanitize(updateProfileSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0].message
      });
    }

    const { name, bio } = validation.data;

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          bio = COALESCE(?, bio),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name || null, bio !== undefined ? bio : null, userId);

    const updatedUser = db.prepare(`
      SELECT id, email, name, bio, created_at
      FROM users WHERE id = ?
    `).get(userId);

    console.log(`[USERS] Profile updated: ${userId}`);

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'Perfil atualizado com sucesso'
    });

  } catch (error) {
    console.error('[USERS] Update user error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar perfil'
    });
  }
};