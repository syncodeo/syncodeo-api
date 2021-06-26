import * as Prometheus from 'prom-client';
import * as Hapi from 'hapi';
import * as JWT from 'jsonwebtoken';

import { Server } from '../server';
import * as Constants from '../constants/';
import { IRequestInternalError } from '../interfaces/request';
import { IEventInternalError } from '../interfaces/events';
import { ENV } from '../config';

export interface MetricsedRequest extends IRequestInternalError{
    syncodeoMetrics: {
        routeAuthorized: boolean,
        startTime: number
    };
}

export interface MetricsPluginOptions{
    forbiddedRoutes: RegExp[];
    server: Server;
}

function errorToEmptyString(val: () => string){
    try{
        return val();
    }
    catch{
        return '';
    }
}

export type MetricsPluginType = Hapi.Plugin<MetricsPluginOptions>;
export const Plugin: MetricsPluginType = {
    name: 'MetricsPlugin',
    register: function(server: Hapi.Server, options: MetricsPluginOptions) {

        const requests = new Prometheus.Counter({
            name: 'syncodeo_api_requests_count',
            help: 'Syncodeo Requests Count',
            labelNames: ['method', 'path', 'statusCode']
        });

        const isRouteAuthorized = (request: MetricsedRequest) => {
            if(options.forbiddedRoutes instanceof Array){
                for(let regex of options.forbiddedRoutes){
                    if(request.path.match(regex)){
                        return false;
                    }
                }
            }
            return true;
        };

        server.ext('onRequest', (request: MetricsedRequest, h) => {
            let routeAuthorized = isRouteAuthorized(request);
            request.syncodeoMetrics = {
                routeAuthorized, // Permet déjà de savoir si la route est authorisée dans les metrics
                startTime: new Date().getTime() // Temps de début de requête
            }
            return h.continue;
        });

        server.events.on('response', (request: MetricsedRequest) => {
            if(request.route.path.match(/^\/swagger/)) return;
            // On récupère le temps de fin de requête
            const now = new Date();
            // Enregistrement de la requête dans Elasticsearch
            options.server.elasticSearch.index({
                index: 'syncodeo-logs',
                type: 'requests',
                body: {
                    env: ENV,
                    timestamp: now.getTime(),
                    responseTime: now.getTime() - request.syncodeoMetrics.startTime,
                    method: request.method,
                    statusCode: request.raw.res.statusCode,
                    path: request.url.path,
                    route: request.route.path,
                    uuid: (request.headers && request.headers.authorization) && errorToEmptyString(() => (JWT.decode(request.headers.authorization) as any).uuid),
                    headers: errorToEmptyString(() => JSON.stringify(request.headers)),
                    params: errorToEmptyString(() => JSON.stringify(request.params)),
                    query: errorToEmptyString(() => JSON.stringify(request.query)),
                    payload: errorToEmptyString(() => JSON.stringify(request.payload)),
                    responseData: errorToEmptyString(() => JSON.stringify((request.response as any).source)),
                    responseHeaders: errorToEmptyString(() => JSON.stringify((request.response as any).headers)),
                    errorMessage: request.internalErrorLog ? request.internalErrorLog.message : '',
                    errorStack: request.internalErrorLog ? request.internalErrorLog.stack : ''
                }
            }).catch((error) => console.log(error));
            // Enregistrement de la requête dans Prometheus
            if(request.syncodeoMetrics.routeAuthorized){
                let response = {
                    method: request.method,
                    path: request.route.path, // request.path renvoie l'url modifiée, donc pas bon (/api/abc/test au lieu de /api/{id}/{name} donc pas terrible pour regrouper :/)
                    statusCode: request.raw.res.statusCode
                };
                requests.inc(response, 1);
            }
            // Log discord si erreur 500
            if(request.internalErrorLog){
                options.server.eventEmitter.emit(Constants.Events.InternalError, { date: now, message: request.internalErrorLog.message, route: request.route.path } as IEventInternalError);
            }
        });

        // Enregistrement de Prometheus dans le serveur
        options.server.prometheus = Prometheus.register;

        // Enregistrement des metrics dans le serveur
        options.server.metrics = {
            youtubeApiV3Quotat: new Prometheus.Counter({
                name: 'syncodeo_api_youtube_api_v3_quotat',
                help: 'Syncodeo API Youtube API v3 Quotat',
                labelNames: ['type']
            }),
            usersCount: new Prometheus.Counter({
                name: 'syncodeo_api_users_count',
                help: 'Syncodeo API Users Count'
            }),
            videosCount: new Prometheus.Counter({
                name: 'syncodeo_api_videos_count',
                help: 'Syncodeo API Videos Count'
            }),
            searchesCount: new Prometheus.Counter({
                name: 'syncodeo_api_searches_count',
                help: 'Syncodeo API Searches Count'
            }),
            viewsCount: new Prometheus.Counter({
                name: 'syncodeo_api_views_count',
                help: 'Syncodeo API Views Count'
            }),
        };

        // Les counters avec label(s) commencent à 0
        options.server.metrics.youtubeApiV3Quotat.inc({type: 'video_duration'}, 0);
        options.server.metrics.youtubeApiV3Quotat.inc({type: 'video_data'}, 0);
        options.server.metrics.youtubeApiV3Quotat.inc({type: 'user_channel_info'}, 0);
        options.server.metrics.youtubeApiV3Quotat.inc({type: 'playlist_videos'}, 0);
    }
}