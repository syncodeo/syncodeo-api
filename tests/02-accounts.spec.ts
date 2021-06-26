import 'mocha';
import * as JWT from 'jsonwebtoken';

import { testError, Errors, testSuccess, validateBody, Joi, Constants, Data, DB, testMissingAuth } from './helpers';
import { TESTS_GOOGLE_TOKEN, REFRESH_TOKEN_SECRET, TESTS_GOOGLE_CODE_1, TESTS_GOOGLE_CODE_2, TESTS_CHANNEL_ID, TESTS_GOOGLE_ENABLED } from '../src/config';
import Routes from './routes';
import { User } from '../src/models';

const uuidv4 = require('uuid/v4');

describe('Login when not linked', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip(); });
    it('400 - Wrong token', async () => {
        let data = { payload: { token: 'wrong', device: 'test' } };
        await testError(Routes.Account.Login(), Errors.InvalidCredentials, data);
    });
    it('400 - Invalid device (empty)', async () => {
        let data = { payload: { token: 'wrong', device: '' } };
        await testError(Routes.Account.Login(), Errors.InvalidRequestPayload, data);
    });
    it('400 - Invalid device (> 50 chars)', async () => {
        let data = { payload: { token: 'wrong', device: '012345678901234567890123456789012345678901234567890' } };
        await testError(Routes.Account.Login(), Errors.InvalidRequestPayload, data);
    });
    it('200 - OK', async () => {
        let data = { payload: { token: TESTS_GOOGLE_TOKEN, device: 'test' } };
        let res = await testSuccess(Routes.Account.Login(), 200, data);
        validateBody(res.body, {
            accessToken: Joi.string(),
            refreshToken: Joi.string(),
            accessTokenExpiresIn: Joi.number().integer().equal(Constants.Token.accessTokenExpiration),
            linked: Joi.boolean().equal(false),
            uuid: Joi.string().uuid()
        });
        Data.USER_ACCESS_TOKEN = res.body.accessToken;
        Data.USER_REFRESH_TOKEN = res.body.refreshToken;
        Data.USER_UUID = res.body.uuid;
    });
    after(async () => {
        Data.USER_INSTANCE = await User.getByUuid(Data.USER_UUID);
    });
});

describe('Me when youtube not linked', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip(); });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Account.Me()); 
    });
    it('200 - Me data but not linked', async () => {
        let res = await testSuccess(Routes.Account.Me(), 200 , { headers: { authorization: Data.USER_ACCESS_TOKEN }});
        validateBody(res.body, {
            uuid: Joi.string().uuid().equal(Data.USER_UUID),
            linked: Joi.boolean().equal(false)
        });
    });
});

describe('Link Youtube account', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip(); });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Account.LinkYoutubeAccount()); 
    });
    it('400 - Wrong Code', async () => {
        let data = { payload: { code: 'abcde' }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testError(Routes.Account.LinkYoutubeAccount(), Errors.InvalidCredentials, data);
    });
    it('400 - Not owner', async () => {
        // Pre
        let user = await User.getByUuid(Data.USER_UUID);
        let googleId = user.googleId;
        await user.update({ googleId: '0123456' });
        // Test
        let data = { payload: { code: TESTS_GOOGLE_CODE_1 }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testError(Routes.Account.LinkYoutubeAccount(), Errors.NotOwner, data);
        // Post
        await user.update({ googleId });
    });
    it('200 - Youtube account linked', async () => {
        let data = { payload: { code: TESTS_GOOGLE_CODE_2 }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        let res = await testSuccess(Routes.Account.LinkYoutubeAccount(), 200, data);
        validateBody(res.body, {
            channelId: Joi.string().equal(TESTS_CHANNEL_ID)
        })
    });
    it('409 - Youtube account already linked', async () => {
        let data = { payload: { code: TESTS_GOOGLE_CODE_2 }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testError(Routes.Account.LinkYoutubeAccount(), Errors.YoutubeAccountAlreadyLinked, data);
    });
});

describe('Me when Youtube linked', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip(); });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Account.Me()); 
    });
    it('200 - Me data but not linked', async () => {
        let res = await testSuccess(Routes.Account.Me(), 200 , { headers: { authorization: Data.USER_ACCESS_TOKEN }});
        validateBody(res.body, {
            uuid: Joi.string().uuid().equal(Data.USER_UUID),
            linked: Joi.boolean().equal(true)
        });
    });
});

describe('Refresh tokens', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip(); });
    it('400 - Invalid payload (wrong key)', async () => {
        await testError(Routes.Account.Refresh(), Errors.InvalidTokenPayload, { payload: { refreshToken: JWT.sign({ uuid: uuidv4(), device: 'test' }, 'wrongkey'), device: 'test' } });
    });
    it('400 - Invalid payload (wrong token content)', async () => {
        await testError(Routes.Account.Refresh(), Errors.InvalidTokenPayload, { payload: { refreshToken: JWT.sign({ id: 4 }, REFRESH_TOKEN_SECRET), device: 'test' } });
    });
    it('400 - Wrong device', async () => {
        await testError(Routes.Account.Refresh(), Errors.InvalidTokenDevice, { payload: { refreshToken: JWT.sign({ uuid: uuidv4(), device: 'unknown' }, REFRESH_TOKEN_SECRET), device: 'test' } });
    });
    it('400 - Unknown user', async () => {
        await testError(Routes.Account.Refresh(), Errors.InvalidTokenUser, { payload: { refreshToken: JWT.sign({ uuid: uuidv4(), device: 'test' }, REFRESH_TOKEN_SECRET), device: 'test' } });
    });
    it('400 - Wrong device', async () => {
        await testError(Routes.Account.Refresh(), Errors.InvalidTokenInstance, { payload: { refreshToken: JWT.sign({ uuid: Data.USER_UUID, device: 'test' }, REFRESH_TOKEN_SECRET), device: 'test' } });
    });
    it('200 - OK', async () => {
        let res = await testSuccess(Routes.Account.Refresh(), 200, { payload: { refreshToken: Data.USER_REFRESH_TOKEN, device: 'test' } });
        validateBody(res.body, {
            refreshToken: Joi.string(),
            accessToken: Joi.string(),
            accessTokenExpiresIn: Joi.number().equal(Constants.Token.accessTokenExpiration)
        });
        Data.USER_ACCESS_TOKEN = res.body.accessToken;
        Data.USER_REFRESH_TOKEN = res.body.refreshToken;
    });
});

describe('Login when linked', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip(); });
    it('200 - OK', async () => {
        let data = { payload: { token: TESTS_GOOGLE_TOKEN, device: 'test' } };
        let res = await testSuccess(Routes.Account.Login(), 200, data);
        validateBody(res.body, {
            accessToken: Joi.string(),
            refreshToken: Joi.string(),
            accessTokenExpiresIn: Joi.number().integer().equal(Constants.Token.accessTokenExpiration),
            linked: Joi.boolean().equal(true),
            uuid: Joi.string().uuid()
        });
        Data.USER_ACCESS_TOKEN = res.body.accessToken;
        Data.USER_REFRESH_TOKEN = res.body.refreshToken;
        Data.USER_UUID = res.body.uuid;
    });
    after(async () => {
        Data.USER_INSTANCE = await User.getByUuid(Data.USER_UUID);
    });
});