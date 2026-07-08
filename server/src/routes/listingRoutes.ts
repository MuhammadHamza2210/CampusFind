import { Router } from 'express';
import * as listings from '../controllers/listingController';
import * as comments from '../controllers/commentController';
import * as claims from '../controllers/claimController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { uploadSingleImage } from '../middleware/upload';
import { validateBody } from '../middleware/validate';
import { flagSchema } from '../validators/schemas';

const router = Router();

// Order matters: /mine and /mine/matches before /:id and /:id/matches
router.get('/mine', requireAuth, listings.myListings);
router.get('/mine/matches', requireAuth, listings.myMatches);

router.get('/', optionalAuth, listings.listListings);
router.get('/:id', optionalAuth, listings.getListing);
router.get('/:id/matches', optionalAuth, listings.getMatches);

router.post('/', requireAuth, uploadSingleImage, listings.createListing);
router.patch('/:id', requireAuth, uploadSingleImage, listings.updateListing);
router.patch('/:id/status', requireAuth, listings.setStatus);
router.delete('/:id', requireAuth, listings.deleteListing);
router.post('/:id/flag', requireAuth, validateBody(flagSchema), listings.flagListing);

// Comments nested under a listing
router.get('/:id/comments', comments.listComments);
router.post('/:id/comments', requireAuth, comments.addComment);

// Ownership claims on a found item
router.get('/:id/claims', requireAuth, claims.listClaims);
router.post('/:id/claims', requireAuth, claims.createClaim);

export default router;
