import { Router } from 'express';
import * as notifications from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, notifications.listNotifications);
router.get('/unread-count', requireAuth, notifications.unreadCount);
router.post('/read-all', requireAuth, notifications.markAllRead);
router.patch('/:id/read', requireAuth, notifications.markRead);

export default router;
