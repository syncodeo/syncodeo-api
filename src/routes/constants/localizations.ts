import { ResponseToolkit, Request } from 'hapi';
import * as Joi from 'joi';

import * as Constants from '../../constants';
import * as Helpers from '../../helpers';

export default Helpers.route.createRoute({
    method: 'get',
    path: '/constants/localizations',
    handler: async (request: Request, h: ResponseToolkit) => {
        return Constants.getLocalizationValues();
    },
    options: {
        tags: ['api'],
        description: 'List available localizations',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Available localizations',
                        schema: Joi.array().items(Joi.string().required().description('ISO 639-1 format language')).required().description('List of available languages').label('Response')
                    }
                }
            }
        }
    }
});