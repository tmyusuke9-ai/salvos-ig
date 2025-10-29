import { Router } from 'express';
import * as controller from '../controllers/profiles.controller.js';

const r = Router();

r.post('/', controller.createProfile);
r.get('/', controller.listProfiles);
r.post('/:id/refresh', controller.refreshProfileMedia);
r.get('/:id', controller.getProfileById);
r.delete('/:id', controller.deleteProfile);

export default r;
