import * as Joi from 'joi';
import * as JWT from 'jsonwebtoken';

import * as Helpers from '../../helpers/';
import * as Constants from '../../constants/';
import { IRequest } from '../../interfaces/request';
import { REFRESH_TOKEN_SECRET, ACCESS_TOKEN_SECRET } from '../../config';
import { IRefreshTokenData } from '../../interfaces/auth';
import { User } from '../../models';

interface CustomRequest extends IRequest{
    payload: {
        refreshToken: string,
        device: string
    };
}

export default Helpers.route.createRoute({
    method: 'post',
    path: '/accounts/refresh',
    handler: async (request: CustomRequest, h) => {
        // Récupération du token
        let token = request.payload.refreshToken;
        // Vérification du token envoyé
        if(!Helpers.token.isRefreshTokenValid(token)) throw Constants.Errors.InvalidTokenPayload;
        // Récupération des données du token
        let tokenData = JWT.decode(token) as IRefreshTokenData;
        if(request.payload.device !== tokenData.device) throw Constants.Errors.InvalidTokenDevice
        // Récupération de l'utilisateur lié au token
        let userInstance = await User.getByUuid(tokenData.uuid);
        if(!userInstance) throw Constants.Errors.InvalidTokenUser;
        // Récupération de l'instance du refresh token
        let refreshTokenInstance = (await userInstance.getRefreshTokens({ where: {device: tokenData.device} }))[0];
        if(!refreshTokenInstance || refreshTokenInstance.token !== token) throw Constants.Errors.InvalidTokenInstance;
        // Mise à jour des tokens
        let accessToken = JWT.sign({ uuid: userInstance.uuid }, ACCESS_TOKEN_SECRET, { expiresIn: Constants.Token.accessTokenExpiration });
        let refreshToken = JWT.sign({ uuid: userInstance.uuid, device: tokenData.device }, REFRESH_TOKEN_SECRET, { expiresIn: Constants.Token.refreshTokenExpiration });
        // Mise à jour du refresh token pour l'utilisateur
        await refreshTokenInstance.update({ token: refreshToken });
        // ENDPOINT
        return {
            accessToken,
            refreshToken,
            accessTokenExpiresIn: Constants.Token.accessTokenExpiration
        }
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation
        ],
        description: 'Refresh tokens',
        validate: {
            payload: {
                refreshToken: Joi.string().required().description('User refresh token'),
                device: Joi.string().max(50).required().description('Device name')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Successful refresh',
                        schema: Joi.object({
                            accessToken: Joi.string().required().description('User access token, validity ' + Constants.Token.accessTokenExpiration + ' seconds'),
                            refreshToken: Joi.string().required().description('User refresh token, validity ' + Constants.Token.refreshTokenExpiration + ' seconds'),
                            accessTokenExpiresIn: Joi.number().required().description('Seconds before access token expiration (remove seconds to be sure token is renewed in time)')
                        }).label('Response')
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.InvalidTokenPayload, Constants.Errors.InvalidTokenDevice, Constants.Errors.InvalidTokenUser, Constants.Errors.InvalidTokenInstance)
                }
            }
        }
    }
});