import * as Hapi from 'hapi';
import { Client as ElasticSearchClient, IndicesPutMappingParams } from 'elasticsearch';

import { Server } from '../server';
import { DB_MIGRATION, ELASTIC_SEARCH_HOST, ELASTIC_SEARCH_PORT } from '../config';
import * as Constants from '../constants/';

export interface ElasticSearchPluginOptions{
    server: Server;
}

export type ElasticSearchPluginType = Hapi.Plugin<ElasticSearchPluginOptions>;
export const Plugin: ElasticSearchPluginType = {
    name: 'ElasticSearchPlugin',
    register: async function(server: Hapi.Server, options: ElasticSearchPluginOptions) {
        // Infos
        console.log('Configuring Elasticsearch...');

        // Création du client
        options.server.elasticSearch = new ElasticSearchClient({
            host: ELASTIC_SEARCH_HOST + ':' + ELASTIC_SEARCH_PORT,
            log: 'error'
        });
        const client = options.server.elasticSearch;

        // Test de connexion au serveur
        await client.ping({ requestTimeout: 1000 });

        // Fonction qui s'occupe de la création et du mapping d'un index
        async function createIndex(index: string, mapping: IndicesPutMappingParams, droppable: boolean = false){
            let indexExists = await client.indices.exists({ index });
            if(indexExists && droppable && DB_MIGRATION === 'DROP'){
                await client.indices.delete({ index });
            }
            if(!indexExists || (droppable && DB_MIGRATION === 'DROP')){
                await client.indices.create({ index });
                await client.indices.putMapping(mapping);
            }
        }

        // Enregistrement de la création des index
        let indexes: Promise<void>[] = [];

        // Index des vidéos (syncodeo / videos)
        indexes.push(createIndex(Constants.ElasticSearch.videos.index, {
            index: Constants.ElasticSearch.videos.index,
            type: Constants.ElasticSearch.videos.type,
            body: {
                properties: {
                    title: { type: 'text' },
                    description: { type: 'text' },
                    tags: { type: 'keyword' },
                    github: { type: 'keyword' },
                    difficulty: { type: 'keyword' },
                    language: { type: 'keyword' },
                    visibility: { type: 'keyword' },
                }
            }
        }, true));

        // Index des logs (syncodeo-logs / requests)
        indexes.push(createIndex(Constants.ElasticSearch.logs.index, {
            index: Constants.ElasticSearch.logs.index,
            type: Constants.ElasticSearch.logs.type,
            body: {
                properties: {
                    env: { type: 'keyword' },
                    timestamp: { type: 'date', format: 'epoch_millis' },
                    responseTime: { type: 'integer' },
                    method: { type: 'keyword' },
                    statusCode: { type: 'short' },
                    path: { type: 'text' },
                    route: { type: 'text' },
                    uuid: { type: 'text' },
                    headers: { type: 'text' },
                    params: { type: 'text' },
                    query: { type: 'text' },
                    payload: { type: 'text' },
                    responseData: { type: 'text' },
                    responseHeaders: { type: 'text' },
                    errorMessage: { type: 'text' },
                    errorStack: { type: 'text' }
                }
            }
        }));

        // Index des playlists (syncodeo-playlists / playlists)
        indexes.push(createIndex(Constants.ElasticSearch.playlists.index, {
            index: Constants.ElasticSearch.playlists.index,
            type: Constants.ElasticSearch.playlists.type,
            body: {
                properties: {
                    title: { type: 'text' },
                    description: { type: 'text' },
                    tags: { type: 'keyword' },
                    visibility: { type: 'keyword' },
                    language: { type: 'keyword' },
                    difficulty: { type: 'keyword' },
                    videosTitle: { type: 'text' },
                    videosDescription: { type: 'text' },
                    videosTags: { type: 'keyword' },
                    videosCount: { type: 'integer' }
                }
            }
        }, true));

        // Attente de l'enregistrement de tous les index
        await Promise.all(indexes);

        // Infos
        console.log('Elasticsearch ready!');
    }
}