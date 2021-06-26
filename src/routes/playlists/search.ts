import * as Joi from 'joi';

import * as Helpers from '../../helpers';
import * as Constants from '../../constants/';
import { IRequest } from '../../interfaces/request';
import { server } from '../../server';
import { IPlaylistElasticSearch } from '../../interfaces/model';
import { Playlist, sequelize } from '../../models';

interface CustomRequest extends IRequest{
    query: {
        query: string;
        page: string;
        difficulty: string[];
        language: string[];
    }
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/playlists/search',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const { query, difficulty, language } = request.query;
        // Récupération de la pagination
        let page = parseInt(request.query.page);
        // Configuration des filtres
        let filters = [];
        if(difficulty && difficulty.length > 0) filters.push({ terms: {difficulty} });
        if(language && language.length > 0) filters.push({ terms: {language} });
        // Recherche
        let results = await server.elasticSearch.search<IPlaylistElasticSearch>({
            index: Constants.ElasticSearch.playlists.index,
            type: Constants.ElasticSearch.playlists.type,
            body: {
                query: {
                    bool: {
                        must: {
                            multi_match: {
                                query: query,
                                type: "most_fields",
                                fields: ['title^10', 'description^5', 'tags^10', 'videosTitle^3', 'videosDescription', 'videosTags^3'],
                                fuzziness: 'AUTO'
                            }
                        },
                        filter: [{
                            term: {
                                visibility: Constants.Visibility.public
                            }
                        }, {
                            range: {
                                videosCount: {
                                    gt: 0
                                }
                            }
                        }, ...filters],
                    }
                }
            },
            from: (page - 1) * 10,
            size: 11
        });
        // Metrics
        server.metrics.searchesCount.inc();
        // Récupération des playlists concernées
        let uuids = results.hits.hits.slice(0, 10).map(hit => hit._id);
        let playlists = await Playlist.findAll({ where: { uuid: {[sequelize.Op.in]: uuids} }, include: Playlist.includes });
        playlists = playlists.sort((p1, p2) => uuids.indexOf(p1.uuid) - uuids.indexOf(p2.uuid));
        // ENDPOINT
        return {
            results: playlists.map(playlist => playlist.formatDisplay()),
            nextPage: (results.hits.hits.length === 11 ? (page + 1) : null)
        };
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation
        ],
        description: 'Search playlists',
        validate: {
            query: {
                query: Joi.string().required().description('Search query'),
                page: Joi.number().integer().min(1).default(1).description('Search page'),
                difficulty: Joi.array().items(Joi.string().valid(Constants.getDifficultyValues())).default([]).description('Playlist difficulty-ies'),
                language: Joi.array().items(Joi.string().valid(Constants.getLocalizationValues())).default([]).description('Playlist language-s')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Search playlists result',
                        schema: Joi.object({
                            results: Joi.array().items(Playlist.displaySchema).label('Playlists').required().description('Results of the search'),
                            nextPage: Joi.number().integer().required().description('Value of the next page, null if last page reached')
                        }) .label('Response')
                    }
                }
            },
        }
    }
});