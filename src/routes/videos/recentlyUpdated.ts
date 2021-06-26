import * as Joi from 'joi';

import * as Helpers from '../../helpers/';
import * as Cache from '../../cache/';
import * as Constants from '../../constants/';
import { IRequest } from '../../interfaces/request';
import { sequelize, Video, Code } from '../../models';
import { ENV } from '../../config';

export default Helpers.route.createRoute({
    method: 'get',
    path: '/videos/recentlyUpdated',
    handler: async (request: IRequest, h) => {
        // Récupération des vidéos mises à jour récemment depuis le cache
        let cachedVideoIds = (await Cache.recentlyUpdatedVideos.get('')) as string[];
        let videoIds: string[] = [];
        if(!cachedVideoIds || ENV === 'TEST'){
            // Sinon récupération des dernières vidéos mises à jour depuis la base de données
            let recentlyUpdatedVideos = await sequelize.query(`
                SELECT DISTINCT v.videoId, GREATEST(IFNULL(MAX(c.updatedAt), 0), v.updatedAt) AS lastUpdate
                FROM ${Video.getTableName()} AS v
                LEFT JOIN ${Code.getTableName()} AS c ON c.VideoId = v.id
                WHERE v.visibility = '${Constants.Visibility.public}'
                GROUP BY v.id
                ORDER BY lastUpdate DESC
                LIMIT 10
            `, { type: sequelize.QueryTypes.SELECT });
            // Formattage des UUIDs des vidéos dans un tableau
            videoIds = recentlyUpdatedVideos.map(row => row.videoId);
            // Ajout des uuids dans le cache
            await Cache.recentlyUpdatedVideos.set('', videoIds);
        }
        else{
            videoIds = cachedVideoIds;
        }
        // Récupération des données des vidéos depuis la base de données
        let videos = await Video.findAll({ where: { videoId: {[sequelize.Op.in]: videoIds} }, include: Video.includes });
        // Formattage des vidéos pour l'affichage (dans l'ordre c'est mieux)
        let formattedVideos = videos.map(video => video.formatDisplay());
        formattedVideos.sort((v1, v2) => videoIds.indexOf(v1.videoId) - videoIds.indexOf(v2.videoId));
        return formattedVideos;
    },
    options: {
        tags: [
            Constants.RouteTags.Documentation
        ],
        description: 'Get the last 10 updated videos',
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Recently updated videos',
                        schema: Joi.array().items(Video.displaySchema).required().label('Response')
                    }
                }
            },
        }
    }
})