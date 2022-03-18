import * as fs from 'fs';
import * as Hapi from 'hapi';
import * as Boom from 'boom';
import * as Joi from 'joi';
import * as EventEmitter from 'events';
import { Client as ElasticSearchClient } from 'elasticsearch';

import { Plugin as MetricsPlugin, MetricsPluginType, MetricsPluginOptions } from './plugins/metrics';
import { Plugin as DiscordPlugin, DiscordPluginType, DiscordPluginOptions } from './plugins/discord';
import { Plugin as RateLimitPlugin, RateLimitPluginType, RateLimitPluginOptions } from './plugins/rate-limit';
import { Plugin as ElasticSearchPlugin, ElasticSearchPluginType, ElasticSearchPluginOptions } from './plugins/elasticsearch';
import { Plugin as RequestErrorDataPlugin } from './plugins/request-error-data';
import { Plugin as CheckConnectedUserPlugin } from './plugins/check-connected-user';
import { IJwtUser } from './interfaces/auth';
import { checkConnection, migration } from './models/';
import { Registry, collectDefaultMetrics, Counter } from 'prom-client';
import { SERVER_HOST, SERVER_PORT, REDIS_HOST, ACCESS_TOKEN_SECRET, DB_MIGRATION, HTTPS_ENABLED, HTTPS_CERT, HTTPS_KEY, SECRET_ROUTE_PASSWORD, SECRET_ROUTE_USERNAME, PROXY, ENV, REDIS_PORT } from './config';
import { startIOServer } from './realtime/';
import * as Constants from './constants/';

export class Server extends Hapi.Server{

    elasticSearch: ElasticSearchClient;
    prometheus: Registry;
    metrics: {
        youtubeApiV3Quotat: Counter;
        usersCount: Counter;
        videosCount: Counter;
        searchesCount: Counter;
        viewsCount: Counter;
    }
    eventEmitter: EventEmitter.EventEmitter;

    constructor(options: Hapi.ServerOptions){
        super(options);
        this.eventEmitter = new EventEmitter.EventEmitter();
    }
}

export const server = new Server({
    host: SERVER_HOST,
    port: SERVER_PORT,
    cache: [{
        engine: require('catbox-redis'),
        host: REDIS_HOST,
        port: REDIS_PORT,
        partition: 'cache'
    }],
    debug: {
        request: ['error']
    },
    routes: {
        cors: {
            origin: ['*']
        },
        auth: false,
        validate: {
            failAction: (request, h, err) => {
                let validationError = err as Joi.ValidationError;
                if(validationError.isJoi){
                    let source: 'params'|'query'|'payload' = ((err as Boom).output.payload as any).validation.source;
                    let sourceError = source === 'params' ? Constants.Errors.InvalidRequestParams : (source === 'query' ? Constants.Errors.InvalidRequestQuery : Constants.Errors.InvalidRequestPayload);
                    let error = Boom.badRequest(sourceError.message, { code: sourceError.data.code, inputs: validationError.details.map(d => d.context.key).filter(d => d) });
                    throw error;
                }
                else{
                    throw err;
                }
            }
        }
    },
    ...(
        HTTPS_ENABLED ? { 
            tls: {
                key: fs.readFileSync(HTTPS_KEY),
                cert: fs.readFileSync(HTTPS_CERT)
            }
        } : {}
    )
});

const plugins: Hapi.Plugin<any>[] = [
    // Authentification
    require('hapi-auth-jwt2'),
    require('hapi-auth-basic'),
    // Swagger
    require('inert'),
    require('vision'),
    {
        plugin: require('hapi-swagger'),
        options: {
            // Infos
            info: {
                title: 'API Documentation',
                description: `
                    - Routes with 🔒 require JWT authentification.
                    - (🔒) means that you can send JWT token for account dependent data but optionnal.
                    - Multiple error messages and codes are separated with "|".
                    - Errors code are displayed at /v1/documentation/errors.
                `
            },
            // Groupe les requêtes en omettant la partie /api/v1
            basePath: '/v1',
            pathPrefixSize: 2,
            // Change l'URL de la documentation
            documentationPath: '/v1/documentation',
            // Affichage de l'input du token
            securityDefinitions: {
                'jwt': {
                    'type': 'apiKey',
                    'name': 'Authorization',
                    'in': 'header'
                }
            },
            security: [{ 'jwt': [] }],
            // Caching swagger.json
            cache: {
                expiresIn: ENV === 'PROD' ? 1000 * 60 * 60 : 1000
            }
        }
    },
    // Elasticsearch
    {
        plugin: ElasticSearchPlugin as ElasticSearchPluginType,
        options: {
            server: server
        } as ElasticSearchPluginOptions
    },
    // Metrics
    {
        plugin: MetricsPlugin as MetricsPluginType,
        options: {
            forbiddedRoutes: [
                /^\/swagger/
            ],
            server: server
        } as MetricsPluginOptions
    },
    // Rate limit
    {
        plugin: RateLimitPlugin as RateLimitPluginType,
        options: { proxy: PROXY } as RateLimitPluginOptions
    },
    // Request Error Data
    RequestErrorDataPlugin,
    // PreRequest auth operations
    CheckConnectedUserPlugin
];

function setAllRoutes(dir: string){
    for(let result of fs.readdirSync(dir)){
        let file = dir + '/' + result;
        let stat = fs.statSync(file);
        if(stat.isDirectory()){
            setAllRoutes(file);
        }
        else{
            require(file).default;
        }
    }
}

export async function startServer(){
    try{
        // Ajout des plugins
        await server.register(plugins);
        server.register({
            plugin: DiscordPlugin as DiscordPluginType,
            options: { server: server } as DiscordPluginOptions
        });
        // Activation de Prometheus
        collectDefaultMetrics();
        // Activation du Realtime
        await startIOServer();
        // Authentification
        server.auth.strategy('jwt', 'jwt', {
            key: ACCESS_TOKEN_SECRET,
            validate: async (decoded: IJwtUser) => { return {isValid: decoded.uuid}  } // Jeton valide si il contient bien le paramètre uuid (https://github.com/dwyl/hapi-auth-jwt2)
        });
        server.auth.strategy('basic', 'basic', { 
            validate: (request, username, password, h) => { 
                return { isValid: (username === SECRET_ROUTE_USERNAME && password === SECRET_ROUTE_PASSWORD), credentials: {} }; 
            }
        });
        // Configuration des routes
        server.realm.modifiers.route.prefix = '/v1';
        setAllRoutes(__dirname + '/routes');
        // Configuration des modèles (Sequelize)
        await checkConnection();
        if(DB_MIGRATION === 'DROP')
            await migration.drop();
        // Démarrage du serveur
        await server.start();
        console.log('Server started at ' + server.info.uri + ' !');
    }
    catch(error){
        console.log('Can\'t start server :');
        console.log(error);
        process.exit(1);
    }
}