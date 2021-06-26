import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { IRequest } from '../../../interfaces/request';
import { User } from '../../../models';

interface CustomRequest extends IRequest{
    params: {
        useruuid: string;
    }
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/users/{useruuid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération de l'utilisateur
        let userInstance = await User.getByUuid(request.params.useruuid);
        if(!userInstance) throw Constants.Errors.UserNotFound;
        // ENDPOINT
        return userInstance.formatDisplay();
    },
    options: {
        description: 'Retrieve specific user data',
        tags: [
            Constants.RouteTags.Documentation
        ],
        validate: {
            params: {
                useruuid: Joi.string().uuid().required().description('User UUID')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'User data',
                        schema: User.displaySchema
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound)
                }
            }
        }
    }
})