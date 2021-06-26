import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import { Video, Code } from '../../../../models';

interface CustomRequest extends IRequest{
    params: {
        videoid: string,
        codeuuid: string
    };
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/videos/{videoid}/codes/{codeuuid}',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { videoid, codeuuid } = request.params;
        const userInstance = request.auth.user;
        // Récupération de la vidéo
        let videoInstance = await Video.getByVideoId(videoid);
        let canUserEditVideo = userInstance && await userInstance.canEditVideo(videoInstance);
        if(!videoInstance || (!canUserEditVideo && videoInstance.visibility === Constants.Visibility.private)) throw Constants.Errors.VideoNotFound;
        // Récupération du code
        let code = await videoInstance.getCode(codeuuid);
        if(!code) throw Constants.Errors.CodeNotFound;
        // ENDPOINT
        return await code.formatDisplay();
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        validate: {
            params: {
                videoid: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Youtube video ID'),
                codeuuid: Joi.string().uuid().required().description('Code UUID')
            }
        },
        description: 'Specific code data (🔒)',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Specific code',
                        schema: Code.displaySchema
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.VideoNotFound, Constants.Errors.CodeNotFound),
                }
            }
        }
    }
})