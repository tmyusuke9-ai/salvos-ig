import { Router } from 'express';
import profiles from './profiles.routes.js';
import media from './media.routes.js';

export const router = Router();
router.use('/profiles', profiles);
router.use('/media', media);
