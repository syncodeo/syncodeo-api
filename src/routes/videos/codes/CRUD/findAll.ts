import * as Joi from 'joi';

import * as Helpers from '../../../../helpers/';
import * as Constants from '../../../../constants/';
import { IRequest } from '../../../../interfaces/request';
import { Video, Code } from '../../../../models';

interface CustomRequest extends IRequest{
    params: {
        videoid: string
    };
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/videos/{videoid}/codes',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { videoid } = request.params;
        const userInstance = request.auth.user;
        // Récupération de la vidéo
        let videoInstance = await Video.getByVideoId(videoid);
        let canUserEditVideo = userInstance && await userInstance.canEditVideo(videoInstance);
        if(!videoInstance || (!canUserEditVideo && videoInstance.visibility === Constants.Visibility.private)) throw Constants.Errors.VideoNotFound;
        // Récupération des codes
        let codes = await videoInstance.getAllCodes();
        return await Promise.all(codes.map(code => code.formatDisplay()));
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        validate: {
            params: {
                videoid: Joi.string().regex(Constants.Regex.youtubeVideoId).required().description('Youtube video ID')
            }
        },
        description: 'List video\'s codes (🔒)',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Video\'s codes sorted in time order',
                        schema: Joi.array().items(Code.displaySchema).label('Response')
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.VideoNotFound),
                }
            }
        }
    }
})