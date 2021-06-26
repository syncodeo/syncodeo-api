import * as Hapi from 'hapi';
import * as Helpers from '../helpers/';
import * as Constants from '../constants/';
import { IRequest } from '../interfaces/request';
import { User } from '../models';

export const Plugin: Hapi.Plugin<{}> = {
    name: 'CheckConnectedUser',
    register: async (server, options) => {
        server.ext('onPreHandler', async (request: IRequest, h) => {
            // Si besoin de récupérer l'utilisateur
            if(request.route.settings.tags && request.route.settings.tags.includes(Constants.RouteTags.CheckUser)){
                // Si l'utilisateur est forcément présent
                if(request.route.settings.auth && (request.route.settings.auth as Hapi.RouteOptionsAccess).strategies.includes('jwt')){
                    request.auth.user = await User.getByUuid(request.auth.credentials.uuid);
                    if(!request.auth.user) throw Constants.Errors.UserNotFound;
                }
                // Si l'utilisateur est optionnel sur la route
                else if(request.route.settings.auth === false){
                    request.auth.user = await Helpers.getUserFromOptionnalAuth(request);
                }
            }

            // Si besoin de vérifier que le compte Youtube de l'utilisateur est lié à son compte Syncodeo
            if(request.auth.user && request.route.settings.tags.includes(Constants.RouteTags.CheckYoutube)){
                let haveUserLinkedYoutubeAccount = await request.auth.user.haveLinkedYoutubeAccount();
                if(!haveUserLinkedYoutubeAccount) throw Constants.Errors.YoutubeAccountNeedToBeLinked;
            }

            // Sinon continue la route
            return h.continue;
        });
    }
}