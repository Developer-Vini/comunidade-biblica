import { Router } from 'express';
import { adminLogin, requireAdmin, getUsers, deleteUser, getPosts, deletePost } from '../controllers/adminController.js';

const router = Router();

router.post('/login', adminLogin);
router.get('/users', requireAdmin, getUsers);
router.delete('/users/:id', requireAdmin, deleteUser);
router.get('/posts', requireAdmin, getPosts);
router.delete('/posts/:id', requireAdmin, deletePost);

export default router;