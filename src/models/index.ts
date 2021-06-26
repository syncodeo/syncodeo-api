import * as Sequelize from 'sequelize';

import { CodeFactory } from './Code';
import { CollaboratorFactory } from './Collaborator';
import { TagFactory } from './Tag';
import { UserFactory } from './User';
import { VideoFactory } from './Video';
import { RefreshTokenFactory } from './RefreshToken';
import { PlaylistFactory } from './Playlist';
import { DB_DATABASE, DB_USER, DB_PASS, DB_HOST, DB_PORT } from '../config';
import { PlaylistVideosFactory } from './PlaylistVideos';
import { PlaylistTagFactory } from './PlaylistTag';
import { FeedbackFactory } from './Feedback';

// Création de l'instance Sequelize
export const sequelize = new Sequelize(DB_DATABASE, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    operatorsAliases: true,
    define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
    }
});

sequelize.afterDefine((model) => {
    console.log('Sequelize model ' + model.name + ' configured!');
});

// Export des modèles
export const Code = CodeFactory(sequelize, Sequelize);
export const Collaborator = CollaboratorFactory(sequelize, Sequelize);
export const Tag = TagFactory(sequelize, Sequelize);
export const PlaylistTag = PlaylistTagFactory(sequelize, Sequelize);
export const RefreshToken = RefreshTokenFactory(sequelize, Sequelize);
export const User = UserFactory(sequelize, Sequelize);
export const Video = VideoFactory(sequelize, Sequelize);
export const Playlist = PlaylistFactory(sequelize, Sequelize);
export const Feedback = FeedbackFactory(sequelize, Sequelize);

// Tables d'association
export const PlaylistVideos = PlaylistVideosFactory(sequelize, Sequelize);

const Models = {
    sequelize,
    Code,
    Collaborator,
    Tag,
    PlaylistTag,
    User,
    Video,
    RefreshToken,
    Playlist,
    PlaylistVideos,
    Feedback
}
export default Models;

// Création des relations
Object.keys(Models).forEach(modelName => {
    let ModelsAny: {[key: string]: any} = Models;
    if((ModelsAny[modelName] as any).associate){
        console.log('Configuring Sequelize associations for model ' + modelName);
        ModelsAny[modelName].associate();
    }
});
console.log('Sequelize associations configured!');

// Utilitaire de base de données
export async function checkConnection(){
    return await sequelize.authenticate();
}

export const migration = {
    drop: async () => await sequelize.sync({force: true})
}