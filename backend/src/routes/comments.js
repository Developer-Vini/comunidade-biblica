import { Router } from 'express';
import { getComments, createComment, deleteComment } from '../controllers/commentsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/posts/:postId/comments', getComments);
router.post('/posts/:postId/comments', authenticate, createComment);
router.delete('/comments/:commentId', authenticate, deleteComment);

export default router;