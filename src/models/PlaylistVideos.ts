import * as Sequelize from 'sequelize';

import { VideoAttributes } from './Video';
import { PlaylistAttributes } from './Playlist';

export interface PlaylistVideosAttributes{
    PlaylistId?: PlaylistAttributes['id'];
    VideoId?: VideoAttributes['id'];

    rank: number;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface PlaylistVideosInstance extends Sequelize.Instance<PlaylistVideosAttributes>, PlaylistVideosAttributes{
    
}

export interface PlaylistVideosModel extends Sequelize.Model<PlaylistVideosInstance, PlaylistVideosAttributes> {}

export function PlaylistVideosFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes){
    // Attributs
    const attributes: Sequelize.DefineModelAttributes<PlaylistVideosAttributes> = {
        PlaylistId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        VideoId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        rank: {
            type: DataTypes.INTEGER
        }
    };

    // Index
    const indexes: Sequelize.DefineIndexesOptions[] = [{
        fields: ['PlaylistId', 'VideoId'],
        unique: true
    }];

    // Création du modèle
    const PlaylistVideos: PlaylistVideosModel = sequelize.define<PlaylistVideosInstance, PlaylistVideosAttributes>('PlaylistVideos', attributes, { indexes }) as PlaylistVideosModel;

    // ENDPOINT
    return PlaylistVideos;
}