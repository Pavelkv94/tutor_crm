import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.testing') });

process.env.NODE_ENV ??= 'testing';
process.env.LOG_LEVEL ??= 'error';
