import * as Joi from 'joi';
import { youtube_v3 } from 'googleapis';
import { Id } from 'catbox';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import * as Cache from '../../../cache/';
import { IRequest } from '../../../interfaces/request';
import { VideoAttributes } from '../../../models/Video';
import { server } from '../../../server';
import { IEventNewVideo } from '../../../interfaces/events';
import Realtime from '../../../realtime';
import { Video, sequelize, Tag, Collaborator, Playlist } from '../../../models';
import { RateLimitRouteOptions } from '../../../plugins/rate-limit';
import { IVideoCacheKey } from '../../../interfaces/cache';

interface CustomRequest extends IRequest{
    payload: {
        videoId: string;
        title: string;
        description: string;
        visibility: string;
        language: string;
        difficulty: string;
        collaborators: string[];
        tags: string[];
        github: string;
    };
}

export default Helpers.route.createRoute({
    method: 'post',
    path: '/videos',
    handler: async (request: CustomRequest, h) => {
        // Récupération de l'utilisateur
        const userInstance = request.auth.user;
        // Création des données de la vidéo
        let videoData: VideoAttributes = {
            ...request.payload,
            collaborators: request.payload.collaborators.map(c => { return {mail: c}; }).filter(c => c.mail !== userInstance.mail),
            tags: request.payload.tags.map(t => { return {value: t}; }),
            duration: 0,
            viewsCount: 0,
            UserId: userInstance.id,
        }
        // On vérifie que la vidéo n'existe pas déjà
        let videoExists = await Video.exists(videoData.videoId);
        if(videoExists) throw Constants.Errors.VideoAlreadyRegistered;
        // Paramétrage du client OAuth avec l'utilisateur
        let client = Helpers.oauth2client.getOAuth2Client();
        client.setCredentials(JSON.parse(userInstance.credentials));
        // Récupération des données de la vidéo (renvoie une erreur si la vidéo n'existe pas)
        let video = await Cache.youtube.videoData.get(({ id: videoData.videoId, oAuthClient: client } as IVideoCacheKey) as Id);
        // Vérification que l'utilisateur est bien l'auteur de la vidéo
        if(userInstance.channelId !== (video.snippet as youtube_v3.Schema$VideoSnippet).channelId) throw Constants.Errors.NotAuthor;
        // Récupération du temps de la vidéo (Permet de savoir si elle existe avant de faire la suite)
        videoData.duration = Helpers.youtube.youtubeDurationToTotalTime(await Helpers.youtube.getYoutubeVideoDuration(videoData.videoId, client));
        if(videoData.duration === 0) throw Constants.Errors.YoutubeVideoNotReady;
        // On met à jour les credentials de l'utilisateur après utilisation
        await userInstance.update({ credentials: JSON.stringify(client.credentials) });
        // Création de la vidéo
        let videoInstance = await sequelize.transaction(async (transaction) => {
            // Création de la vidéo
            let videoInstance = await Video.create(videoData, { include: Video.includes, transaction });
            await videoInstance.reload({ where: { id: videoInstance.id }, include: Video.includes, transaction }); // Permet de récupérer les infos manquantes
            // Ajout dans ElasticSearch
            await Helpers.ElasticSearch.createOrUpdateVideo(videoInstance);
            // ENDPOINT
            return videoInstance;
        });
        // On log la création de la vidéo sur Discord
        server.eventEmitter.emit(Constants.Events.NewVideo, { date: new Date(), video: videoInstance, user: userInstance } as IEventNewVideo);
        // Metrics
        server.metrics.videosCount.inc();
        // Envoi aux clients SocketIO
        Realtime.send({
            type: "ADD_VIDEO",
            user: userInstance,
            video: videoInstance
        });
        // On retourne la vidéo
        return h.response(videoInstance.formatDisplay(userInstance)).code(201);
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.RateLimit,
            Constants.RouteTags.CheckUser,
            Constants.RouteTags.CheckYoutube
        ],
        auth: 'jwt',
        validate: {
            payload: {
                videoId: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Youtube video ID'),
                title: Joi.string().max(255).required().description('Video title'),
                description: Joi.string().allow('').required().description('Video description'),
                visibility: Joi.string().valid(Constants.getVisibilityValues()).required().description('Video visibility'),
                language: Joi.string().valid(Constants.getLocalizationValues()).required().description('Video language'),
                difficulty: Joi.string().valid(Constants.getDifficultyValues()).required().description('Video difficulty'),
                github: Joi.string().regex(Constants.Regex.githubLink).allow('').required().description('Github link associated to video'),
                collaborators: Joi.array().items(Joi.string().email().max(100)).unique((a, b) => a === b).required().description('Video collaborators'),
                tags: Joi.array().max(5).items(Joi.string().max(20)).unique((a, b) => a === b).required().description('Video tags')
            }
        },
        description: 'Create a video 🔒',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '201': {
                        description: 'Video created',
                        schema: Video.displaySchema
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.YoutubeAccountNeedToBeLinked, Constants.Errors.VideoDoesNotExists, Constants.Errors.YoutubeVideoNotReady),
                    '403': Helpers.generateResponseErrorSchema(Constants.Errors.NotAuthor),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound),
                    '409': Helpers.generateResponseErrorSchema(Constants.Errors.VideoAlreadyRegistered)
                }
            },
            'rate-limit': { // 1 par seconde (3 pour 3 secondes)
                expiresIn: 1000 * 3,
                limit: 3,
                env: ['PROD']
            } as RateLimitRouteOptions
        }
    }
})