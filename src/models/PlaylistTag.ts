import * as Sequelize from 'sequelize';
import { PlaylistAttributes } from './Playlist';

export interface PlaylistTagAttributes{
    PlaylistId?: PlaylistAttributes['id'];
    value: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface PlaylistTagInstance extends Sequelize.Instance<PlaylistTagAttributes>, PlaylistTagAttributes{

}

export function PlaylistTagFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes): Sequelize.Model<PlaylistTagInstance, PlaylistTagAttributes>{
    const attributes: Sequelize.DefineModelAttributes<PlaylistTagAttributes> = {
        PlaylistId: { // Clé étrangère
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        value: {
            type: DataTypes.STRING(20),
            primaryKey: true
        }
    };

    const PlaylistTag = sequelize.define<PlaylistTagInstance, PlaylistTagAttributes>('PlaylistTag', attributes);
    return PlaylistTag;
}