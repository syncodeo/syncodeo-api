import * as Joi from 'joi';

import * as Helpers from '../../helpers/';
import * as Constants from '../../constants/';
import { IRequest } from '../../interfaces/request';

export default Helpers.route.createRoute({
    method: 'get',
    path: '/accounts/me',
    handler: async (request: IRequest, h) => {
        // Récupération des paramètres
        const userInstance = request.auth.user;
        // Renvoi des données de l'utilisateur
        return {
            uuid: userInstance.uuid,
            linked: userInstance.channelId !== null && userInstance.channelId !== ''
        }
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        description: 'Get user infos 🔒',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Connected user data',
                        schema: Joi.object({
                            uuid: Joi.string().required().description('Connected user identifier, UUID format'),
                            linked: Joi.boolean().required().description('Is user YouTube account linked')
                        }).label('Response')
                    }
                }
            }
        }
    }
});