import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { Playlist } from '../../../models';
import { IRequest } from '../../../interfaces/request';

interface CustomRequest extends IRequest{
    params: {
        playlistuuid: string;
    }
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/playlists/{playlistuuid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération de l'utilisateur si
        let connectedUser = request.auth.user;
        // Récupération de la playlist
        let playlistInstance = await Playlist.getByUuid(request.params.playlistuuid);
        if(!playlistInstance) throw Constants.Errors.PlaylistNotFound;
        let isOwner = connectedUser && connectedUser.id === playlistInstance.UserId;
        if(!playlistInstance || (!isOwner && playlistInstance.visibility === Constants.Visibility.private)) throw Constants.Errors.PlaylistNotFound;
        // ENDPOINT
        return playlistInstance.formatDisplay(connectedUser);
    },
    options: {
        description: 'Specific playlist data (🔒)',
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        validate: {
            params: {
                playlistuuid: Joi.string().uuid().required().description('Playlist UUID')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Playlist data',
                        schema: Playlist.displaySchema
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.PlaylistNotFound)
                }
            }
        }
    }
});