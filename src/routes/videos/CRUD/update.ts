import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { IRequest } from '../../../interfaces/request';
import Realtime from '../../../realtime';
import { Video, sequelize, Tag, Collaborator, Playlist } from '../../../models';
import { IVideoUpdateFields } from '../../../interfaces/model';

interface CustomRequest extends IRequest{
    params: {
        videoid: string;
    };
    payload: {
        title?: string;
        description?: string;
        visibility?: string;
        language?: string;
        difficulty?: string;
        github?: string;
        collaborators?: string[];
        tags?: string[];
    };
}

export default Helpers.route.createRoute({
    method: 'put',
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
        // Récupération des données de la vidéo
        const videoData: IVideoUpdateFields = request.payload;
        // Modification de la vidéo
        let updatedVideo = await sequelize.transaction(async (transaction) => {
            // Tags
            if(request.payload.tags){
                await Tag.destroy({ where: { VideoId: videoInstance.id }, transaction });
                await Tag.bulkCreate(request.payload.tags.map(tag => { return { VideoId: videoInstance.id, value: tag }; }), { transaction });
            }
            // Collaborateurs
            if(request.payload.collaborators){
                await Collaborator.destroy({ where: { VideoId: videoInstance.id }, transaction });
                await Collaborator.bulkCreate(request.payload.collaborators.map(collaborator => { return { VideoId: videoInstance.id, mail: collaborator }; }), { transaction });
            }
            // Mise à jour de la vidéo
            await videoInstance.update(videoData, { transaction });
            await videoInstance.reload({ where: {id: videoInstance.id}, include: Video.includes, transaction });
            // Mise à jour de la vidéo dans ElasticSearch
            await Helpers.ElasticSearch.createOrUpdateVideo(videoInstance);
            // Mise à jour des playlists impactées dans ElasticSearch
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
            await Promise.all(playlists.map(async (playlist) => {
                await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes, transaction });
                await Helpers.ElasticSearch.createOrUpdatePlaylist(playlist);
            }));
            // ENDPOINT
            return videoInstance;
        });
        // Envoi aux clients SocketIO
        Realtime.send({
            type: "UPDATE_VIDEO",
            user: userInstance,
            video: videoInstance
        });
        // ENDPOINT
        return await updatedVideo.formatDisplay(userInstance);
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        validate: {
            params: {
                videoid: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Youtube video ID'),
            },
            payload: {
                title: Joi.string().max(255).description('Video title'),
                description: Joi.string().allow('').description('Video description'),
                visibility: Joi.string().valid(Constants.getVisibilityValues()).description('Video visibility'),
                language: Joi.string().valid(Constants.getLocalizationValues()).description('Video language'),
                difficulty: Joi.string().valid(Constants.getDifficultyValues()).description('Video difficulty'),
                github: Joi.string().regex(Constants.Regex.githubLink).allow('').description('Github link associated to video'),
                collaborators: Joi.array().items(Joi.string().email().max(255)).unique((a, b) => a === b).description('Video collaborators'),
                tags: Joi.array().max(5).items(Joi.string().max(20)).unique((a, b) => a === b).description('Video tags')
            }
        },
        description: 'Update a video 🔒',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Updated video',
                        schema: Video.displaySchema
                    },
                    '403': Helpers.generateResponseErrorSchema(Constants.Errors.CantEditRessource),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.VideoNotFound),
                }
            }
        }
    }
})