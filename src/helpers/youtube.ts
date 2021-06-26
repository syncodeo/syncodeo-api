import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

import * as Constants from '../constants/';
import { server } from '../server';

const youtube = google.youtube('v3');

/**
 * Retourne le temps total en secondes d'une durée au format YoutubeAPI
 * @param {string} duration Temps au format YoutubeAPI
 * @returns {number} Temps total en secondes
 */
export function youtubeDurationToTotalTime(duration: string){
    let timeData = Constants.Regex.youtubeDurationFormat.exec(duration) as RegExpExecArray;

    if(timeData.length < 10) throw Error('Wrong Youtube Duration Format');

    let secondsInMinute = 60;
    let secondsInHour = secondsInMinute * 60;
    let secondsInDay = secondsInHour * 24;
    let secondsInWeek = secondsInDay * 7;

    let weeks = Number(timeData[2]);
    let days = Number(timeData[4]);
    let hours = Number(timeData[6]);
    let minutes = Number(timeData[8]);
    let seconds = Number(timeData[10]);

    let totalTime = (weeks * secondsInWeek || 0) + (days * secondsInDay || 0) + (hours * secondsInHour || 0) + (minutes * secondsInMinute || 0) + (seconds || 0);
    return totalTime;
}

/**
 * Renvoi une promesse résolue avec la durée d'une vidéo Youtube au format YoutubeAPI
 * @param {string} videoId ID de la vidéo Youtube
 * @return Une promesse qui retourne le temps de la vidéo si résolue
 */
export function getYoutubeVideoDuration(videoId: string, oAuth2Client: OAuth2Client){
    return youtube.videos.list({ id: videoId, part: 'contentDetails', auth: oAuth2Client, maxResults: 1 }).then(response => {
        server.metrics.youtubeApiV3Quotat.inc({type: 'video_duration'}, 3);
        let videos = response.data.items;
        if(videos === undefined || videos.length === 0) throw Constants.Errors.VideoDoesNotExists;
        return (videos[0].contentDetails as youtube_v3.Schema$VideoContentDetails).duration;
    });
}

/**
 * Récupère les informations d'une vidéo Youtube en fonction de son ID
 * @param videoId ID de la vidéo Youtube
 * @param oAuth2Client Client Oauth associé à l'utilisateur
 * @return Données de la vidéo en promesse
 */
export function getVideoData(videoId: string, oAuth2Client: OAuth2Client){
    return youtube.videos.list({ id: videoId, maxResults: 1, auth: oAuth2Client, part: 'snippet,status' }).then(response => {
        server.metrics.youtubeApiV3Quotat.inc({type: 'video_data'}, 5);
        let videos = response.data.items;
        if(videos === undefined || videos.length === 0) throw Constants.Errors.VideoDoesNotExists;
        return videos[0];
    });
}

/**
 * Retourne les 50 dernières vidéos d'une playlist
 * @param {string} playlist ID de la playlist
 * @param oAuth2Client Client Oauth associé à l'utilisateur
 * @return {Promise} Liste des vidéos de la playlist
 */
export function getVideosOfPlaylist(playlist: string, oAuth2Client: OAuth2Client){
    return youtube.playlistItems.list({ auth: oAuth2Client, part: 'snippet,status', playlistId: playlist, maxResults: 50 }).then(response => {
        server.metrics.youtubeApiV3Quotat.inc({type: 'playlist_videos'}, 5);
        return response.data.items;
    });
}

export function getUserChannel(oAuth2Client: OAuth2Client){
    return youtube.channels.list({ mine: true, part: 'id,contentDetails', auth: oAuth2Client }).then(response => {
        server.metrics.youtubeApiV3Quotat.inc({type: 'user_channel_info'}, 3);
        return response.data;
    });
}

// --- DEFAULT --- //
export default {
    youtubeDurationToTotalTime,
    getYoutubeVideoDuration,
    getVideoData,
    getVideosOfPlaylist,
    getUserChannel
}