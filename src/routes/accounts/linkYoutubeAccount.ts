import * as Joi from 'joi';
import * as JWT from 'jsonwebtoken';

import * as Constants from '../../constants/';
import * as Helpers from '../../helpers/';
import { IRequest } from '../../interfaces/request';
import { getUserChannel } from '../../helpers/youtube';
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';

interface CustomRequest extends IRequest{
    payload: {
        code: string
    };
}

const client = Helpers.oauth2client.getOAuth2Client();

export default Helpers.route.createRoute({
    method: 'post',
    path: '/accounts/linkYoutubeAccount',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const userInstance = request.auth.user;
        // On vérifie que le compte Youtube de l'utilisateur n'est pas déjà lié
        if(userInstance.channelId !== null && userInstance.channelId !== '') throw Constants.Errors.YoutubeAccountAlreadyLinked;
        // On vérifie le code
        let tokenResponse: GetTokenResponse;
        try{
            tokenResponse = await client.getToken(request.payload.code);
        }
        catch{
            throw Constants.Errors.InvalidCredentials;
        }
        // On vérifie que l'ID Google de l'utilisateur connecté est bien le même que celui du compte Youtube
        if(userInstance.googleId !== JWT.decode(tokenResponse.tokens.id_token).sub) throw Constants.Errors.NotOwner;
        // On indique que le client est l'utilisateur connecté
        client.setCredentials(tokenResponse.tokens);
        // On récupère l'ID de sa chaine Youtube
        let channels = await getUserChannel(client);
        if(!channels.items || channels.items.length === 0) throw Constants.Errors.YoutubeAccountRequired;
        // On met à jour l'utilisateur avec le token de rafraichissement
        await userInstance.update({
            credentials: JSON.stringify(client.credentials),
            channelId: channels.items[0].id,
            uploadsPlaylist: channels.items[0].contentDetails.relatedPlaylists.uploads
        });
        // ENDPOINT
        return {
            channelId: userInstance.channelId
        }
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation,
            Constants.RouteTags.CheckUser
        ],
        auth: 'jwt',
        description: 'Link Youtube account to Syncodeo 🔒',
        validate: {
            payload: {
                code: Joi.string().required().description('Google authentification code')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Successful link',
                        schema: Joi.object({
                            channelId: Joi.string().required().description('User channel ID')
                        }).required().label('Response')
                    },
                    '400': Helpers.generateResponseErrorSchema(Constants.Errors.InvalidCredentials)
                }
            }
        }
    }
});