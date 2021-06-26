import { VideoAttributes, VideoInstance } from "../models/Video";
import { TagAttributes } from "../models/Tag";
import { CollaboratorAttributes } from "../models/Collaborator";
import { CodeAttributes } from "../models/Code";
import { PlaylistAttributes } from "../models/Playlist";
import { UserAttributes } from "../models/User";
import { PlaylistTagAttributes } from "../models/PlaylistTag";

export interface IUserFormatDisplay{
    uuid: UserAttributes['uuid'];
    name: UserAttributes['name'];
    picture: UserAttributes['picture'];
    channelId: UserAttributes['channelId'] | null;
}

export interface IVideoFormatDisplay{
    videoId: VideoAttributes['videoId'];
    title: VideoAttributes['title'];
    description: VideoAttributes['description'];
    duration: VideoAttributes['duration'];
    language: VideoAttributes['language'];
    difficulty: VideoAttributes['difficulty'];
    visibility: VideoAttributes['visibility'];
    github: VideoAttributes['github'];
    tags?: TagAttributes['value'][];
    collaborators?: CollaboratorAttributes['mail'][];
    owner?: UserAttributes['uuid'];
}

export interface ICodeFormatDisplay{
    uuid: CodeAttributes['uuid']
    title: CodeAttributes['title'];
    mode: CodeAttributes['mode'];
    value: CodeAttributes['value'];
    time: CodeAttributes['time'];
    github: {
        user: CodeAttributes['githubUser'];
        repository: CodeAttributes['githubRepository'];
        branch: CodeAttributes['githubBranch'];
        path: CodeAttributes['githubPath'];
    }
}

export interface IPlaylistFormatDisplay{
    uuid: PlaylistAttributes['uuid'];
    title: PlaylistAttributes['title'];
    description: PlaylistAttributes['description'];
    visibility: PlaylistAttributes['visibility'];
    difficulty: PlaylistAttributes['difficulty'];
    language: PlaylistAttributes['language'];
    tags: PlaylistTagAttributes['value'][];
    owner: UserAttributes['uuid'];
    videos: IVideoFormatDisplay[];
}

export interface IVideoElasticSearch{
    title: string;
    description: string;
    tags: string[]
    github: string;
    difficulty: string;
    language: string;
    visibility: string;
}

export interface IPlaylistElasticSearch{
    title: string;
    description: string;
    tags: string[]
    difficulty: string;
    language: string;
    visibility: string;
    videosTitle: string[];
    videosDescription: string[];
    videosTags: string[];
    videosCount: number;
}

export interface IVideoUpdateFields{
    title?: VideoAttributes['title'];
    description?: VideoAttributes['description'];
    visibility?: VideoAttributes['visibility'];
    language?: VideoAttributes['language'];
    difficulty?: VideoAttributes['difficulty'];
    github?: VideoAttributes['github'];
}