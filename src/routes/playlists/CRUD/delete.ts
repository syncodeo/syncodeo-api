import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { sequelize } from '../../../models';
import { IRequest } from '../../../interfaces/request';

interface CustomRequest extends IRequest{
    params: {
        playlistuuid: string;
    }
}

export default Helpers.route.createRoute({
    method: 'delete',
    path: '/playlists/{playlistuuid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const userInstance = request.auth.user;
        // Récupération de la playlist
        let playlistInstance = await userInstance.getPlaylist(request.params.playlistuuid);
        if(!playlistInstance) throw Constants.Errors.PlaylistNotFound;
        // Suppression de la playlist
        await sequelize.transaction(async (transaction) => {
            await playlistInstance.destroy({ transaction });
            await Helpers.ElasticSearch.deletePlaylists(playlistInstance);
        });
        return h.response().code(204);
    },
    options: {
        description: 'Delete a playlist 🔒',
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        validate: {
            params: {
                playlistuuid: Joi.string().uuid().required().description('Playlist UUID')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '204': {
                        description: 'Playlist deleted'
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.PlaylistNotFound)
                }
            }
        }
    }
});