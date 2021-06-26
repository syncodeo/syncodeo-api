import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import { Video } from '../../../../models';

interface CustomRequest extends IRequest{
    params: {
        videoid: string,
        codeuuid: string
    };
}

export default Helpers.route.createRoute({
    method: 'delete',
    path: '/videos/{videoid}/codes/{codeuuid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { videoid, codeuuid } = request.params;
        const userInstance = request.auth.user;
        // Récupération de la vidéo
        let videoInstance = await Video.getByVideoId(videoid);
        if(!videoInstance) throw Constants.Errors.VideoNotFound;
        // Récupération du code
        let codeInstance = await videoInstance.getCode(codeuuid);
        if(!codeInstance) throw Constants.Errors.CodeNotFound;
        // On vérifie que l'utilisateur peut supprimer un code sur cette vidéo
        let canEditVideo = await userInstance.canEditVideo(videoInstance);
        if(!canEditVideo) throw Constants.Errors.CantEditRessource;
        // Suppression du code
        await codeInstance.destroy();
        return h.response().code(204);
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        validate: {
            params: {
                videoid: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Youtube video ID'),
                codeuuid: Joi.string().uuid().required().description('Code UUID')
            }
        },
        description: 'Delete a code 🔒',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '204': {
                        description: 'Code deleted'
                    },
                    '403': Helpers.generateResponseErrorSchema(Constants.Errors.CantEditRessource),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.VideoNotFound, Constants.Errors.CodeNotFound),
                }
            }
        }
    }
})