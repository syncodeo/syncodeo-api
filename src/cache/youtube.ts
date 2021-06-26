import { OAuth2Client } from 'google-auth-library';
import { CachePolicyOptions } from 'hapi';
import { youtube_v3 } from 'googleapis';

import * as Helpers from '../helpers/';
import * as Constants from '../constants/';
import { server } from '../server';
import { Policy, PolicyOptions } from 'catbox';
import { IVideoCacheKey } from '../interfaces/cache';

type CachePolicy<T> = Policy<T, PolicyOptions<T>>;

export const videoData: CachePolicy<youtube_v3.Schema$Video> = server.cache({
    segment: 'youtube-video-data',
    expiresIn: Constants.Rates.youtubeVideoData,
    generateFunc: async (data: IVideoCacheKey) => {
        return await Helpers.youtube.getVideoData(data.id, data.oAuthClient);
    },
    generateTimeout: 5000
});

export const playlistVideos: CachePolicy<youtube_v3.Schema$PlaylistItem[]> = server.cache({
    segment: 'youtube-playlist-videos',
    expiresIn: Constants.Rates.youtubeRecentUploads,
    generateFunc: async (data: IVideoCacheKey) => {
        return await Helpers.youtube.getVideosOfPlaylist(data.id, data.oAuthClient);
    },
    generateTimeout: 5000
});

// --- DEFAULT --- //
export default {
    videoData,
    playlistVideos
}