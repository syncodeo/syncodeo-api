import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { Playlist, sequelize, PlaylistTag } from '../../../models';
import { IRequest } from '../../../interfaces/request';

interface CustomRequest extends IRequest{
    params: {
        playlistuuid: string;
    },
    payload: {
        title: string;
        description: string;
        visibility: string;
        tags: string[];
    }
}

export default Helpers.route.createRoute({
    method: 'put',
    path: '/playlists/{playlistuuid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const userInstance = request.auth.user;
        // Récupération de la playlist
        let playlistInstance = await userInstance.getPlaylist(request.params.playlistuuid);
        if(!playlistInstance) throw Constants.Errors.PlaylistNotFound;
        // Mise à jour de la playlist
        await sequelize.transaction(async (transaction) => {
            // Mise à jour des tags de la playlist
            if(request.payload.tags){
                await PlaylistTag.destroy({ where: { PlaylistId: playlistInstance.id }, transaction });
                await PlaylistTag.bulkCreate(request.payload.tags.map(tag => { return { PlaylistId: playlistInstance.id, value: tag }; }), { transaction });
            }
            // Mise à jour de la playlist
            await playlistInstance.update(request.payload, { transaction });
            await playlistInstance.reload({ where: { id: playlistInstance.id }, include: Playlist.includes, transaction });
            // Modification dans Elasticsearch
            await Helpers.ElasticSearch.createOrUpdatePlaylist(playlistInstance);
        });
        // ENDPOINT
        return playlistInstance.formatDisplay(userInstance);
    },
    options: {
        description: 'Update a playlist 🔒',
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        validate: {
            params: {
                playlistuuid: Joi.string().uuid().required().description('Playlist UUID')
            },
            payload: {
                title: Joi.string().max(255).description('Playlist title'),
                description: Joi.string().allow('').description('Playlist title'),
                visibility: Joi.string().valid(Constants.getVisibilityValues()).description('Playlist visibility'),
                difficulty: Joi.string().valid(Constants.getDifficultyValues()).description('Playlist difficulty'),
                language: Joi.string().valid(Constants.getLocalizationValues()).description('Playlist language'),
                tags: Joi.array().max(5).items(Joi.string().max(20)).unique((a, b) => a === b).description('Playlist tags')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Video updated',
                        schema: Playlist.displaySchema
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.PlaylistNotFound)
                }
            }
        }
    }
});