import 'mocha';
import * as JWT from 'jsonwebtoken';

import { DB, Redis } from './helpers';
import { User } from '../src/models';
import { ACCESS_TOKEN_SECRET } from '../src/config';

describe('Initialization', () => {
    it('Connection to database', async () => {
        await DB.init;
    });
    it('Create lambda user', async () => {
        DB.lambda.user = await User.create({
            name: 'Lambda',
            googleId: '0123456789',
            picture: '',
            mail: 'lambda@syncodeo.io',
            channelId: null,
            credentials: null,
            uploadsPlaylist: null
        });
        DB.lambda.token = JWT.sign({ uuid: DB.lambda.user.uuid }, ACCESS_TOKEN_SECRET);
    });
    it('Create collaborator user', async () => {
        DB.collaborator.user = await User.create({
            name: 'Collaborator',
            googleId: '12334567890',
            picture: '',
            mail: 'collaborator@syncodeo.io',
            channelId: null,
            credentials: null,
            uploadsPlaylist: null
        });
        DB.collaborator.token = JWT.sign({ uuid: DB.collaborator.user.uuid }, ACCESS_TOKEN_SECRET);
    });
    it('Create youtube linked user', async () => {
        DB.youtubeLinked.user = await User.create({
            name: 'YoutubeLinked',
            googleId: '2345678901',
            picture: '',
            mail: 'youtubeLinked@syncodeo.io',
            channelId: 'UpdFosAKvyQSMPcwxvu',
            credentials: '{}',
            uploadsPlaylist: 'fd57dBqsydqsNIkvxcyo'
        });
        DB.youtubeLinked.token = JWT.sign({ uuid: DB.youtubeLinked.user.uuid }, ACCESS_TOKEN_SECRET);
    });
    it('Create main user', async () => {
        DB.main.user = await User.create({
            name: 'Main',
            googleId: '3456789012',
            picture: '',
            mail: 'main@syncodeo.io',
            channelId: 'cuxSjq4sDCkpdmzVux4',
            credentials: '{}',
            uploadsPlaylist: 'sd5Ec5xAMg9xJqp1cOos'
        });
        DB.main.token = JWT.sign({ uuid: DB.main.user.uuid }, ACCESS_TOKEN_SECRET);
    });
    it('Delete all Redis keys', async () => {
        await new Promise((resolve, reject) => {
            Redis.FLUSHALL((err, reply) => {
                if(err) reject(err);
                resolve(reply);
            });
        });
    });
});