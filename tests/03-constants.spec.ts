import 'mocha';

import { testSuccess, validateBody, Expect, Constants } from './helpers';
import Routes from './routes';

describe('Difficulties', () =>  {
    it('200', async () => {
        let res = await testSuccess(Routes.Constants.Difficulties(), 200);
        Expect(res.body).to.eql(Constants.getDifficultyValues());
    });
});

describe('Localizations', () => {
    it('200', async () => {
        let res = await testSuccess(Routes.Constants.Localizations(), 200);
        Expect(res.body).to.eql(Constants.getLocalizationValues());
    });
});

describe('Visibilities', () => {
    it('200', async () => {
        let res = await testSuccess(Routes.Constants.Visibilities(), 200);
        Expect(res.body).to.eql(Constants.getVisibilityValues());
    });
});