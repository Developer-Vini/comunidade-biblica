import crypto from 'crypto';
import db from '../db/database.js';
import { validateAndSanitize, createPostSchema, updatePostSchema } from '../utils/validation.js';

export const getPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT
        p.id, p.verse, p.reference, p.reflection, p.created_at,
        u.id as user_id, u.name as user_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;

    const postsWithMeta = posts.map(post => {
      const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(post.id).count;

      let isLiked = false;
      if (req.user) {
        const like = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
        isLiked = !!like;
      }

      return {
        ...post,
        like_count: likeCount,
        is_liked: isLiked,
        created_at: post.created_at
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsWithMeta,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('[POSTS] Get posts error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar posts'
    });
  }
};

export const getPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = db.prepare(`
      SELECT
        p.id, p.verse, p.reference, p.reflection, p.created_at,
        u.id as user_id, u.name as user_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post não encontrado'
      });
    }

    const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(id).count;
    const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(id).count;

    let isLiked = false;
    if (req.user) {
      const like = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(id, req.user.id);
      isLiked = !!like;
    }

    res.json({
      success: true,
      data: {
        post: {
          ...post,
          like_count: likeCount,
          comment_count: commentCount,
          is_liked: isLiked,
          created_at: post.created_at
        }
      }
    });

  } catch (error) {
    console.error('[POSTS] Get post error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar post'
    });
  }
};

export const createPost = async (req, res) => {
  try {
    const validation = validateAndSanitize(createPostSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0].message
      });
    }

    const { verse, reference, reflection } = validation.data;

    const postId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO posts (id, user_id, verse, reference, reflection)
      VALUES (?, ?, ?, ?, ?)
    `).run(postId, req.user.id, verse, reference || '', reflection);

    console.log(`[POSTS] Post created: ${postId} by user ${req.user.id}`);

    const post = db.prepare(`
      SELECT id, verse, reference, reflection, created_at
      FROM posts WHERE id = ?
    `).get(postId);

    res.status(201).json({
      success: true,
      data: { post },
      message: 'Post criado com sucesso'
    });

  } catch (error) {
    console.error('[POSTS] Create post error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar post'
    });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = validateAndSanitize(updatePostSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0].message
      });
    }

    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post não encontrado'
      });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para editar este post'
      });
    }

    const { verse, reference, reflection } = validation.data;

    db.prepare(`
      UPDATE posts
      SET verse = COALESCE(?, verse),
          reference = COALESCE(?, reference),
          reflection = COALESCE(?, reflection),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(verse || null, reference !== undefined ? reference : null, reflection || null, id);

    const updatedPost = db.prepare(`
      SELECT id, verse, reference, reflection, created_at, updated_at
      FROM posts WHERE id = ?
    `).get(id);

    console.log(`[POSTS] Post updated: ${id}`);

    res.json({
      success: true,
      data: { post: updatedPost },
      message: 'Post atualizado com sucesso'
    });

  } catch (error) {
    console.error('[POSTS] Update post error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar post'
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post não encontrado'
      });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para excluir este post'
      });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(id);

    console.log(`[POSTS] Post deleted: ${id}`);

    res.json({
      success: true,
      message: 'Post excluído com sucesso'
    });

  } catch (error) {
    console.error('[POSTS] Delete post error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir post'
    });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post não encontrado'
      });
    }

    const existingLike = db.prepare(`
      SELECT id FROM likes WHERE post_id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (existingLike) {
      db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(id, req.user.id);

      const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(id).count;

      return res.json({
        success: true,
        data: { liked: false, like_count: likeCount },
        message: 'Post descurtido'
      });
    } else {
      db.prepare(`
        INSERT INTO likes (id, post_id, user_id)
        VALUES (?, ?, ?)
      `).run(crypto.randomUUID(), id, req.user.id);

      const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(id).count;

      return res.json({
        success: true,
        data: { liked: true, like_count: likeCount },
        message: 'Post curtido'
      });
    }

  } catch (error) {
    console.error('[POSTS] Toggle like error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao curtir post'
    });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT
        p.id, p.verse, p.reference, p.reflection, p.created_at,
        u.id as user_id, u.name as user_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(userId).count;

    const postsWithMeta = posts.map(post => {
      const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(post.id).count;

      let isLiked = false;
      if (req.user) {
        const like = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
        isLiked = !!like;
      }

      return {
        ...post,
        like_count: likeCount,
        is_liked: isLiked
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsWithMeta,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('[POSTS] Get user posts error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar posts do usuário'
    });
  }
};