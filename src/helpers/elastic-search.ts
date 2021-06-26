import * as Constants from '../constants/';
import { VideoInstance } from "../models/Video";
import { IVideoElasticSearch } from "../interfaces/model";
import { TagAttributes, TagInstance } from "../models/Tag";
import { server } from "../server";
import { PlaylistInstance } from '../models/Playlist';

/**
 * VIDEOS
 */

function getVideoHead(videoInstance: VideoInstance){
    return {
        index: Constants.ElasticSearch.videos.index,
        type: Constants.ElasticSearch.videos.type,
        id: videoInstance.videoId,
    }
}

export async function createOrUpdateVideo(videoInstance: VideoInstance){
    return await server.elasticSearch.index<IVideoElasticSearch>({
        ...getVideoHead(videoInstance),
        body: {
            title: videoInstance.title,
            description: videoInstance.description,
            tags: (videoInstance.tags as TagInstance[]).map(tag => tag.value),
            github: videoInstance.github,
            difficulty: videoInstance.difficulty,
            language: videoInstance.language,
            visibility: videoInstance.visibility
        }
    });
}

export async function deleteVideo(videoInstance: VideoInstance){
    let exists = await server.elasticSearch.exists(getVideoHead(videoInstance));
    if(exists) return await server.elasticSearch.delete(getVideoHead(videoInstance));
}

/**
 * PLAYLISTS
 */

function getPlaylistHead(playlistInstance: PlaylistInstance){
    return {
        index: Constants.ElasticSearch.playlists.index,
        type: Constants.ElasticSearch.playlists.type,
        id: playlistInstance.uuid
    }
}

export async function createOrUpdatePlaylist(playlistInstance: PlaylistInstance){
    let formattedPlaylist = playlistInstance.formatDisplay();
    return await server.elasticSearch.index({
        ...getPlaylistHead(playlistInstance),
        body: {
            title: formattedPlaylist.title,
            description: formattedPlaylist.description,
            tags: formattedPlaylist.tags,
            visibility: formattedPlaylist.visibility,
            difficulty: formattedPlaylist.difficulty,
            language: formattedPlaylist.language,
            videosTitle: formattedPlaylist.videos.map(v => v.title),
            videosDescription: formattedPlaylist.videos.map(v => v.description),
            videosTags: Array.from(new Set<string>([].concat(...formattedPlaylist.videos.map(v => v.tags)))), // Tableau de tableau de tags, concaténés dans un seul tableau 1D et où les duplicates sont supprimés
            videosCount: formattedPlaylist.videos.length
        }
    });
}

export async function deletePlaylists(playlistInstance: PlaylistInstance){
    let exists = await server.elasticSearch.exists(getPlaylistHead(playlistInstance));
    if(exists) return await server.elasticSearch.delete(getPlaylistHead(playlistInstance));
}

export default {
    createOrUpdateVideo,
    deleteVideo,
    createOrUpdatePlaylist,
    deletePlaylists
}