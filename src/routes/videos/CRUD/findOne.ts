import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { IRequest } from '../../../interfaces/request';
import { Video } from '../../../models';

interface CustomRequest extends IRequest{
    params: {
        videoid: string
    };
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/videos/{videoid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres de la requête
        const { videoid } = request.params;
        // Récupération de la vidéo
        let videoInstance = await Video.getByVideoId(videoid);
        if(!videoInstance) throw Constants.Errors.VideoNotFound;
        // On regarde si l'utilisateur connecté est l'auteur/collab de la vidéo
        let connectedUser = await Helpers.getUserFromOptionnalAuth(request);
        let isOwner = connectedUser && videoInstance.UserId === connectedUser.id;
        let isCollaborator = connectedUser && (await videoInstance.getCollaborators()).map(c => c.mail).includes(connectedUser.mail);
        // On regarde si l'utilisateur à le droit d'accéder à la vidéo
        if(videoInstance.visibility === Constants.Visibility.private && !isOwner && !isCollaborator)
            throw Constants.Errors.VideoNotFound;
        // ENDPOINT
        return await videoInstance.formatDisplay(connectedUser);
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation
        ],
        validate: {
            params: {
                videoid: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Youtube video ID')
            }
        },
        description: 'Specific video data (🔒)',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Specific video',
                        schema: Video.displaySchema
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.VideoNotFound),
                }
            }
        }
    }
})