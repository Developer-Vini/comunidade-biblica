const API_URL = '/api';

const auth = {
  async register(email, password, name) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    return data;
  },

  async refresh() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    return data;
  },

  logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('accessToken');
  },

  isLoggedIn() {
    return !!this.getToken();
  }
};
const posts = {
  async getAll(page = 1, limit = 10) {
    const res = await fetch(`${API_URL}/posts?page=${page}&limit=${limit}`);
    return await res.json();
  },

  async getById(id) {
    const res = await fetch(`${API_URL}/posts/${id}`);
    return await res.json();
  },

  async create(verse, reference, reflection) {
    const res = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
      },
      body: JSON.stringify({ verse, reference, reflection })
    });
    return await res.json();
  },

  async delete(id) {
    const res = await fetch(`${API_URL}/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return await res.json();
  },

  async toggleLike(id) {
    const res = await fetch(`${API_URL}/posts/${id}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return await res.json();
  },

  async getUserPosts(userId, page = 1, limit = 10) {
    const res = await fetch(`${API_URL}/posts/user/${userId}?page=${page}&limit=${limit}`);
    return await res.json();
  }
};

const comments = {
  async getByPost(postId) {
    const res = await fetch(`${API_URL}/posts/${postId}/comments`);
    return await res.json();
  },

  async create(postId, content) {
    const res = await fetch(`${API_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
      },
      body: JSON.stringify({ content })
    });
    return await res.json();
  },

  async delete(id) {
    const res = await fetch(`${API_URL}/comments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return await res.json();
  }
};

const users = {
  async getById(id) {
    const res = await fetch(`${API_URL}/users/${id}`);
    return await res.json();
  },

  async update(id, name, bio) {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
      },
      body: JSON.stringify({ name, bio })
    });
    return await res.json();
  }
};

function showMessage(elementId, message, isError = false) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.color = isError ? '#e53e3e' : '#38a169';
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} horas`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} dias`;
  return date.toLocaleDateString('pt-BR');
}