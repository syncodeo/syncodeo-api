import * as Helpers from '../helpers/';
import { server } from '../server';

export default Helpers.route.createRoute({
    method: 'get',
    path: '/metrics',
    handler: async (request, h) => {
        return server.prometheus.metrics();
    },
    options: {
        auth: 'basic'
    }
});