import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { IRequest } from '../../../interfaces/request';
import { Video, sequelize, Playlist, PlaylistVideos } from '../../../models';

interface CustomRequest extends IRequest{
    params: {
        videoid: string
    };
}

export default Helpers.route.createRoute({
    method: 'delete',
    path: '/videos/{videoid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { videoid } = request.params;
        const userInstance = request.auth.user;
        // Récupération de la vidéo
        let videoInstance = await Video.getByVideoId(videoid);
        if(!videoInstance) throw Constants.Errors.VideoNotFound;
        // On vérifie que l'utilisateur a le droit de modifier la vidéo
        if(videoInstance.UserId !== userInstance.id) throw Constants.Errors.CantEditRessource;
        // Suppression de la vidéo
        await sequelize.transaction(async (transaction) => {
            // Récupération des playlists impactées
            let playlists = await Playlist.findAll({
                include: [
                    ...Playlist.includes.filter(i => i.as !== 'videos'), {
                    model: Video,
                    as: 'videos',
                    where: {
                        videoId: videoInstance.videoId
                    }
                }],
                transaction
            });
            // Mise à jour des ranks des vidéos dans les playlists impactées
            await Promise.all(
                (await PlaylistVideos.findAll({ where: { VideoId: videoInstance.id }}))
                .map(playlistVideo => PlaylistVideos.update({
                    rank: sequelize.literal('rank - 1') as any 
                }, { 
                    where: { PlaylistId: playlistVideo.PlaylistId, rank: {[sequelize.Op.gte]: playlistVideo.rank} }
                }))
            );
            // Suppression de la vidéo
            await videoInstance.destroy({ transaction });
            await Helpers.ElasticSearch.deleteVideo(videoInstance);
            // Actualisation des playlists pour Elasticsearch
            playlists = await Playlist.findAll({ where: {id: {[sequelize.Op.in]: playlists.map(p => p.id)}}, include: Playlist.includes, transaction });
            await Promise.all(playlists.map(playlist => Helpers.ElasticSearch.createOrUpdatePlaylist(playlist)));
        });
        // ENDPOINT
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
                videoid: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Youtube video ID')
            }
        },
        description: 'Delete a video 🔒',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '204': {
                        description: 'Video deleted'
                    },
                    '403': Helpers.generateResponseErrorSchema(Constants.Errors.CantEditRessource),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.VideoNotFound),
                }
            }
        }
    }
})