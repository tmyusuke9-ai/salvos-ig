import { app } from './app.js';
import { env } from './env.js';
import { logger } from './utils/logger.js';

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API up');
});
