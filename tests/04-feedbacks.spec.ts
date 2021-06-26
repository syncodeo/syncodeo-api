import 'mocha';

import { testSuccess, Expect, testMissingAuth, Data, DB } from './helpers';
import Routes from './routes';
import { Feedback } from '../src/models';

describe('Feedbacks', () =>  {
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Feedback.CRUD.Create()); 
    });
    it('200 - Type message', async () => {
        let data = { payload: { page: 'Home', type: 'message', message: 'test-message: hello' }, headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Feedback.CRUD.Create(), 204, data);
        // Post
        let feedbacks = await Feedback.findAll({ where: { message: data.payload.message } });
        Expect(feedbacks).to.be.an('array').of.length(1);
    });
    it('200 - Type bug', async () => {
        let data = { payload: { page: 'Home', type: 'bug', message: 'test-bug: alert' }, headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Feedback.CRUD.Create(), 204, data);
        // Post
        let feedbacks = await Feedback.findAll({ where: { message: data.payload.message } });
        Expect(feedbacks).to.be.an('array').of.length(1);
    });
    it('200 - Type improvement', async () => {
        let data = { payload: { page: 'Home', type: 'improvement', message: 'test-improvement: yeah' }, headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Feedback.CRUD.Create(), 204, data);
        // Post
        let feedbacks = await Feedback.findAll({ where: { message: data.payload.message } });
        Expect(feedbacks).to.be.an('array').of.length(1);
    });
    it('200 - Type feature', async () => {
        let data = { payload: { page: 'Home', type: 'improvement', message: 'test-feature: amazing' }, headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Feedback.CRUD.Create(), 204, data);
        // Post
        let feedbacks = await Feedback.findAll({ where: { message: data.payload.message } });
        Expect(feedbacks).to.be.an('array').of.length(1);
    });
});