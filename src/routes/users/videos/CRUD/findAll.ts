import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import { CollaboratorInstance } from '../../../../models/Collaborator';
import { User, Video } from '../../../../models';

interface CustomRequest extends IRequest{
    query: {
        collaborator?: string // Boolean mais obligé de mettre string
    };
    params: {
        useruuid: string;
    };
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/users/{useruuid}/videos',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { useruuid } = request.params;
        // On récupère l'instance de l'utilisateur
        let userInstance = await User.getByUuid(useruuid);
        if(!userInstance) throw Constants.Errors.UserNotFound;
        // On valide un éventuel token d'authorisation
        let connectedUser = request.auth.user;
        let isOwner = connectedUser && connectedUser.uuid === useruuid;
        // En fonction du type de vidéo demandée
        if(!request.query.collaborator){ // Vidéos de l'utilisateur
            // Récupération des vidéos
            let videos = await userInstance.getVideos({ 
                // @ts-ignore
                include: Video.includes,
                // @ts-ignore
                order: [
                    ['createdAt', 'DESC']
                ]
            });
            // On recupère uniquement les vidéos publiques si c'est un étranger qui n'est pas collaborateur
            if(!isOwner){
                videos = videos.filter(video => (connectedUser && connectedUser.canEditVideo(video)) || video.visibility === Constants.Visibility.public);
            }
            // Formattage de l'output + ENDPOINT + Suppression collaborators si pas propriétaire
            return videos.map(v => v.formatDisplay(connectedUser));
        }
        else{ // Vidéo "user as collaborator" (require jwt auth)
            if(isOwner){
                // Récupération des vidéos
                let videos = await userInstance.getAllowedVideos();
                // Formattage des vidéos + ENDPOINT
                return videos.map(v => v.formatDisplay());
            }
            else{
                throw Constants.Errors.RequireAuthorization;
            }
        }
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        validate: {
            query: {
                collaborator: Joi.boolean().optional().description('Retrieve videos where user is collaborator')
            },
            params: {
                useruuid: Joi.string().uuid().required().description('User UUID'),
            }
        },
        description: 'List user\'s videos (🔒)',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'User\'s videos',
                        schema: Joi.array().items(Video.displaySchema).label('Response')
                    },
                    '401': Helpers.generateResponseErrorSchema(Constants.Errors.RequireAuthorization),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound),
                }
            }
        }
    }
})