import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { User, Playlist } from '../../../../models';
import { IRequest } from '../../../../interfaces/request';
import { PlaylistInstance } from '../../../../models/Playlist';

interface CustomRequest extends IRequest{
    params: {
        useruuid: string
    }
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/users/{useruuid}/playlists',
    handler: async (request: CustomRequest, h) => {
        // Récupération de l'utilisateur
        let userInstance = await User.getByUuid(request.params.useruuid);
        if(!userInstance) throw Constants.Errors.UserNotFound;
        // Récupération des playlists
        let playlists = await userInstance.getPlaylists({
            // @ts-ignore
            include: Playlist.includes,
            // @ts-ignore
            order: [
                ['title', 'ASC']
            ]
        });
        // Renvoi des playlist en fonction de l'utilisateur
        let connectedUser = request.auth.user;
        let isOwner = connectedUser && connectedUser.id === userInstance.id;
        // Récupération des playlists visibles par l'utilisateur
        return playlists.filter(p => 
            isOwner || 
            (
                p.visibility === Constants.Visibility.public && 
                p.videos.filter(v => 
                    v.visibility === Constants.Visibility.public ||
                    (connectedUser && connectedUser.canEditVideo(v))
                ).length > 0
            )
        ).map(p => p.formatDisplay(connectedUser));
    },
    options: {
        description: 'List user\'s playlists (🔒)',
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        validate: {
            params: {
                useruuid: Joi.string().uuid().required().description('User UUID')
            }
        },
        plugins: {
            'hapi-swagger':{
                responses: {
                    '200': {
                        description: 'User\'s playlists',
                        schema: Joi.array().items(Playlist.displaySchema).label('Response')
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound)
                }
            }
        }
    }
});