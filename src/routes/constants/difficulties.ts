import { ResponseToolkit, Request } from 'hapi';
import * as Joi from 'joi';

import * as Constants from '../../constants';
import * as Helpers from '../../helpers';

export default Helpers.route.createRoute({
    method: 'get',
    path: '/constants/difficulties',
    handler: async (request: Request, h: ResponseToolkit) => {
        return Constants.getDifficultyValues();
    },
    options: {
        tags: ['api'],
        description: 'List available difficulties',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Available difficulties',
                        schema: Joi.array().items(Joi.string().required().description('Diffculty key')).required().description('List of available difficulties').label('Response')
                    }
                }
            }
        }
    },
});