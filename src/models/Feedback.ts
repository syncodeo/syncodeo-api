import * as Sequelize from 'sequelize';

import { UserInstance, UserAttributes } from './User';
import { User } from '.';
import * as Constants from '../constants/';

export interface FeedbackAttributes{
    id?: number;
    type: string;
    page: string;
    message: string;

    UserId: UserAttributes['id'];
    creator?: UserInstance | UserAttributes;
    
    createdAt?: Date;
    updatedAt?: Date;
}

export interface FeedbackInstanceMethods{

}

export interface FeedbackInstance extends Sequelize.Instance<FeedbackAttributes>, FeedbackAttributes, FeedbackInstanceMethods{

}

interface FeedbackClassMethods{
    /**
     * Récupère les relations obligatoires de Feedback
     */
    includes: Sequelize.IncludeOptions[];
}

export interface FeedbackModel extends Sequelize.Model<FeedbackInstance, FeedbackAttributes>, FeedbackClassMethods{}

export function FeedbackFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes){
    // Attributs
    const attributes: Sequelize.DefineModelAttributes<FeedbackAttributes> = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        type: {
            type: DataTypes.ENUM(Constants.getFeedbackTypes())
        },
        page: {
            type: DataTypes.STRING(255)
        },
        message: {
            type: DataTypes.TEXT
        },
        UserId: {
            type: DataTypes.INTEGER
        }
    };

    const includes = [{
        model: User,
        as: 'creator'
    }];

    // Methodes de classe
    const classMethods: FeedbackClassMethods = {
        includes: includes
    }

    // Méthodes d'instance
    const instanceMethods: FeedbackInstanceMethods = {

    }

    // Création du modèle
    const Feedback: FeedbackModel = sequelize.define<FeedbackInstance, FeedbackAttributes>('Feedback', attributes) as FeedbackModel;

    // Associations
    Feedback.associate = () => {
        Feedback.belongsTo(User, {onDelete: 'cascade', as: 'creator', foreignKey: 'UserId'}); // Un feedback appartient à un utilisateur
    }

    // Ajout des méthodes de classe
    for(let classMethodName of Object.keys(classMethods)) Feedback[classMethodName] = classMethods[classMethodName];

    // @ts-ignore Ajout des méthodes d'instance
    for(let instanceMethodName of Object.keys(instanceMethods)) Feedback.prototype[instanceMethodName] = instanceMethods[instanceMethodName];

    // ENDPOINT
    return Feedback;
}