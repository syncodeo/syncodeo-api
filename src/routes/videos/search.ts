import * as Joi from 'joi';

import * as Helpers from '../../helpers';
import * as Constants from '../../constants/';
import { IRequest } from '../../interfaces/request';
import { server } from '../../server';
import { IVideoElasticSearch } from '../../interfaces/model';
import { Video, sequelize } from '../../models';

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
    path: '/videos/search',
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
        let results = await server.elasticSearch.search<IVideoElasticSearch>({
            index: 'syncodeo',
            type: 'videos',
            body: {
                query: {
                    bool: {
                        must: {
                            multi_match: {
                                query: query,
                                type: "most_fields",
                                fields: ['title^3', 'description', 'github', 'tags^3'],
                                fuzziness: 'AUTO'
                            }
                        },
                        filter: [{
                            term: {
                                visibility: Constants.Visibility.public
                            }
                        }, ...filters]
                    }
                }
            },
            from: (page - 1) * 10,
            size: 11
        });
        // Metrics
        server.metrics.searchesCount.inc();
        // Récupération des videos
        let ids = results.hits.hits.slice(0, 10).map(hit => hit._id);
        let videos = await Video.findAll({ where: { videoId: {[sequelize.Op.in]: ids} }, include: Video.includes });
        videos = videos.sort((v1, v2) => ids.indexOf(v1.videoId) - ids.indexOf(v2.videoId));
        // ENDPOINT
        return {
            results: videos.map(video => video.formatDisplay()),
            nextPage: (results.hits.hits.length === 11 ? (page + 1) : null)
        };
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation
        ],
        description: 'Search videos',
        validate: {
            query: {
                query: Joi.string().required().description('Search query'),
                page: Joi.number().integer().min(1).default(1).description('Search page'),
                difficulty: Joi.array().items(Joi.string().valid(Constants.getDifficultyValues())).default([]).description('Video difficulty'),
                language: Joi.array().items(Joi.string().valid(Constants.getLocalizationValues())).default([]).description('Video language')
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Search videos result',
                        schema: Joi.object({
                            results: Joi.array().items(Video.displaySchema).required().label('Videos').description('Results of the search'),
                            nextPage: Joi.number().integer().required().description('Value of the next page, null if last page reached')
                        }).label('Response')
                    }
                }
            },
        }
    }
});