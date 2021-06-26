import * as Hapi from 'hapi';
import * as Boom from 'boom';

/**
 * Plugin qui permet de mettre les data d'une erreur Boom dans le corps de la réponse Hapi
 * Non ce n'est pas natif et oui c'est dommage
 */

export const Plugin: Hapi.Plugin<{}> = {
    name: 'RequestErrorData',
    register: (server, options) => {
        server.ext('onPreResponse', (request, h) => {
            let response = request.response as Boom<any>;
            if(response.isBoom && response.data){
                response.output.payload = {
                    ...response.output.payload,
                    ...response.data
                };
            }
            return h.continue;
        });
    }
} as Hapi.Plugin<{}>