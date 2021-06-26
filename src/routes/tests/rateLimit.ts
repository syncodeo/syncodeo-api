import * as Hapi from 'hapi';

import * as Constants from '../../constants/';
import * as Helpers from '../../helpers/';
import { ENV } from '../../config';
import { RateLimitRouteOptions } from '../../plugins/rate-limit';

let path = '/tests/rateLimit';

let handler: Hapi.Lifecycle.Method = async (request, h) => { return h.response().code(204); }

let options: Hapi.RouteOptions = {
    tags: [
        Constants.RouteTags.RateLimit
    ],
    description: 'Test rate-limit route',
    plugins: {
        'rate-limit': { // 2 max par seconde
            limit: 2,
            expiresIn: 1000
        } as RateLimitRouteOptions
    }
}

export default (ENV === 'TEST') && [
    Helpers.route.createRoute({
        method: 'get',
        path,
        handler,
        options
    }),
    Helpers.route.createRoute({
        method: 'post',
        path,
        handler,
        options
    }),
    Helpers.route.createRoute({
        method: 'put',
        path,
        handler,
        options: {
            ...options,
            plugins: {
                'rate-limit': {
                    ...options.plugins['rate-limit'],
                    env: ['PROD', 'DEV']
                }
            }
        }
    }),
    Helpers.route.createRoute({
        method: 'delete',
        path,
        handler,
        options: {
            ...options,
            plugins: {
                'rate-limit': {
                    ...options.plugins['rate-limit'],
                    env: ['TEST']
                }
            }
        }
    }),
]