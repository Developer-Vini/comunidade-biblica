import db from '../db/database.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let adminToken = null;

export const adminLogin = (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    adminToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    res.json({ success: true, data: { token: adminToken } });
  } else {
    res.status(401).json({ success: false, error: 'Senha incorreta' });
  }
};

export const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== adminToken) {
    return res.status(401).json({ success: false, error: 'Não autorizado' });
  }
  next();
};

export const getUsers = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, name, bio, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    res.json({ success: true, data: { users } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar usuários' });
  }
};

export const deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true, message: 'Usuário excluído' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao excluir usuário' });
  }
};

export const getPosts = (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT p.id, p.verse, p.reference, p.reflection, p.created_at,
             u.id as user_id, u.name as user_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();

    const postsWithLikes = posts.map(post => {
      const likes = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(post.id);
      return { ...post, like_count: likes?.count || 0 };
    });

    res.json({ success: true, data: { posts: postsWithLikes } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar posts' });
  }
};

export const deletePost = (req, res) => {
  try {
    const { id } = req.params;
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post não encontrado' });
    }
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    res.json({ success: true, message: 'Post excluído' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao excluir post' });
  }
};