import { Router } from 'express';
import * as messages from '../controllers/messageController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { startConversationSchema, messageSchema } from '../validators/schemas';

const router = Router();

router.use(requireAuth);

router.get('/', messages.listConversations);
router.get('/unread-count', messages.unreadCount);
router.post('/', validateBody(startConversationSchema), messages.startConversation);
router.get('/:id/messages', messages.listMessages);
router.post('/:id/messages', validateBody(messageSchema), messages.sendMessage);

export default router;
