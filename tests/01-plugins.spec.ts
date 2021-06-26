import 'mocha';
import { testSuccess, testError, Errors } from './helpers';
import Routes from './routes';

describe('Rate-Limit', () => {
    describe('GET - NOTHING', () => {
        it('204 - OK 1/2', async () => {
            await testSuccess(Routes.Tests.RateLimit.Get(), 204);
        });
        it('204 - OK 2/2', async () => {
            await testSuccess(Routes.Tests.RateLimit.Get(), 204);
        });
        it('429 - OUT 3/2', async () => {
            await testError(Routes.Tests.RateLimit.Get(), Errors.TooManyRequests);
        });
    });

    describe('POST - NOTHING', () => {
        it('204 - OK 1/2', async () => {
            await testSuccess(Routes.Tests.RateLimit.Post(), 204);
        });
        it('204 - OK 2/2', async () => {
            await testSuccess(Routes.Tests.RateLimit.Post(), 204);
        });
        it('429 - OUT 3/2', async () => {
            await testError(Routes.Tests.RateLimit.Post(), Errors.TooManyRequests);
        });
    });

    describe('PUT - ONLY PROD & DEV', () => {
        it('204 - OK 1', async () => {
            await testSuccess(Routes.Tests.RateLimit.Put(), 204);
        });
        it('204 - OK 2', async () => {
            await testSuccess(Routes.Tests.RateLimit.Put(), 204);
        });
        it('204 - OK 3', async () => {
            await testSuccess(Routes.Tests.RateLimit.Put(), 204);
        });
    });

    describe('DEL - ONLY TEST', () => {
        it('204 - OK 1/2', async () => {
            await testSuccess(Routes.Tests.RateLimit.Delete(), 204);
        });
        it('204 - OK 2/2', async () => {
            await testSuccess(Routes.Tests.RateLimit.Delete(), 204);
        });
        it('429 - OUT 3/2', async () => {
            await testError(Routes.Tests.RateLimit.Delete(), Errors.TooManyRequests);
        });
    });
});