import * as Sequelize from 'sequelize';
import * as Joi from 'joi';

import { Video, RefreshToken, Collaborator, Tag, Playlist } from './';
import { VideoAttributes, VideoInstance } from './Video';
import { RefreshTokenAttributes, RefreshTokenInstance } from './RefreshToken';
import { PlaylistInstance } from './Playlist';
import { IUserFormatDisplay } from '../interfaces/model';
import { CollaboratorInstance } from './Collaborator';

export interface UserAttributes{
    id?: number;
    uuid?: string;
    googleId: string;
    mail: string;
    picture: string;
    name: string;
    credentials: string;
    channelId: string;
    uploadsPlaylist: string;

    videos?: VideoAttributes[];
    refreshTokens?: RefreshTokenInstance[] | RefreshTokenAttributes[];

    createdAt?: Date;
    updatedAt?: Date;
}

interface UserInstanceMethods{
    /**
     * Indique si un utilisateur est le propriétaire de la vidéo
     * @param video Référence de la vidéo
     */
    isOwnerOfVideo(video: VideoInstance): boolean;
    /**
     * Indique si un utilisateur a le droit de modifier la vidéo (si propriétaire ou collaborateur)
     * @param video Référence de la vidéo
     */
    canEditVideo(video: VideoInstance): boolean;
    /**
     * Indique si l'utilisateur a lié son compte Youtube
     */
    haveLinkedYoutubeAccount(): boolean;
    /**
     * Liste les vidéos où l'utilisateur est collaborateur
     */
    getAllowedVideos(): Promise<VideoInstance[]>;
    /**
     * Récupère l'instance d'une playlist d'un utilisateur
     * @param uuid UUID de la playlist
     */
    getPlaylist(uuid: string): Promise<PlaylistInstance>;
    /**
     * Transforme l'instance en objet affichable
     */
    formatDisplay(): IUserFormatDisplay;
}

export interface UserInstance extends Sequelize.Instance<UserAttributes>, UserAttributes, UserInstanceMethods{
    getVideos: Sequelize.HasManyGetAssociationsMixin<VideoInstance>;
    getRefreshTokens: Sequelize.HasManyGetAssociationsMixin<RefreshTokenInstance>;
    getPlaylists: Sequelize.HasManyGetAssociationsMixin<PlaylistInstance>;
}

interface UserClassMethods{
    /**
     * Retourne l'instance d'un utilisateur en fonction de son UUID
     * @param uuid UUID de l'utilisateur
     */
    getByUuid(uuid: string): Promise<UserInstance>;
    /**
     * Récupère le schéma de l'objet affichable
     */
    displaySchema: Joi.JoiObject;
    /**
     * Récupère les relations obligatoires de User
     */
    includes: Sequelize.IncludeOptions[];
}

export interface UserModel extends Sequelize.Model<UserInstance, UserAttributes>, UserClassMethods{}

export function UserFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes){
    // Attributs
    const attributes: Sequelize.DefineModelAttributes<UserAttributes> = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        googleId: {
            type: DataTypes.STRING(255)
        },
        mail: {
            type: DataTypes.STRING(100)
        },
        picture: {
            type: DataTypes.STRING(255)
        },
        name: {
            type: DataTypes.STRING(255)
        },
        credentials: {
            type: DataTypes.TEXT
        },
        channelId: {
            type: DataTypes.STRING(255)
        },
        uploadsPlaylist: {
            type: DataTypes.STRING(255)
        }
    };

    const includes = [{
        model: RefreshToken,
        as: 'refreshTokens'
    }];

    // Méthodes de classe
    const classMethods: UserClassMethods = {
        getByUuid: async (uuid: string) => {
            return await User.findOne({ where: {uuid}, include: includes });
        },
        displaySchema: Joi.object({
            uuid: Joi.string().required().description('User UUID'),
            name: Joi.string().required().description('User name'),
            picture: Joi.string().required().description('User picture URL'),
            channelId: Joi.string().required().description('User Youtube channel ID, null if Youtube account not linked'),
        }).label('User schema'),
        includes: includes
    }

    // Méthodes d'instance
    const instanceMethods: UserInstanceMethods = {
        isOwnerOfVideo: function(video: VideoInstance){
            return video.UserId === (this as UserInstance).id;
        },
        canEditVideo: function(video: VideoInstance){
            // On regarde si l'utilisateur a le droit de modifier la vidéo (propriétaire ou collaborateur)
            let collaborators = (video.collaborators as CollaboratorInstance[]).map(c => c.mail);
            return (video.UserId === (this as UserInstance).id) || (collaborators.includes((this as UserInstance).mail));
        },
        haveLinkedYoutubeAccount: function(){
            return Boolean((this as UserInstance).channelId && (this as UserInstance).credentials);
        },
        getAllowedVideos: async function(){
            let allowedVideosIncludes = Video.includes.filter(i => i.as !== 'collaborators');
            return await Video.findAll({ include: [
                ...allowedVideosIncludes, {
                    model: Collaborator,
                    as: 'collaborators',
                    where: {
                        mail: (this as UserInstance).mail
                    }
                }], 
                distinct: true,
                order: [
                    ['createdAt', 'DESC']
                ]
            });
        },
        getPlaylist: async function(uuid: string){
            return (await (this as UserInstance).getPlaylists({
                where: {uuid},
                // @ts-ignore
                include: Playlist.includes
            }))[0];
        },
        formatDisplay: function(){
            let user = this as UserInstance;
            return {
                uuid: user.uuid,
                name: user.name,
                picture: user.picture,
                channelId: user.channelId || null
            }
        }
    }

    // Création du modèle
    const User: UserModel = sequelize.define<UserInstance, UserAttributes>('User', attributes) as UserModel;

    // Associations
    User.associate = () =>{
        User.hasMany(Video, {onDelete: 'cascade'}); // Les utilisateurs ont des vidéos
        User.hasMany(RefreshToken, {foreignKey: 'UserId', onDelete: 'cascade', as: 'refreshTokens'}); // Les utilisateurs ont des refresh tokens
        User.hasMany(Playlist, {foreignKey: 'UserId', onDelete: 'cascade', as: 'playlists'}); // Les utilisateurs ont des playlists
    }

    // Ajout des méthodes de classe
    for(let classMethodName of Object.keys(classMethods)) User[classMethodName] = classMethods[classMethodName];

    // @ts-ignore Ajout des méthodes d'instance
    for(let instanceMethodName of Object.keys(instanceMethods)) User.prototype[instanceMethodName] = instanceMethods[instanceMethodName];

    // ENDPOINT
    return User;
}