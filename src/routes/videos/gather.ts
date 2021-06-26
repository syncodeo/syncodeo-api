import * as Joi from 'joi';

import * as Helpers from '../../helpers/';
import * as Constants from '../../constants/';
import * as Cache from '../../cache/';
import { IRequest } from '../../interfaces/request';
import { getOAuth2Client } from '../../helpers/oauth2client';
import { Id } from 'catbox';
import { IVideoCacheKey } from '../../interfaces/cache';
import { RateLimitRouteOptions } from '../../plugins/rate-limit';
import { Video } from '../../models';

const client = getOAuth2Client();

interface CustomRequest extends IRequest{
    query: {
        videoId: string;
    };
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/videos/gather',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { videoId } = request.query;
        const userInstance = request.auth.user;
        // On paramètre le client OAuth avec les informations de l'utilisateur
        client.setCredentials(JSON.parse(userInstance.credentials));
        // On récupère les informations de la vidéo
        let videoData = await Cache.youtube.videoData.get(({ id: videoId, oAuthClient: client } as IVideoCacheKey) as Id);
        // On met à jour les credentials de l'utilisateur après utilisation
        await userInstance.update({ credentials: JSON.stringify(client.credentials) });
        // On vérifie que l'utilisateur est bien l'auteur de la vidéo
        if(userInstance.channelId !== videoData.snippet.channelId) throw Constants.Errors.NotAuthor;
        // Si tout est ok on renvoie les données de la vidéo
        return {
            videoId: videoData.id,
            title: videoData.snippet.title,
            description: videoData.snippet.description,
            status: videoData.status.privacyStatus,
            registered: await Video.exists(videoId)
        }
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.RateLimit,
            Constants.RouteTags.CheckUser,
            Constants.RouteTags.CheckYoutube
        ],
        auth: 'jwt',
        description: 'Gather video data 🔒',
        validate: {
            query: {
                videoId: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Video id')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Youtube video data',
                        schema: Joi.object({
                            videoId: Joi.string().required().description('Youtube video ID'),
                            title: Joi.string().required().description('Youtube video title'),
                            description: Joi.string().required().description('Youtube video description'),
                            status: Joi.string().valid(['private', 'public', 'unlisted']).required().description('Youtube video visibility status'),
                            registered: Joi.boolean().required().description('Is the Video already registered on Syncodeo?')
                        }).label('Response')
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.YoutubeAccountNeedToBeLinked, Constants.Errors.VideoDoesNotExists),
                    '403': Helpers.generateResponseErrorSchema(Constants.Errors.NotAuthor),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound)
                }
            },
            'rate-limit': { // 5 toutes les 10 secondes
                expiresIn: 1000 * 10,
                limit: 5,
                env: ['PROD']
            } as RateLimitRouteOptions
        }
    }
})