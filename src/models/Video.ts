import * as Sequelize from 'sequelize';
import * as Joi from 'joi';

import { Code, User, Tag, Collaborator, Playlist, PlaylistVideos } from './';
import * as Constants from '../constants/';
import { UserInstance, UserAttributes } from './User';
import { CodeInstance, CodeAttributes } from './Code';
import { TagInstance, TagAttributes } from './Tag';
import { CollaboratorInstance, CollaboratorAttributes } from './Collaborator';
import { IVideoFormatDisplay } from '../interfaces/model';
import { PlaylistInstance } from './Playlist';
import { PlaylistVideosAttributes, PlaylistVideosInstance } from './PlaylistVideos';

export interface VideoAttributes{
    id?: number;
    videoId: string;
    language: string;
    difficulty: string;
    title: string;
    description: string;
    visibility: string;
    duration: number;
    github: string;
    viewsCount?: number;

    UserId: UserAttributes['id'];
    codes?: CodeAttributes[];
    tags?: TagAttributes[] | TagInstance[];
    collaborators?: CollaboratorAttributes[] | CollaboratorInstance[];
    playlists?: PlaylistInstance[];
    owner?: UserAttributes | UserInstance;
    
    createdAt?: Date;
    updatedAt?: Date;

    /**
     * Données à définir lors de l'ajout dans une playlist
     */
    PlaylistVideos?: PlaylistVideosAttributes | PlaylistVideosInstance
}

interface VideoInstanceMethods{
    /**
     * Incrémente le compteur de vues de la vidéo
     */
    incrementViewsCount(): Promise<void>;
    /**
     * Liste tous les codes d'une vidéo dans l'ordre
     */
    getAllCodes(): Promise<CodeInstance[]>;
    /**
     * Récupère un code spécifique à la vidéo
     * @param uuid UUID du code
     */
    getCode(uuid: string): Promise<CodeInstance>;
    /**
     * Regarde si le temps voulu est disponible pour y rajouter un code
     * @param time Temps où regarder
     */
    isCodeTimeFree(time: number, excludeCode?: CodeInstance): Promise<boolean>;
    /**
     * Regarde si le temps voulu est dans le temps de la vidéo
     * @param time Temps où regarder
     */
    isCodeTimeInRange(time: number): boolean;
    /**
     * Transforme l'instance en objet affichable
     */
    formatDisplay(userInstance?: UserInstance): IVideoFormatDisplay;
}

export interface VideoInstance extends Sequelize.Instance<VideoAttributes>, VideoAttributes, VideoInstanceMethods{
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    getCodes: Sequelize.HasManyGetAssociationsMixin<CodeInstance>;
    getTags: Sequelize.HasManyGetAssociationsMixin<TagInstance>;
    getCollaborators: Sequelize.HasManyGetAssociationsMixin<CollaboratorInstance>;
}

interface VideoClassMethods{
    /**
     * Récupère l'instance d'une vidéo en fonction de son ID
     * @param videoId VideoId de la vidéo
     */
    getByVideoId(videoId: string): Promise<VideoInstance>;
    /**
     * Récupère toutes les vidéos d'un utilisateur
     * @param user Référence de l'utilisateur
     */
    getAllOfUser(user: UserInstance): Promise<VideoInstance[]>;
    /**
     * La vidéo est-elle déjà enregistrée ?
     * @param videoId VideoId de la vidéo
     */
    exists(videoId: string): Promise<boolean>;
    /**
     * Récupère le schéma de l'objet affichable
     */
    displaySchema: Joi.JoiObject;
    /**
     * Récupère les relations obligatoires de Video
     */
    includes: Sequelize.IncludeOptions[];
}

export interface VideoModel extends Sequelize.Model<VideoInstance, VideoAttributes>, VideoClassMethods{}

