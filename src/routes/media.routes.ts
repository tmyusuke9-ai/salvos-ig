import { Router } from 'express';
import * as controller from '../controllers/media.controller.js';

const r = Router();

r.get('/', controller.listMedia);
r.get('/:id', controller.getMediaById);
r.patch('/:id', controller.updateMediaMeta);
r.post('/:id/transcribe', controller.transcribeMedia);

export default r;
