import * as Joi from 'joi';
import * as JWT from 'jsonwebtoken';

import * as Helpers from '../../helpers/';
import * as Constants from '../../constants/';
import * as Cache from './../../cache/';
import { IRequest } from '../../interfaces/request';
import { Video, User, Code } from '../../models';
import { PROXY } from '../../config';
import { server } from '../../server';

interface CustomRequest extends IRequest{
    params: {
        videoid: string;
    };
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/videos/{videoid}/watch',
    handler: async (request: CustomRequest, h) => {
        // Récupération de la vidéo
        let videoInstance = await Video.getByVideoId(request.params.videoid);
        if(!videoInstance) throw Constants.Errors.VideoNotFound;
        // Count
        let countCacheKey = `${request.params.videoid}:${Helpers.getIP(request, PROXY)}`;
        let countCache = await Cache.rateLimit.watchViewsCount.get(countCacheKey);
        if(!countCache){
            await Cache.rateLimit.watchViewsCount.set(countCacheKey, true);
            await videoInstance.incrementViewsCount();
            // Metrics
            server.metrics.viewsCount.inc();
        }
        // Récupération de l'utilisateur connecté (si c'est le cas)
        let connectedUser = request.auth.user;
        // On regarde si l'utilisateur (si il existe) à le droit de modifier la vidéo
        let canUserEditVideo = Boolean(connectedUser && await connectedUser.canEditVideo(videoInstance));
        // Si la vidéo est privée, on regarde si l'utilisateur à le droit de la visionner
        if(videoInstance.visibility === Constants.Visibility.private && !canUserEditVideo) throw Constants.Errors.VideoNotFound;
        // Ici on récupère les codes de la vidéo
        let codes = await videoInstance.getAllCodes();
        let formattedCodes = await Promise.all(codes.map(code => code.formatDisplay()));
        // On renvoie le tout
        return {
            github: videoInstance.github,
            editable: canUserEditVideo,
            codes: formattedCodes,
            owner: videoInstance.owner.uuid
        };
    },
    options:{
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        validate: {
            params: {
                videoid: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Youtube video ID')
            }
        },
        description: 'Necessary data to watch a video (🔒)',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Watched video data',
                        schema: Joi.object({
                            github: Joi.string().required().description('GitHub repository or folder linked to the video'),
                            editable: Joi.boolean().required().description('Is user allowed to edit the video'),
                            codes: Joi.array().items(Code.displaySchema).required().description('Video codes'),
                            owner: Joi.string().required().description('UUID of the video\'s owner')
                        }).label('Watch video schema')
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.VideoNotFound)
                }
            },
        }
    }
})