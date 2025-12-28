import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.testing.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.testing.local') });

