import * as dotenv from 'dotenv';
import * as colors from 'colors';
import { pseudoRandomBytes } from 'crypto';

function logAndGenerateToken(length, prompt) {
    const token = pseudoRandomBytes(length).toString('hex');
    console.log(colors.green(`> Token generated for "${prompt}"`), colors.yellow(token));
    return token;
}

dotenv.load();

// Serveur
export const SERVER_HOST: string = process.env.SERVER_HOST || 'localhost';
export const SERVER_PORT: string = process.env.SERVER_PORT || '1337';

// Base de données
export const DB_HOST: string = process.env.DB_HOST || 'localhost';
export const DB_PORT: number = !isNaN(parseInt(process.env.DB_PORT)) ? parseInt(process.env.DB_PORT) : 3306;
export const DB_DATABASE: string = process.env.DB_DATABASE || 'syncodeo';
export const DB_USER: string = process.env.DB_USER || 'root';
export const DB_PASS: string = process.env.DB_PASS || '';
export const DB_MIGRATION: ('DROP'|'SAFE') = (process.env.DB_MIGRATION as any) || 'SAFE';

// Redis
export const REDIS_HOST: string = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT: number = !isNaN(parseInt(process.env.REDIS_PORT)) ? parseInt(process.env.REDIS_PORT) : 6379;

// Elastic Search
export const ELASTIC_SEARCH_HOST:string = process.env.ELASTIC_SEARCH_HOST || 'localhost';
export const ELASTIC_SEARCH_PORT:number = !isNaN(parseInt(process.env.ELASTIC_SEARCH_PORT)) ? parseInt(process.env.ELASTIC_SEARCH_PORT) : 9200;

// Environnement
export const ENV: ('PROD'|'DEV'|'TEST') = (process.env.ENV as any) || 'PROD';

// Google API
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_CLIENT_REDIRECT_URI: string = process.env.GOOGLE_CLIENT_REDIRECT_URI || '';

// JWT
export const ACCESS_TOKEN_SECRET: string = process.env.ACCESS_TOKEN_SECRET || '';
export const REFRESH_TOKEN_SECRET: string = process.env.REFRESH_TOKEN_SECRET || '';

// Discord
export const DISCORD_WEBHOOK_URL_MESSAGES:string = process.env.DISCORD_WEBHOOK_URL_MESSAGES || '';
export const DISCORD_WEBHOOK_URL_BUG_REPORTS:string = process.env.DISCORD_WEBHOOK_URL_BUG_REPORTS || '';
export const DISCORD_WEBHOOK_URL_IMPROVEMENTS:string = process.env.DISCORD_WEBHOOK_URL_IMPROVEMENTS || '';
export const DISCORD_WEBHOOK_URL_FEATURES:string = process.env.DISCORD_WEBHOOK_URL_FEATURES || '';
export const DISCORD_WEBHOOK_URL_LOGS:string = process.env.DISCORD_WEBHOOK_URL_LOGS || '';
export const DISCORD_WEBHOOK_URL_INTERNAL_ERRORS:string = process.env.DISCORD_WEBHOOK_URL_INTERNAL_ERRORS || '';

// HTTPS
export const HTTPS_ENABLED:boolean = process.env.HTTPS_ENABLED === 'TRUE';
export const HTTPS_KEY:string = process.env.HTTPS_KEY || '';
export const HTTPS_CERT:string = process.env.HTTPS_CERT || '';

// Secret routes
export const SECRET_ROUTE_USERNAME:string = process.env.SECRET_ROUTE_USERNAME || logAndGenerateToken(8, 'secret route username');
export const SECRET_ROUTE_PASSWORD:string = process.env.SECRET_ROUTE_PASSWORD || logAndGenerateToken(8, 'secret route password');

// Socket.IO
export const SOCKET_IO_PORT: string = process.env.SOCKET_IO_PORT || '1338';

// Proxy
export const PROXY: boolean = process.env.PROXY === 'TRUE';

// Others
export const SITE_URL: string = process.env.SITE_URL || 'https://syncodeo.io';

// Tests
export const TESTS_URL: string = process.env.TESTS_URL || '';
export const TESTS_GOOGLE_TOKEN: string = process.env.TESTS_GOOGLE_TOKEN || '';
export const TESTS_GOOGLE_CODE_1: string = process.env.TESTS_GOOGLE_CODE_1 || '';
export const TESTS_GOOGLE_CODE_2: string = process.env.TESTS_GOOGLE_CODE_2 || '';
export const TESTS_VIDEO_ID: string = process.env.TESTS_VIDEO_ID || '';
export const TESTS_CHANNEL_ID: string = process.env.TESTS_CHANNEL_ID || '';
export const TESTS_GOOGLE_ENABLED: boolean = TESTS_GOOGLE_TOKEN !== '';