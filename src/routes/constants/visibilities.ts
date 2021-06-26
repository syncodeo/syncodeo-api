import { ResponseToolkit, Request } from 'hapi';
import * as Joi from 'joi';

import * as Constants from '../../constants';
import * as Helpers from '../../helpers';

export default Helpers.route.createRoute({
    method: 'get',
    path: '/constants/visibilities',
    handler: async (request: Request, h: ResponseToolkit) => {
        return Constants.getVisibilityValues();
    },
    options: {
        tags: ['api'],
        description: 'List available visibilities',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Available visibilities',
                        schema: Joi.array().items(Joi.string().required().description('Visibility key')).required().description('List of available visibilities').label('Response')
                    }
                }
            }
        }
    },
});