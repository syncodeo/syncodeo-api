import * as Boom from 'boom';
import * as Hapi from 'hapi';
import * as Constants from '../constants/';
import { Policy, DecoratedPolicyOptions } from 'catbox';
import { ENV } from '../config';
import { getIP } from '../helpers';

export interface RateLimitRouteOptions{
    /**
     * Nombre de requête par période
     */
    limit: number;

    /**
     * Temps d'une période (en ms)
     */
    expiresIn: number;

    /**
     * Si renseigné, indique dans quel(s) envrironnement(s) activé le rate limit de cette route
     */
    env?: ('PROD'|'DEV'|'TEST')[]
}

export interface RateLimitPluginOptions{
    /**
     * Active la lecture d'IP depuis le header x-forwarded-by
     */
    proxy?: boolean
}

export type RateLimitPluginType = Hapi.Plugin<RateLimitPluginOptions>;
export const Plugin: RateLimitPluginType = {
    name: 'RateLimitPlugin',
    register: function(server: Hapi.Server, options: RateLimitPluginOptions){

        // Cache
        let cache = server.cache({
            segment: 'route-rate-limit',
            getDecoratedValue: true
        }) as Policy<number, DecoratedPolicyOptions<number>>;

        // Vérification du rate pour la route
        server.ext({
            type: 'onPostAuth',
            method: async (request, h) => {
                // Vérification que la route est tag en rate-limit
                if(!rateLimitEnabled(request)) return h.continue;

                // Vérification que le rate limit est activé pour cet environnement
                let routeOptions: RateLimitRouteOptions = request.route.settings.plugins['rate-limit'];

                // Récupération des données
                let IP = getIP(request, options.proxy);
                let method = request.method;
                let route = request.route.path;

                // Récupération du rate
                let cacheKey = `${route}:${method}:${IP}`;

                let cachedRate = await cache.get(cacheKey);
                let cachedRateValue = cachedRate.value || 0;

                // Détermination des nouvelles données du rate
                let count = cachedRateValue + 1;
                let ttl = cachedRate.cached ? cachedRate.cached.ttl : routeOptions.expiresIn;

                let remaining = routeOptions.limit - count;
                let reset = Date.now() + ttl;

                // Vérification de la situation du rate
                if(!cachedRate.value || cachedRateValue < routeOptions.limit){ // Rate OK
                    await cache.set(cacheKey, count, ttl);
                }
                else{
                    let error = Boom.tooManyRequests('Rate limit exceeded');
                    error.output.headers['X-RateLimit-Limit'] = String(routeOptions.limit);
                    error.output.headers['X-RateLimit-Remaining'] = String(0);
                    error.output.headers['X-RateLimit-Reset'] = String(reset);
                    return error;
                }

                // Ajout des données du rate limit dans le header de la requête pour les balancer dans la réponse après
                request.headers['X-RateLimit-Limit'] = String(routeOptions.limit);
                request.headers['X-RateLimit-Remaining'] = String(remaining);
                request.headers['X-RateLimit-Reset'] = String(reset);

                // ENDPOINT
                return h.continue;
            }
        });

        server.ext({
            type: 'onPreResponse',
            method: async (request, h) => {
                // Récupération de l'objet Response
                let response = request.response as Hapi.ResponseObject;

                // Vérification que la route est tag en rate-limit
                if(!rateLimitEnabled(request) || !response.headers) return h.continue;
                
                // Mise à jour des headers
                response.headers['X-RateLimit-Limit'] = request.headers['X-RateLimit-Limit'];
                response.headers['X-RateLimit-Remaining'] = request.headers['X-RateLimit-Remaining'];
                response.headers['X-RateLimit-Reset'] = request.headers['X-RateLimit-Reset'];

                // ENDPOINT
                return h.continue;
            }
        })
    }
}

function rateLimitEnabled(request: Hapi.Request){
    // Vérification si tag
    if(!request.route.settings || !request.route.settings.tags || !request.route.settings.tags.includes(Constants.RouteTags.RateLimit)) return false;
    // Vérification si env
    let routeOptions: RateLimitRouteOptions = request.route.settings.plugins['rate-limit'];
    if(routeOptions.env && !routeOptions.env.includes(ENV)) return false;
    // Ok
    return true;
}