import * as Sequelize from 'sequelize';
import * as Joi from 'joi';

import * as Helpers from '../../helpers/';
import * as Constants from '../../constants/';
import * as Cache from '../../cache/';
import { IRequest } from '../../interfaces/request';
import { getOAuth2Client } from '../../helpers/oauth2client';
import { IVideoCacheKey } from '../../interfaces/cache';
import { Id } from 'catbox';
import { Video, User } from '../../models';

const client = getOAuth2Client();

export default Helpers.route.createRoute({
    method: 'get',
    path: '/videos/recentUploads',
    handler: async (request: IRequest, h) => {
        // Récupération des paramètres
        const userInstance = request.auth.user;
        // On associe le client OAuth à l'utilisateur
        client.setCredentials(JSON.parse(userInstance.credentials));
        // On récupère ses vidéos récentes
        let videos = await Cache.youtube.playlistVideos.get(({ id: userInstance.uploadsPlaylist, oAuthClient: client } as IVideoCacheKey) as Id);
        // On met à jour les credentials de l'utilisateur après utilisation
        await userInstance.update({ credentials: JSON.stringify(client.credentials) });
        // On récupère les vidéos qui sont déjà enregistrées sur Syncodeo
        let registeredVideoIds = (await Video.findAll({ where: {videoId:{[Sequelize.Op.in]: videos.map(v => v.snippet.resourceId.videoId)}} })).map(v => v.videoId);
        // Formattage du résultat final
        return videos.map(video => {
            return {
                videoId: video.snippet.resourceId.videoId,
                title: video.snippet.title,
                description: video.snippet.description,
                status: video.status.privacyStatus,
                registered: registeredVideoIds.includes(video.snippet.resourceId.videoId)
            };
        });
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser,
            Constants.RouteTags.CheckYoutube
        ],
        auth: 'jwt',
        description: 'Get recents uploads of user 🔒',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'User recent YouTube uploads',
                        schema: Joi.array().items(Joi.object({
                            videoId: Joi.string().required().description('Youtube video ID'),
                            title: Joi.string().required().description('Youtube video title'),
                            description: Joi.string().required().description('Youtube video description'),
                            status: Joi.string().valid(['private', 'public', 'unlisted']).required().description('Youtube video visibility status'),
                            registered: Joi.boolean().required().description('Is Youtube video registered in Syncodeo')
                        }).label('Recent uploaded video schema')).label('Response')
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.YoutubeAccountNeedToBeLinked),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound)
                }
            },
        }
    }
})