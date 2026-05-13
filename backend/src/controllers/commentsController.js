import crypto from 'crypto';
import db from '../db/database.js';
import { validateAndSanitize, createCommentSchema } from '../utils/validation.js';

export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post não encontrado'
      });
    }

    const comments = db.prepare(`
      SELECT
        c.id, c.content, c.created_at,
        u.id as user_id, u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    res.json({
      success: true,
      data: { comments }
    });

  } catch (error) {
    console.error('[COMMENTS] Get comments error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar comentários'
    });
  }
};

export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post não encontrado'
      });
    }

    const validation = validateAndSanitize(createCommentSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0].message
      });
    }

    const { content } = validation.data;

    const commentId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO comments (id, post_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `).run(commentId, postId, req.user.id, content);

    const comment = db.prepare(`
      SELECT
        c.id, c.content, c.created_at,
        u.id as user_id, u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    console.log(`[COMMENTS] Comment created: ${commentId}`);

    res.status(201).json({
      success: true,
      data: { comment },
      message: 'Comentário criado com sucesso'
    });

  } catch (error) {
    console.error('[COMMENTS] Create comment error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar comentário'
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentário não encontrado'
      });
    }

    if (comment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para excluir este comentário'
      });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

    console.log(`[COMMENTS] Comment deleted: ${commentId}`);

    res.json({
      success: true,
      message: 'Comentário excluído com sucesso'
    });

  } catch (error) {
    console.error('[COMMENTS] Delete comment error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir comentário'
    });
  }
};