export function VideoFactory(sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes){
    // Attributs
    const attributes: Sequelize.DefineModelAttributes<VideoAttributes> = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        videoId: {
            type: DataTypes.STRING(11),
            validate: {
                is: Constants.Regex.youtubeVideoId
            }
        },
        language: {
            type: DataTypes.ENUM(Constants.getLocalizationValues())
        },
        difficulty: {
            type: DataTypes.ENUM(Constants.getDifficultyValues())
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
        duration: {
            type: DataTypes.INTEGER
        },
        github: {
            type: DataTypes.STRING,
            validate: {
                githubOrEmpty(value: string){
                    if(value !== '' && !Constants.Regex.githubLink.exec(value)) throw new Error('Must be empty or GitHub link');
                }
            }
        },
        viewsCount: {
            type: DataTypes.INTEGER
        },
        UserId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    };

    const includes = [{
        model: Tag,
        as: 'tags'
    }, {
        model: Collaborator,
        as: 'collaborators'
    }, {
        model: User,
        as: 'owner'
    }];

    // Methodes de classe
    const classMethods: VideoClassMethods = {
        getByVideoId: async function(videoId: string){
            return await Video.findOne({ 
                where: {videoId}, 
                include: includes
            });
        },
        getAllOfUser: async function(user: UserInstance){
            let videos = await user.getVideos({ include: includes } as any);
            return videos;
        },
        exists: async function(videoId: string){
            return (await Video.findAndCountAll({ where: {videoId} })).count > 0;
        },
        displaySchema: Joi.object({
            videoId: Joi.string().required().description('Youtube video ID'),
            title: Joi.string().required().description('Video title'),
            description: Joi.string().required().description('Video description'),
            duration: Joi.number().required().description('Video duration in seconds'),
            language: Joi.string().valid(Constants.getLocalizationValues()).required().description('Video language'),
            difficulty: Joi.string().valid(Constants.getDifficultyValues()).required().description('Video difficulty'),
            visibility: Joi.string().valid(Constants.getVisibilityValues()).required().description('Video visibility'),
            github: Joi.string().required().description('Video GitHub link'),
            tags: Joi.array().items(Joi.string().required()).required().description('Video tags'),
            collaborators: Joi.array().items(Joi.string().required()).description('Video collaborators email (displayed if owner of the video)'),
            owner: Joi.string().required().description('UUID of the user owner')
        }).label('Video schema'),
        includes: includes
    }

    // Méthodes d'instance
    const instanceMethods: VideoInstanceMethods = {
        incrementViewsCount: async function(){
            await (this as VideoInstance).update({ viewsCount: (this as VideoInstance).viewsCount + 1 }, { silent: true });
        },
        getAllCodes: async function(){
            let options: Sequelize.HasManyGetAssociationsMixinOptions = {order: [['time', 'ASC']]} as any;
            return await (this as VideoInstance).getCodes(options);
        },
        getCode: async function(uuid: string){
            return (await (this as VideoInstance).getCodes({ where: {uuid} }))[0];
        },
        isCodeTimeFree: async function(time: number, excludeCode?: CodeInstance){
            let codes = await (this as VideoInstance).getCodes({ where: {time} });
            if(excludeCode) codes = codes.filter(c => c.id !== excludeCode.id);
            return codes.length === 0;
        },
        isCodeTimeInRange: function(time: number){
            return (Number(time) < Number((this as VideoInstance).duration) && Number(time) >= 0);
        },
        formatDisplay: function(userInstance?: UserInstance){
            let video = this as VideoInstance;
            let display: IVideoFormatDisplay = {
                videoId: video.videoId,
                title: video.title,
                description: video.description,
                duration: video.duration,
                language: video.language,
                difficulty: video.difficulty,
                visibility: video.visibility,
                github: video.github,
                tags: (video.tags as TagInstance[]).map(t => t.value),
                owner: video.owner.uuid
            };
            if(userInstance && video.UserId === userInstance.id) display.collaborators = (video.collaborators as CollaboratorInstance[]).map(c => c.mail);
            return display;
        }
    }

    // Création du modèle
    const Video: VideoModel = sequelize.define<VideoInstance, VideoAttributes>('Video', attributes) as VideoModel;

    // Associations
    Video.associate = () => {
        Video.belongsTo(User, {onDelete: 'cascade', as: 'owner', foreignKey: 'UserId'}); // Une vidéo appartient à un utilisateur
        Video.hasMany(Code, {onDelete: 'cascade'}); //Les vidéos ont des codes
        Video.hasMany(Tag, {foreignKey: 'VideoId', onDelete: 'cascade', as: 'tags'}); // Les vidéos ont des tags
        Video.hasMany(Collaborator, {foreignKey: 'VideoId', onDelete: 'cascade', as: 'collaborators'}); // Les vidéos ont des collaborateurs
        Video.belongsToMany(Playlist, { through: PlaylistVideos, foreignKey: 'VideoId', as: 'playlists' }); // Les vidéos ont plusieurs playlists
    }

    // Ajout des méthodes de classe
    for(let classMethodName of Object.keys(classMethods)) Video[classMethodName] = classMethods[classMethodName];

    // @ts-ignore Ajout des méthodes d'instance
    for(let instanceMethodName of Object.keys(instanceMethods)) Video.prototype[instanceMethodName] = instanceMethods[instanceMethodName];

    // ENDPOINT
    return Video;
}