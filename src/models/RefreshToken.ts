import * as Sequelize from 'sequelize';
import { UserAttributes } from './User';

export interface RefreshTokenAttributes{
    UserId?: UserAttributes['id'];
    device: string;

    token: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface RefreshTokenInstance extends Sequelize.Instance<RefreshTokenAttributes>, RefreshTokenAttributes{

}

export function RefreshTokenFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes): Sequelize.Model<RefreshTokenInstance, RefreshTokenAttributes>{
    const attributes: Sequelize.DefineModelAttributes<RefreshTokenAttributes> = {
        UserId: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        device: {
            type: DataTypes.STRING(50),
            primaryKey: true
        },
        token: {
            type: DataTypes.STRING(255)
        }
    };

    const RefreshToken = sequelize.define<RefreshTokenInstance, RefreshTokenAttributes>('RefreshToken', attributes);
    return RefreshToken;
}