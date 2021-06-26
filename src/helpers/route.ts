import * as Boom from 'boom';

import { server } from '../server';
import * as Constants from '../constants/';
import { ICreateRoute } from '../interfaces/route';
import { IRequestInternalError } from '../interfaces/request';

/**
 * Simplifie la création d'une route pour l'API
 * @param data Configuration de la route
 */
export function createRoute(data: ICreateRoute){
    // Création de la route
    server.route({
        method: data.method,
        path: data.path,
        handler: async function(request, h){
            try{
                // HANDLER
                return (await data.handler(request, h));
            }
            catch(error){
                // ERROR
                if(Boom.isBoom(error as Error)){ // PLANNED ERROR
                    throw error;
                }
                else if(error.message && (error.message as string).match(/deadlock/i)){ // MYSQL DEADLOCK ERROR
                    throw Constants.Errors.DeadlockError;
                }
                else{ // UNEXPECTED ERROR
                    (request as IRequestInternalError).internalErrorLog = {
                        message: (error as Error).message,
                        stack: (error as Error).stack || ''
                    };
                    throw Constants.Errors.InternalServerError;
                }
            }
        },
        options: data.options
    });
}

// --- DEFAULT --- //
export default {
    createRoute
}