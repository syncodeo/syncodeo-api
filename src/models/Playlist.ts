import * as Sequelize from 'sequelize';
import * as Joi from 'joi';

import * as Constants from '../constants/';
import { IPlaylistFormatDisplay } from '../interfaces/model';
import { Video, PlaylistVideos, PlaylistTag, User } from '.';
import { VideoInstance, VideoAttributes } from './Video';
import { UserAttributes, UserInstance } from './User';
import { PlaylistVideosInstance } from './PlaylistVideos';
import { CollaboratorInstance } from './Collaborator';
import { PlaylistTagAttributes, PlaylistTagInstance } from './PlaylistTag';

export interface PlaylistAttributes{
    id?: number;
    uuid?: string;
    title: string;
    description: string;
    visibility: string;
    difficulty: string;
    language: string;

    UserId: UserAttributes['id'];
    owner?: UserInstance | UserAttributes;
    playlistTags?: PlaylistTagAttributes[] | PlaylistTagInstance[];
    videos?: VideoInstance[];

    createdAt?: Date;
    updatedAt?: Date;
}

interface PlaylistInstanceMethods{
    /**
     * Récupère une vidéo au sein de la playlist (permet d'avoir les données d'association)
     * @param videoId ID Youtube de la vidéo
     */
    getVideo(videoId: string): Promise<VideoInstance>;
    /**
     * Transforme l'instance d'une playlist en objet affichable
     * @param userInstance Instance de l'utilisateur qui regarde
     */
    formatDisplay(userInstance?: UserInstance): IPlaylistFormatDisplay;
}

export interface PlaylistInstance extends Sequelize.Instance<PlaylistAttributes>, PlaylistAttributes, PlaylistInstanceMethods{
    getVideos: Sequelize.BelongsToManyGetAssociationsMixin<VideoInstance>;
    addVideo: Sequelize.BelongsToManyAddAssociationMixin<VideoInstance, VideoInstance['id'], PlaylistVideosInstance>;
    removeVideo: Sequelize.BelongsToManyRemoveAssociationMixin<VideoInstance, VideoInstance['id']>;
}

interface PlaylistClassMethods{
    /**
     * Retourne l'instance d'une playlist en fonction de son UUID
     * @param uuid UUID de la playlist
     */
    getByUuid(uuid: string): Promise<PlaylistInstance>;
    /**
     * Récupère le schéma de l'objet affichable
     */
    displaySchema: Joi.JoiObject;
    /**
     * Récupère les associations obligatoires de Playlist
     */
    includes: Sequelize.IncludeOptions[];
}

export interface PlaylistModel extends Sequelize.Model<PlaylistInstance, PlaylistAttributes>, PlaylistClassMethods{}

export function PlaylistFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes){
    // Attributs
    const attributes: Sequelize.DefineModelAttributes<PlaylistAttributes> = {
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
        description: {
            type: DataTypes.TEXT
        },
        visibility: {
            type: DataTypes.ENUM(Constants.getVisibilityValues())
        },
        difficulty: {
            type: DataTypes.ENUM(Constants.getDifficultyValues())
        },
        language: {
            type: DataTypes.ENUM(Constants.getLocalizationValues())
        },
        UserId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
    };

    const includes: Sequelize.IncludeOptions[] = [{
        model: Video,
        as: 'videos',
        include: Video.includes
    }, {
        model: PlaylistTag,
        as: 'playlistTags'
    }, {
        model: User,
        as: 'owner'
    }];

    // Méthodes de classe
    const classMethods: PlaylistClassMethods = {
        getByUuid: async (uuid: string) => {
            return await Playlist.findOne({ 
                where: { uuid }, 
                include: includes
            });
        },
        displaySchema: Joi.object({
            uuid: Joi.string().required().description('Playlist identifier, UUID format'),
            title: Joi.string().required().description('Playlist title'),
            description: Joi.string().required().description('Playlist description'),
            visibility: Joi.string().valid(Constants.getVisibilityValues()).required().description('Playlist visibility'),
            language: Joi.string().valid(Constants.getLocalizationValues()).required().description('Playlist language'),
            difficulty: Joi.string().valid(Constants.getDifficultyValues()).required().description('Playlist difficulty'),
            tags: Joi.array().items(Joi.string().required()).required().description('Playlist tags'),
            owner: Joi.string().required().description('UUID of the playlist\'s owner'),
            videos: Joi.array().items(Video.displaySchema).required().description('Playlist videos')
        }).label('Playlist schema'),
        includes: includes
    }

    // Méthodes d'instance
    const instanceMethods: PlaylistInstanceMethods = {
        getVideo: async function(videoId: string){
            return (await (this as PlaylistInstance).getVideos({
                where: {videoId},
                // @ts-ignore
                include: Video.includes
            }))[0];
        },
        formatDisplay: function(userInstance: UserInstance){
            let playlist = (this as PlaylistInstance);
            return {
                uuid: playlist.uuid,
                title: playlist.title,
                description: playlist.description,
                visibility: playlist.visibility,
                difficulty: playlist.difficulty,
                language: playlist.language,
                tags: (playlist.playlistTags as PlaylistTagInstance[]).map(t => t.value),
                owner: playlist.owner.uuid,
                videos: (
                    playlist.videos && 
                    playlist.videos
                        .filter(v => v.visibility !== Constants.Visibility.private || (userInstance && (v.UserId === userInstance.id || (v.collaborators as CollaboratorInstance[]).map(c => c.mail).includes(userInstance.mail))))
                        .sort((v1, v2) => v1.PlaylistVideos.rank - v2.PlaylistVideos.rank)
                        .map(v => v.formatDisplay(userInstance))
                ) || []
            }
        }
    }

    // Création du modèle
    const Playlist: PlaylistModel = sequelize.define<PlaylistInstance, PlaylistAttributes>('Playlist', attributes, { classMethods, instanceMethods }) as PlaylistModel;

    // Associations
    Playlist.associate = () => {
        Playlist.belongsTo(User, {onDelete: 'cascade', as: 'owner', foreignKey: 'UserId'}); // Une playlist appartient à un utilisateur
        Playlist.belongsToMany(Video, { through: PlaylistVideos, foreignKey: 'PlaylistId', as: 'videos' }); // Les vidéos contiennent des playlists
        Playlist.hasMany(PlaylistTag, { foreignKey: 'PlaylistId', onDelete: 'cascade', as: 'playlistTags' }); // Les playlists ont des tags
    }

    // Ajout des méthodes de classe
    for(let classMethodName of Object.keys(classMethods)) Playlist[classMethodName] = classMethods[classMethodName];

    // Ajout des méthodes d'instance
    for(let instanceMethodName of Object.keys(instanceMethods)) (Playlist as any).prototype[instanceMethodName] = instanceMethods[instanceMethodName];

    // ENDPOINT
    return Playlist;
}