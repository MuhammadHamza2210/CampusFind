import { Router } from 'express';
import * as claims from '../controllers/claimController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Order matters: /mine before /:id
router.get('/mine', requireAuth, claims.myClaims);
router.patch('/:id', requireAuth, claims.decideClaim);

export default router;
