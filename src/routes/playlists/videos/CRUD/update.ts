import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import { Playlist, PlaylistVideos, sequelize, User } from '../../../../models';

interface CustomRequest extends IRequest{
    params: {
        playlistuuid: string;
        videoid: string;
    },
    payload: {
        rank: number;
    }
}


export default Helpers.route.createRoute({
    method: 'put',
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
        // Vérification que le nouveau rang est valide
        if(request.payload.rank > playlistInstance.videos.length) request.payload.rank = playlistInstance.videos.length;
        if(request.payload.rank === videoInstance.PlaylistVideos.rank) return playlistInstance.formatDisplay(userInstance);
        // Mise à jour de la BDD
        await sequelize.transaction(async (transaction) => {
            // Mise à jour du rang des vidéos impactées
            if(request.payload.rank < videoInstance.PlaylistVideos.rank){ // Déplacer vers le début
                await PlaylistVideos.update({
                    rank: sequelize.literal('rank + 1') as any
                }, {
                    where: {
                        PlaylistId: playlistInstance.id,
                        [sequelize.Op.and]: [
                            { rank: {[sequelize.Op.gte]: request.payload.rank} },
                            { rank: {[sequelize.Op.lt]: videoInstance.PlaylistVideos.rank} }
                        ]
                    },
                    transaction
                });
            }
            else{ // Déplacer vers la fin
                await PlaylistVideos.update({
                    rank: sequelize.literal('rank - 1') as any
                }, {
                    where: {
                        PlaylistId: playlistInstance.id,
                        [sequelize.Op.and]: [
                            { rank: {[sequelize.Op.lte]: request.payload.rank} },
                            { rank: {[sequelize.Op.gt]: videoInstance.PlaylistVideos.rank} }
                        ]
                    },
                    transaction
                });
            }
            // Mise à jour du rang de la vidéo choisie
            await PlaylistVideos.update({
                rank: request.payload.rank
            }, {
                where: {
                    VideoId: videoInstance.id,
                    PlaylistId: playlistInstance.id
                },
                transaction
            });
        });
        // /!\ Ne pas oublier de modifier la playlist Elasticsearch si modification impactant celle-ci (titre de la vidéo, description, tag, visibilité)
        // ENDPOINT
        await playlistInstance.reload({ include: Playlist.includes });
        return playlistInstance.formatDisplay(userInstance);
    },
    options: {
        description: 'Update rank of a video in a playlist 🔒',
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        validate: {
            params: {
                playlistuuid: Joi.string().uuid().required().description('Playlist UUID'),
                videoid: Joi.string().required().description('Youtube video id')
            } as {[K in keyof CustomRequest['params']]: Joi.Schema},
            payload: {
                rank: Joi.number().integer().min(1).required().description('Video\'s rank in playlist, starts at 1')
            } as {[K in keyof CustomRequest['payload']]: Joi.Schema}
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Video rank updated in playlist',
                        schema: Playlist.displaySchema
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.PlaylistNotFound, Constants.Errors.VideoNotFound),
                }
            }
        }
    }
});