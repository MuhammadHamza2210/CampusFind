import { Router } from 'express';
import * as admin from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/flagged', admin.listFlagged);
router.post('/listings/:id/remove', admin.removeListing);
router.post('/listings/:id/dismiss', admin.dismissFlag);
router.delete('/listings/:id', admin.hardDelete);

export default router;
