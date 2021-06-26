import * as Sequelize from 'sequelize';
import * as Joi from 'joi';

import * as Constants from '../constants/';
import { VideoAttributes } from './Video';
import { ICodeFormatDisplay } from '../interfaces/model';
import { Video } from '.';

export interface CodeAttributes{
    id?: number;
    uuid?: string;
    title: string;
    mode: string;
    value: string;
    time: number;

    githubUser: string;
    githubRepository: string;
    githubBranch: string;
    githubPath: string;

    VideoId: VideoAttributes['id'];

    createdAt?: Date;
    updatedAt?: Date;
}

interface CodeInstanceMethods{
    formatDisplay(): ICodeFormatDisplay;
}

export interface CodeInstance extends Sequelize.Instance<CodeAttributes>, CodeAttributes, CodeInstanceMethods{
    
}

interface CodeClassMethods{
    /**
     * Récupère le schéma de l'objet affichable
     */
    displaySchema: Joi.JoiObject;
}

export interface CodeModel extends Sequelize.Model<CodeInstance, CodeAttributes>, CodeClassMethods{}

export function CodeFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes){
    // Attributs
    const attributes: Sequelize.DefineModelAttributes<CodeAttributes> = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        title: {
            type: DataTypes.STRING(255)
        },
        mode: {
            type: DataTypes.STRING(30)
        },
        value: {
            type: DataTypes.TEXT('medium')
        },
        time: {
            type: DataTypes.INTEGER
        },
        githubUser: {
            type: DataTypes.STRING(255)
        },
        githubRepository: {
            type: DataTypes.STRING(255)
        },
        githubBranch: {
            type: DataTypes.STRING(255)
        },
        githubPath: {
            type: DataTypes.STRING(255)
        },
        VideoId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    };

    // Méthodes de classe
    const classMethods: CodeClassMethods = {
        displaySchema: Joi.object({
            uuid: Joi.string().required().description('Code identifier, UUID format'),
            title: Joi.string().required().description('Code title'),
            mode: Joi.string().required().description('Code language'),
            value: Joi.string().required().description('Code content (null if GitHub file linked)'),
            time: Joi.number().required().description('Code time'),
            github: Joi.object({
                user: Joi.string().required().description('User owner of the GitHub file linked (null if code value)'),
                repository: Joi.string().required().description('Repository of the GitHub file linked (null if code value)'),
                branch: Joi.string().required().description('Branch of the GitHub file linked (null if code value)'),
                path: Joi.string().required().description('Path of the GitHub file linked (null if code value)')
            }).required().label('Code GitHub schema')
        }).label('Code schema')
    }

    // Méthodes d'instance
    const instanceMethods: CodeInstanceMethods = {
        formatDisplay: function(){
            let code = (this as CodeInstance);
            return {
                uuid: code.uuid,
                title: code.title,
                mode: code.mode,
                value: code.value,
                time: code.time,
                github: {
                    user: code.githubUser,
                    repository: code.githubRepository,
                    branch: code.githubBranch,
                    path: code.githubPath
                }
            }
        }
    }

    // Création du modèle
    const Code: CodeModel = sequelize.define<CodeInstance, CodeAttributes>('Code', attributes, { classMethods, instanceMethods }) as CodeModel;

    // Definition des associations
    Code.associate = () => {
        Code.belongsTo(Video, {onDelete: 'cascade', as: 'video', foreignKey: 'VideoId'});
    }

    // Ajout des méthodes de classe
    for(let classMethodName of Object.keys(classMethods)) Code[classMethodName] = classMethods[classMethodName];

    // @ts-ignore Ajout des méthodes d'instance
    for(let instanceMethodName of Object.keys(instanceMethods)) Code.prototype[instanceMethodName] = instanceMethods[instanceMethodName];

    // ENDPOINT
    return Code;
}