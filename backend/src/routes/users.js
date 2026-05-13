import { Router } from 'express';
import { getUser, updateUser } from '../controllers/usersController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/:userId', getUser);
router.put('/:userId', authenticate, updateUser);

export default router;