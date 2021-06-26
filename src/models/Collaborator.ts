import * as Sequelize from 'sequelize';
import { VideoAttributes } from './Video';

export interface CollaboratorAttributes{
    VideoId?: VideoAttributes['id'];
    mail: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface CollaboratorInstance extends Sequelize.Instance<CollaboratorAttributes>, CollaboratorAttributes{

}

export function CollaboratorFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes): Sequelize.Model<CollaboratorInstance, CollaboratorAttributes>{
    const attributes: Sequelize.DefineModelAttributes<CollaboratorAttributes> = {
        VideoId: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        mail: {
            type: DataTypes.STRING(100),
            primaryKey: true
        }
    };

    const Collaborator = sequelize.define<CollaboratorInstance, CollaboratorAttributes>('Collaborator', attributes);
    return Collaborator;
}