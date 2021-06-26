import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import { Video, Playlist, sequelize } from '../../../../models';

interface CustomRequest extends IRequest{
    params: {
        playlistuuid: string;
        videoid: string;
    }
}

export default Helpers.route.createRoute({
    method: 'post',
    path: '/playlists/{playlistuuid}/videos/{videoid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const userInstance = request.auth.user;
        // Récupération de la playlist
        let playlistInstance = await userInstance.getPlaylist(request.params.playlistuuid);
        if(!playlistInstance) throw Constants.Errors.PlaylistNotFound;
        // Récupération de la vidéo
        let videoInstance = await Video.getByVideoId(request.params.videoid);
        if(!videoInstance) throw Constants.Errors.VideoNotFound;
        if(userInstance.id !== videoInstance.UserId) throw Constants.Errors.NotAuthor;
        // La vidéo est-elle déjà dans la playlist ?
        if(playlistInstance.videos.map(v => v.videoId).includes(videoInstance.videoId)) throw Constants.Errors.VideoAlreadyInPlaylist;
        // Ajout de la vidéo à la playlist
        await sequelize.transaction(async (transaction) => {
            await playlistInstance.addVideo(videoInstance, { through: { rank: playlistInstance.videos.length + 1 }, transaction });
            await playlistInstance.reload({ include: Playlist.includes, transaction });
            await Helpers.ElasticSearch.createOrUpdatePlaylist(playlistInstance);
        });
        // ENDPOINT
        return h.response(playlistInstance.formatDisplay(userInstance)).code(201);
    },
    options: {
        description: 'Add a video to a playlist 🔒',
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        validate: {
            params: {
                playlistuuid: Joi.string().uuid().required().description('Playlist UUID'),
                videoid: Joi.string().required().description('Youtube video id')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '201': {
                        description: 'Video added to playlist',
                        schema: Playlist.displaySchema
                    },
                    '403': Helpers.generateResponseErrorSchema(Constants.Errors.NotAuthor),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.PlaylistNotFound, Constants.Errors.VideoNotFound),
                    '409': Helpers.generateResponseErrorSchema(Constants.Errors.VideoAlreadyInPlaylist),
                }
            }
        }
    }
});