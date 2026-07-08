import { Router } from 'express';
import * as auth from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { optionalAuth } from '../middleware/auth';
import {
  signupSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from '../validators/schemas';

const router = Router();

router.post('/signup', validateBody(signupSchema), auth.signup);
router.post('/verify', validateBody(verifyOtpSchema), auth.verifyOtp);
router.post('/resend', validateBody(resendOtpSchema), auth.resendOtp);
router.post('/login', validateBody(loginSchema), auth.login);
router.post('/logout', auth.logout);
router.get('/me', optionalAuth, auth.me);

export default router;
