import * as Joi from 'joi';
import * as JWT from 'jsonwebtoken';

import { User, RefreshToken } from '../../models/';
import * as Helpers from '../../helpers/';
import * as Constants from '../../constants/';
import { IRequest } from '../../interfaces/request';
import { UserAttributes } from '../../models/User';
import { GOOGLE_CLIENT_ID, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from '../../config';
import { server } from '../../server';
import { IEventNewUser } from '../../interfaces/events';
import { LoginTicket } from 'google-auth-library/build/src/auth/loginticket';

interface CustomRequest extends IRequest{
    payload: {
        token: string;
        device: string;
    }
}

const client = Helpers.oauth2client.getOAuth2Client();

export default Helpers.route.createRoute({
    method: 'post',
    path: '/accounts/login',
    handler: async (request: CustomRequest, h) => {
        // Vérification du token
        let ticket: LoginTicket;
        try{
            ticket = await client.verifyIdToken({ idToken: request.payload.token, audience: GOOGLE_CLIENT_ID });
        }
        catch{
            throw Constants.Errors.InvalidCredentials;
        }
        // Récupération du client
        const payload = ticket.getPayload();
        const resultUser: UserAttributes = {
            googleId: payload.sub,
            picture: payload.picture,
            mail: payload.email,
            name: payload.name,
            credentials: null,
            channelId: null,
            uploadsPlaylist: null
        }
        // On regarde si le client existe déjà
        let userInstance = await User.findOne({ where: {googleId: resultUser.googleId} });
        if(userInstance){
            await userInstance.update({ picture: resultUser.picture, mail: resultUser.mail, name: resultUser.name });
        }
        else{
            userInstance = await User.create(resultUser);
            server.eventEmitter.emit(Constants.Events.NewUser, { date: new Date(), name: resultUser.name } as IEventNewUser);
            server.metrics.usersCount.inc();
        }
        // Création des tokens
        let accessToken = JWT.sign({uuid: userInstance.uuid}, ACCESS_TOKEN_SECRET, { expiresIn: Constants.Token.accessTokenExpiration });
        let refreshToken = JWT.sign({uuid: userInstance.uuid, device: request.payload.device}, REFRESH_TOKEN_SECRET, { expiresIn: Constants.Token.refreshTokenExpiration });
        // Ajout du refresh token dans la BDD
        await RefreshToken.upsert({token: refreshToken, device: request.payload.device, UserId: userInstance.id});
        // ENDPOINT
        return {
            uuid: userInstance.uuid,
            accessToken,
            refreshToken,
            accessTokenExpiresIn: Constants.Token.accessTokenExpiration,
            linked: await userInstance.haveLinkedYoutubeAccount()
        };
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation
        ],
        description: 'Login (new or existing user)',
        validate: {
            payload: {
                token: Joi.string().required().description('User Google Token'),
                device: Joi.string().max(50).required().description('Device name')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Successful login',
                        schema: Joi.object({
                            uuid: Joi.string().required().description('User UUID'),
                            accessToken: Joi.string().required().description('User access token, validity ' + Constants.Token.accessTokenExpiration + ' seconds'),
                            refreshToken: Joi.string().required().description('User refresh token, validity ' + Constants.Token.refreshTokenExpiration + ' seconds'),
                            accessTokenExpiresIn: Joi.number().required().description('Seconds before access token expiration (remove seconds to be sure token is renewed in time)'),
                            linked: Joi.boolean().required().description('Is user YouTube account linked')
                        }).label('Response')
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.InvalidCredentials)
                }
            }
        }
    }
});