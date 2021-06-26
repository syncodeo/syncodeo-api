import * as Sequelize from 'sequelize';
import { VideoAttributes } from './Video';

export interface TagAttributes{
    VideoId?: VideoAttributes['id'];
    value: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface TagInstance extends Sequelize.Instance<TagAttributes>, TagAttributes{

}

export function TagFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes): Sequelize.Model<TagInstance, TagAttributes>{
    const attributes: Sequelize.DefineModelAttributes<TagAttributes> = {
        VideoId: { // Clé étrangère
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        value: {
            type: DataTypes.STRING(20),
            primaryKey: true
        }
    };

    const Tag = sequelize.define<TagInstance, TagAttributes>('Tag', attributes);
    return Tag;
}