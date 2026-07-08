import { Router } from 'express';
import * as users from '../controllers/userController';
import { requireAuth } from '../middleware/auth';
import { uploadSingleImage } from '../middleware/upload';

const router = Router();

router.patch('/me', requireAuth, uploadSingleImage, users.updateMe);
router.get('/me/stats', requireAuth, users.myStats);

export default router;
