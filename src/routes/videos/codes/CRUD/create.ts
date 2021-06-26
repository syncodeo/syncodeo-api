import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import Realtime from '../../../../realtime';
import { Video, Code } from '../../../../models';
import { CodeAttributes } from '../../../../models/Code';

interface CustomRequest extends IRequest{
    payload: {
        title: string
        value: string
        mode: string
        time: number,
        githubLink: string
    };
    params: {
        videoid: string
    };
}

export default Helpers.route.createRoute({
    method: 'post',
    path: '/videos/{videoid}/codes',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { videoid } = request.params;
        const userInstance = request.auth.user;
        // Récupération des données du nouveau code
        let codeData: CodeAttributes = {
            ...request.payload,
            ...Helpers.explodeGithubFile(request.payload.githubLink),
            VideoId: -1
        }
        if(codeData.githubUser){
            codeData.value = null;
        }
        else if(codeData.value){
            codeData.githubUser = null;
            codeData.githubRepository = null;
            codeData.githubBranch = null;
            codeData.githubPath = null;
        }
        // Récupération de la vidéo
        let videoInstance = await Video.getByVideoId(videoid);
        if(!videoInstance) throw Constants.Errors.VideoNotFound;
        codeData.VideoId = videoInstance.id;
        // On vérifie que l'utilisateur peut ajouter un code sur cette vidéo
        let canEditVideo = await userInstance.canEditVideo(videoInstance);
        if(!canEditVideo) throw Constants.Errors.CantEditRessource;
        // Vérification que le temps du code n'est pas supérieur au temps de la vidéo
        let isInRange = videoInstance.isCodeTimeInRange(codeData.time);
        if(!isInRange) throw Constants.Errors.CodeTimeOutOfRange;
        // On vérifie que le temps est disponible
        let timeFree = await videoInstance.isCodeTimeFree(codeData.time);
        if(!timeFree) throw Constants.Errors.CodeTimeAlreadyExists;
        // Création du code
        let newCode = await Code.create(codeData);
        // Envoi aux clients SocketIO
        Realtime.send({
            type: "ADD_CODE",
            user: userInstance,
            video: videoInstance
        });
        // ENDPOINT
        return h.response(await newCode.formatDisplay()).code(201);
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
            },
            payload: {
                title: Joi.string().allow('').max(255).required().description('Code title'),
                value: Joi.string().allow('').required().description('Code content'),
                mode: Joi.string().required().description('Code mode'),
                time: Joi.number().integer().min(0).required().description('Code time'),
                githubLink: Joi.string().regex(Constants.Regex.githubFile).allow('').required().description('Code GitHub file, raw file link')
            }
        },
        description: 'Create a code 🔒',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '201': {
                        description: 'Code created',
                        schema: Code.displaySchema
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.CodeTimeOutOfRange, Constants.Errors.CodeTimeAlreadyExists),
                    '403': Helpers.generateResponseErrorSchema(Constants.Errors.CantEditRessource),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.VideoNotFound),
                }
            }
        }
    }
})