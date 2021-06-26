import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import { Playlist, PlaylistVideos, sequelize } from '../../../../models';

interface CustomRequest extends IRequest{
    params: {
        playlistuuid: string;
        videoid: string;
    }
}

export default Helpers.route.createRoute({
    method: 'delete',
    path: '/playlists/{playlistuuid}/videos/{videoid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const userInstance = request.auth.user;
        // Récupération de la playlist
        let playlistInstance = await userInstance.getPlaylist(request.params.playlistuuid);
        if(!playlistInstance) throw Constants.Errors.PlaylistNotFound;
        // Récupération de la vidéo
        let videoInstance = await playlistInstance.getVideo(request.params.videoid);
        if(!videoInstance) throw Constants.Errors.VideoNotFound;
        // Suppression de la vidéo de la playlist
        await sequelize.transaction(async (transaction) => {
            await playlistInstance.removeVideo(videoInstance, { transaction });
            await PlaylistVideos.update({
                rank: sequelize.literal('rank - 1') as any
            }, { 
                where: { 
                    rank: {[sequelize.Op.gte]: videoInstance.PlaylistVideos.rank},
                    PlaylistId: playlistInstance.id
                },
                transaction
            });
            await playlistInstance.reload({ include: Playlist.includes, transaction });
            await Helpers.ElasticSearch.createOrUpdatePlaylist(playlistInstance);
        });
        // ENDPOINT
        return playlistInstance.formatDisplay(userInstance);
    },
    options: {
        description: 'Remove a video from a playlist 🔒',
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        validate: {
            params: {
                playlistuuid: Joi.string().uuid().required().description('Playlist UUID'),
                videoid: Joi.string().required().description('Youtube video id')
            } as {[K in keyof CustomRequest['params']]: Joi.Schema}
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Video removed from playlist',
                        schema: Playlist.displaySchema
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.PlaylistNotFound, Constants.Errors.VideoNotFound),
                }
            }
        }
    }
});