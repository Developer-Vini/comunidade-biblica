const API_URL = '/api';

const admin = {
  async login(password) {
    const res = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('adminToken', data.data.token);
    }
    return data;
  },

  async getUsers() {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  },

  async deleteUser(id) {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  },

  async getPosts() {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_URL}/admin/posts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  },

  async deletePost(id) {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_URL}/admin/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  },

  logout() {
    localStorage.removeItem('adminToken');
    window.location.reload();
  },

  isLoggedIn() {
    return !!localStorage.getItem('adminToken');
  }
};

function showMessage(message, isError = false) {
  const el = document.getElementById('message');
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