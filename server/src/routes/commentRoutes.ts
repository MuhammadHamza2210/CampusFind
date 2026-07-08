import { Router } from 'express';
import * as comments from '../controllers/commentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.delete('/:id', requireAuth, comments.deleteComment);

export default router;
