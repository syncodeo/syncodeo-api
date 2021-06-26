import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { Playlist, sequelize } from '../../../models';
import { IRequest } from '../../../interfaces/request';

interface CustomRequest extends IRequest{
    payload: {
        title: string;
        description: string;
        visibility: string;
        difficulty: string;
        language: string;
        tags: string[];
    }
}

export default Helpers.route.createRoute({
    method: 'post',
    path: '/playlists',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const userInstance = request.auth.user;
        // Création de la playlist
        let newPlaylist = await sequelize.transaction(async (transaction) => {
            // Création de la playlist
            let playlist = await Playlist.create({
                ...request.payload,
                UserId: userInstance.id,
                playlistTags: request.payload.tags.map(t => { return { value: t }; })
            }, {
                include: Playlist.includes,
                transaction
            });
            await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes, transaction });
            // Ajout dans Elasticsearch
            await Helpers.ElasticSearch.createOrUpdatePlaylist(playlist);
            // ENDPOINT
            return playlist;
        });
        // ENDPOINT
        return h.response(newPlaylist.formatDisplay(userInstance)).code(201);
    },
    options: {
        description: 'Create a playlist 🔒',
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser,
            Constants.RouteTags.CheckYoutube
        ],
        auth: 'jwt',
        validate: {
            payload: {
                title: Joi.string().max(255).required().description('Playlist title'),
                description: Joi.string().allow('').required().description('Playlist description'),
                visibility: Joi.string().valid(Constants.getVisibilityValues()).required().description('Playlist visibility'),
                difficulty: Joi.string().valid(Constants.getDifficultyValues()).required().description('Playlist difficulty'),
                language: Joi.string().valid(Constants.getLocalizationValues()).required().description('Playlist language'),
                tags: Joi.array().max(5).items(Joi.string().max(20)).unique((a, b) => a === b).required().description('Playlist tags')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '201': {
                        description: 'Playlist created',
                        schema: Playlist.displaySchema
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.YoutubeAccountNeedToBeLinked),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound)
                }
            },
        }
    }
});