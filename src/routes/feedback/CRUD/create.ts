import * as Joi from 'joi';

import * as Helpers from '../../../helpers/';
import * as Constants from '../../../constants/';
import { IRequest } from '../../../interfaces/request';
import { IEventFeedback } from '../../../interfaces/events';
import { server } from '../../../server';
import { RateLimitRouteOptions } from '../../../plugins/rate-limit';
import { User, Feedback } from '../../../models';

interface CustomRequest extends IRequest{
    payload: {
        page: string,
        type: 'message' | 'bug' | 'feature' | 'improvement',
        message: string
    }
}

export default Helpers.route.createRoute({
    method: "post",
    path: '/feedback',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        let payload = request.payload;
        const userInstance = request.auth.user;
        // Création du feedback
        let feedback: IEventFeedback = {
            date: new Date(),
            message: payload.message,
            page: payload.page,
            user: userInstance
        };
        // On distribue le Feedback en fonction de son type
        switch(request.payload.type){
            case 'message':
                server.eventEmitter.emit(Constants.Events.FeedbackMessage, feedback);
                break;
            case 'bug':
                server.eventEmitter.emit(Constants.Events.FeedbackBug, feedback);
                break;
            case 'improvement':
                server.eventEmitter.emit(Constants.Events.FeedbackImprovement, feedback);
                break;
            case 'feature':
                server.eventEmitter.emit(Constants.Events.FeedbackFeature, feedback);
                break;
        }
        // On l'enregistre dans la BDD
        await Feedback.create({
            ...request.payload,
            UserId: userInstance.id
        });
        // ENDPOINT
        return h.response().code(204);
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.RateLimit,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        validate: {
            payload: {
                page: Joi.string().max(256).required().description('Feedback page origin, max 256 characters'),
                type: Joi.string().valid(Constants.getFeedbackTypes()).required().description('Feedback type, can be message, bug, feature or improvement'),
                message: Joi.string().max(2048).required().description('Feedback message, max 2048 characters')
            }
        },
        description: 'Send direct message 🔒',
        plugins: {
            'rate-limit': { // 3 toutes les 10 secondes
                expiresIn: 1000 * 10,
                limit: 3,
                env: ['PROD']
            } as RateLimitRouteOptions,
            'hapi-swagger': {
                responses: {
                    '204': {
                        description: 'Feedback successfully sent'
                    },
                    '404': Helpers.generateResponseErrorSchema(Constants.Errors.UserNotFound),
                }
            }
        }
    }
});