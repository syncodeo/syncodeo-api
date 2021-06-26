import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import Realtime from '../../../../realtime';
import { Video, Code } from '../../../../models';

interface CustomRequest extends IRequest{
    params: {
        videoid: string,
        codeuuid: string
    };
    payload: {
        title?: string;
        value?: string;
        mode?: string;
        time?: number;
        githubLink?: string;
    };
}

export default Helpers.route.createRoute({
    method: 'put',
    path: '/videos/{videoid}/codes/{codeuuid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { videoid, codeuuid } = request.params;
        const userInstance = request.auth.user;
        // Récupération des données du nouveau code
        let codeData: any = {
            ...request.payload,
            ...(request.payload.hasOwnProperty('githubLink') ? Helpers.explodeGithubFile(request.payload.githubLink) : {})
        };
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
        // Récupération du code
        let codeInstance = await videoInstance.getCode(codeuuid);
        if(!codeInstance) throw Constants.Errors.CodeNotFound;
        // On vérifie que l'utilisateur peut ajouter un code sur cette vidéo
        let canEditVideo = await userInstance.canEditVideo(videoInstance);
        if(!canEditVideo) throw Constants.Errors.CantEditRessource;
        // Vérification que le temps est valide
        if(codeData.hasOwnProperty('time')){
            // Vérification que le temps du code est dans le temps de la vidéo
            let isInRange = videoInstance.isCodeTimeInRange(codeData.time);
            if(!isInRange) throw Constants.Errors.CodeTimeOutOfRange;
            // On vérifie que le temps est disponible
            let timeFree = await videoInstance.isCodeTimeFree(codeData.time, codeInstance);
            if(!timeFree) throw Constants.Errors.CodeTimeAlreadyExists;
        }
        // Modification du code
        await codeInstance.update(codeData);
        // Envoi aux clients SocketIO
        Realtime.send({
            type: "UPDATE_CODE",
            user: userInstance,
            video: videoInstance
        });
        // ENDPOINT
        return await codeInstance.formatDisplay();
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
                codeuuid: Joi.string().uuid().required().description('Code UUID')
            },
            payload: {
                title: Joi.string().allow('').max(255).description('Code title'),
                value: Joi.string().allow('').description('Code content'),
                mode: Joi.string().description('Code mode'),
                time: Joi.number().integer().min(0).description('Code time'),
                githubLink: Joi.string().regex(Constants.Regex.githubFile).allow('').description('Code GitHub file, raw file link'),
            }
        },
        description: 'Update a code 🔒',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Updated code',
                        schema: Code.displaySchema
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.CodeTimeOutOfRange, Constants.Errors.CodeTimeAlreadyExists),
                    '403': Helpers.generateResponseErrorSchema(Constants.Errors.CantEditRessource),
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound, Constants.Errors.VideoNotFound, Constants.Errors.CodeNotFound),
                }
            }
        }
    }
})