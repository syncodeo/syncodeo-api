import 'mocha';

import { testMissingAuth, testYoutubeAccountLinked, testSuccess, DB, checkPlaylistResponse, testError, Errors, Expect, createPlaylist, createVideo, Data, Wait, ES, Constants, ESerrors } from './helpers';
import Routes from './routes';
import { Playlist, Video } from '../src/models';
import { PlaylistInstance } from '../src/models/Playlist';
import { VideoInstance } from '../src/models/Video';
import { PlaylistVideosInstance } from '../src/models/PlaylistVideos';
import { PlaylistTagInstance } from '../src/models/PlaylistTag';
import { IPlaylistFormatDisplay, IPlaylistElasticSearch } from '../src/interfaces/model';
import { TESTS_GOOGLE_ENABLED, TESTS_VIDEO_ID, TESTS_URL } from '../src/config';
import Axios from 'axios';

const uuidv4 = require('uuid/v4');

const checkRankOfVideoInPlaylist = (playlist: PlaylistInstance, playlistDisplay: IPlaylistFormatDisplay, video: VideoInstance, rank: number) => {
    Expect(playlistDisplay.videos[rank - 1].videoId).to.deep.equal(video.videoId);
    Expect(playlist.videos.filter(v => v.videoId === video.videoId)[0].PlaylistVideos.rank).to.deep.equal(rank);
}

describe('Add a playlist', () => {
    let PLAYLIST_DATA = {
        title: 'My new playlist',
        description: 'My new playlist description',
        visibility: 'public',
        difficulty: 'beginner',
        language: 'en',
        tags: ['c++', 'java']
    };
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Playlists.CRUD.Create());
    });
    it('400 - Youtube account not linked', async () => {
        let data = { payload: PLAYLIST_DATA };
        await testYoutubeAccountLinked(Routes.Playlists.CRUD.Create(), data);
    });
    it('201 - Playlist created', async () => {
        let data = { payload: PLAYLIST_DATA, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.Create(), 201, data);
        let playlistDB = await Playlist.findOne({ where: { UserId: DB.main.user.id, title: PLAYLIST_DATA.title }, include: Playlist.includes });
        checkPlaylistResponse(res.body, playlistDB.formatDisplay(DB.main.user));
    });
    after(async () =>{
        await Playlist.destroy({ where: { UserId: DB.main.user.id } });
    });
});

describe('Delete a playlist', () => {
    let playlist: PlaylistInstance;
    before(async () => {
        playlist = await createPlaylist();
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Playlists.CRUD.Delete(playlist.uuid));
    });
    it('404 - Playlist not found', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.CRUD.Delete(uuidv4()), Errors.PlaylistNotFound, data);
    });
    it('204 - Playlist deleted', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Playlists.CRUD.Delete(playlist.uuid), 204, data);
        let playlistDB = await Playlist.findOne({ where: { uuid: playlist.uuid }, include: Playlist.includes });
        Expect(playlistDB).to.be.null;
    });
    after(async () => {
        // Au cas où
        await Playlist.destroy({ where: { UserId: DB.main.user.id } });
    });
});

describe('Find a specific playlist', () => {
    let playlist: PlaylistInstance;
    let video: VideoInstance;
    before(async () => {
        playlist = await createPlaylist();
        // On ajoute une vidéo pour tester si elle apparait bien dans le retour
        video = await createVideo();
        await playlist.addVideo(video, { through: { rank: 1 } as PlaylistVideosInstance });
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
    });
    it('404 - Playlist not found', async () => {
        await testError(Routes.Playlists.CRUD.FindOne(uuidv4()), Errors.PlaylistNotFound);
    });
    it('200 - Owner - public', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.FindOne(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.formatDisplay(DB.main.user));
    });
    it('200 - Lambda - public', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.FindOne(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.formatDisplay(DB.lambda.user));
    });
    it('200 - Guest - public', async () => {
        let res = await testSuccess(Routes.Playlists.CRUD.FindOne(playlist.uuid), 200);
        checkPlaylistResponse(res.body, playlist.formatDisplay());
    });
    it('Change playlist visibility to unlisted', async () => {
        await playlist.update({ visibility: 'unlisted' });
    });
    it('200 - Owner - unlisted', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.FindOne(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.formatDisplay(DB.main.user));
    });
    it('200 - Lambda - unlisted', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.FindOne(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.formatDisplay(DB.lambda.user));
    });
    it('200 - Guest - unlisted', async () => {
        let res = await testSuccess(Routes.Playlists.CRUD.FindOne(playlist.uuid), 200);
        checkPlaylistResponse(res.body, playlist.formatDisplay());
    });
    it('Change playlist visibility to private', async () => {
        await playlist.update({ visibility: 'private' });
    });
    it('200 - Owner - private', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.FindOne(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.formatDisplay(DB.main.user));
    });
    it('404 - Lambda - private', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        await testError(Routes.Playlists.CRUD.FindOne(playlist.uuid), Errors.PlaylistNotFound, data);
    });
    it('404 - Guest - private', async () => {
        await testError(Routes.Playlists.CRUD.FindOne(playlist.uuid), Errors.PlaylistNotFound);
    });
    after(async () => {
        await playlist.removeVideo(video);
        await video.destroy();
        await playlist.destroy();
    });
});

describe('Update a playlist', () => {
    let playlist: PlaylistInstance;
    let videos: VideoInstance[];
    before(async () => {
        playlist = await createPlaylist();
        videos = [];
        for(let i = 1; i <= 3; i++) {
            let video = await createVideo();
            videos.push(video);
            playlist.addVideo(video, { through: { rank: i } as PlaylistVideosInstance });
        }
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Playlists.CRUD.Update(playlist.uuid));
    });
    it('404 - Playlist not found', async () => {
        let data = { payload: {}, headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.CRUD.Update(uuidv4()), Errors.PlaylistNotFound, data);
    });
    it('200 - Update title', async () => {
        let title = 'Updated playlist title';
        let data = { payload: { title }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.Update(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.set({ title }).formatDisplay(DB.main.user));
        // Vérification BDD
        let playlistDB = await Playlist.findOne({ where: { uuid: playlist.uuid }, include: Playlist.includes });
        Expect(playlistDB.title).to.deep.equal(title);
    });
    it('200 - Update description', async () => {
        let description = 'Updated playlist description';
        let data = { payload: { description }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.Update(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.set({ description }).formatDisplay(DB.main.user));
        // Vérification BDD
        let playlistDB = await Playlist.findOne({ where: { uuid: playlist.uuid }, include: Playlist.includes });
        Expect(playlistDB.description).to.deep.equal(description);
    });
    it('200 - Update visibility', async () => {
        let visibility = 'private';
        let data = { payload: { visibility }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.Update(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.set({ visibility }).formatDisplay(DB.main.user));
        // Vérification BDD
        let playlistDB = await Playlist.findOne({ where: { uuid: playlist.uuid }, include: Playlist.includes });
        Expect(playlistDB.visibility).to.deep.equal(visibility);
    });
    it('200 - Update difficulty', async () => {
        let difficulty = 'beginner';
        let data = { payload: { difficulty }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.Update(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.set({ difficulty }).formatDisplay(DB.main.user));
        // Vérification BDD
        let playlistDB = await Playlist.findOne({ where: { uuid: playlist.uuid }, include: Playlist.includes });
        Expect(playlistDB.difficulty).to.deep.equal(difficulty);
    });
    it('200 - Update language', async () => {
        let language = 'it';
        let data = { payload: { language }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.Update(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.set({ language }).formatDisplay(DB.main.user));
        // Vérification BDD
        let playlistDB = await Playlist.findOne({ where: { uuid: playlist.uuid }, include: Playlist.includes });
        Expect(playlistDB.language).to.deep.equal(language);
    });
    it('200 - Update tags', async () => {
        let tags = ['updated', 'tags'];
        let data = { payload: { tags }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.CRUD.Update(playlist.uuid), 200, data);
        checkPlaylistResponse(res.body, playlist.set({ playlistTags: tags.map(t  => { return {value: t}; }) }).formatDisplay(DB.main.user));
        // Vérification BDD
        let playlistDB = await Playlist.findOne({ where: { uuid: playlist.uuid }, include: Playlist.includes });
        Expect((playlistDB.playlistTags as PlaylistTagInstance[]).map(t => t.value)).to.have.members(tags);
    });
    after(async () => {
        await playlist.destroy();
        await Promise.all(videos.map(v => v.destroy()));
    });
});

describe('Add video to playlist', () => {
    let playlist: PlaylistInstance;
    let video1: VideoInstance, video2: VideoInstance;
    before(async () => {
        playlist = await createPlaylist();
        video1 = await createVideo();
        await video1.update({ title: 'video 1 placed 2nd', videoId: 'video1azazw' });
        video2 = await createVideo();
        await video2.update({ title: 'video 2 placed 1st', videoId: 'video2azazw' });
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video1.videoId));
    });
    it('404 - Playlist not found', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.Videos.CRUD.Create(uuidv4(), video1.videoId), Errors.PlaylistNotFound, data);
    });
    it('404 - Video not found', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, 'azazazazazw'), Errors.VideoNotFound, data);
    });
    it('403 - Not author', async () => {
        // Pre
        let otherVideo = await createVideo();
        await otherVideo.update({ UserId: DB.youtubeLinked.user.id, videoId: 'othervideow' });
        // Test
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, otherVideo.videoId), Errors.NotAuthor, data);
        // Post
        await otherVideo.destroy();
    });
    it('201 - First video added rank 1', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video2.videoId), 201, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 1);
    });
    it('201 - Second video added rank 2', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video1.videoId), 201, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 2);
    });
    it('201 - (Delete first video and) add again first video but rank 2', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Playlists.Videos.CRUD.Delete(playlist.uuid, video2.videoId), 200, data);
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video2.videoId), 201, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 2);
    });
    after(async () => {
        await playlist.destroy();
        await Promise.all([video1, video2].map(v => v.destroy()));
    });
});

describe('Delete a video from a playlist', () => {
    let playlist: PlaylistInstance;
    let video1: VideoInstance, video2: VideoInstance, video3: VideoInstance;
    before(async () => {
        playlist = await createPlaylist();
        video1 = await createVideo();
        await video1.update({ title: 'video 1 to delete from playlist', videoId: 'video1azazw' });
        video2 = await createVideo();
        await video2.update({ title: 'video 2 to delete from playlist', videoId: 'video2azazw' });
        video3 = await createVideo();
        await video3.update({ title: 'video 3 to delete from playlist', videoId: 'video3azazw' });
        let data = { headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video1.videoId), 201, data);
        await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video2.videoId), 201, data);
        await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video3.videoId), 201, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Playlists.Videos.CRUD.Delete(playlist.uuid, video1.videoId));
    });
    it('404 - Playlist not found', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.Videos.CRUD.Delete(uuidv4(), video1.videoId), Errors.PlaylistNotFound, data);
    });
    it('404 - Video not found', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.Videos.CRUD.Delete(playlist.uuid, 'azazazazazw'), Errors.VideoNotFound, data);
    });
    it('200 - First video removed', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Delete(playlist.uuid, video1.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video3, 2);
    });
    it('Reset configuration', async () => {
        let data: any = { headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video1.videoId), 201, data);
        data = { ...data, payload: { rank: 1 } };
        await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video1.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
    });
    it('200 - Second video removed', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Delete(playlist.uuid, video2.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video3, 2);
    });
    it('Reset configuration', async () => {
        let data: any = { headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video2.videoId), 201, data);
        data = { ...data, payload: { rank: 2 } };
        await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video2.videoId), 200, data);
        data.payload.rank = 3;
        await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video3.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
    });
    it('200 - Last video removed', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Delete(playlist.uuid, video3.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 2);
    });
    after(async () => {
        await playlist.destroy();
        await Promise.all([video1, video2, video3].map(v => v.destroy()));
    });
});

describe('Update a video from a playlist', () => {
    let playlist: PlaylistInstance;
    let video1: VideoInstance, video2: VideoInstance, video3: VideoInstance;
    before(async () => {
        playlist = await createPlaylist();
        video1 = await createVideo();
        await video1.update({ title: 'video 1 to update', videoId: 'video1azazw' });
        video2 = await createVideo();
        await video2.update({ title: 'video 2 to update', videoId: 'video2azazw' });
        video3 = await createVideo();
        await video3.update({ title: 'video 3 to update', videoId: 'video3azazw' });
        let data = { headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video1.videoId), 201, data);
        await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video2.videoId), 201, data);
        await testSuccess(Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video3.videoId), 201, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video1.videoId));
    });
    it('404 - Playlist not found', async () => {
        let data = { payload: { rank: 1 }, headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.Videos.CRUD.Update(uuidv4(), video1.videoId), Errors.PlaylistNotFound, data);
    });
    it('404 - Video not found', async () => {
        let data = { payload: { rank: 1 }, headers: { authorization: DB.main.token } };
        await testError(Routes.Playlists.Videos.CRUD.Delete(playlist.uuid, 'azazazazazw'), Errors.VideoNotFound, data);
    });
    it('204 - Move 3rd to 1st', async () => { // 1 2 3 -> 3 1 2
        let data = { payload: { rank: 1 }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video3.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(3);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video3, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 3);
    });
    it('204 - Move 2nd to 1st', async () => { // 3 1 2 -> 1 3 2
        let data = { payload: { rank: 1 }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video1.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(3);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video3, 2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 3);
    });
    it('204 - Move 2nd to 3rd', async () => { // 1 3 2 -> 1 2 3
        let data = { payload: { rank: 3 }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video3.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(3);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video3, 3);
    });
    it('204 - Move 2nd to 1st', async () => { // 1 2 3 -> 2 1 3
        let data = { payload: { rank: 1 }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video2.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(3);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video3, 3);
    });
    it('204 - Move 1st to 3rd', async () => { // 2 1 3 -> 1 3 2
        let data = { payload: { rank: 3 }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video2.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(3);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video3, 2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 3);
    });
    it('204 - Move 1st to 2nd', async () => { // 1 3 2 -> 3 1 2
        let data = { payload: { rank: 2 }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Playlists.Videos.CRUD.Update(playlist.uuid, video1.videoId), 200, data);
        await playlist.reload({ where: { id: playlist.id }, include: Playlist.includes });
        let formattedDisplayPlaylist = playlist.formatDisplay(DB.main.user);
        checkPlaylistResponse(res.body, formattedDisplayPlaylist);
        Expect(playlist.videos).to.be.an('array').of.length(3);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video3, 1);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video1, 2);
        checkRankOfVideoInPlaylist(playlist, formattedDisplayPlaylist, video2, 3);
    });
    after(async () => {
        await playlist.destroy();
        await Promise.all([video1, video2, video3].map(v => v.destroy()));
    });
});

describe('Search for a playlist', () => {
    let playlist: PlaylistInstance;
    let video: VideoInstance;
    before(async function(){
        if(!TESTS_GOOGLE_ENABLED) this.skip();
        let playlistRes = await Axios.post<IPlaylistFormatDisplay>(
            TESTS_URL + Routes.Playlists.CRUD.Create().path, {
                title: 'Search this playlist',
                description: 'Look, a description',
                visibility: 'public',
                difficulty: 'beginner',
                language: 'fr',
                tags: ['java', 'c++']
            }, { headers: { authorization: Data.USER_ACCESS_TOKEN }}
        );
        await Axios.post(
            TESTS_URL + Routes.Videos.CRUD.Create().path, {
                videoId: TESTS_VIDEO_ID,
                title: 'video title',
                description: 'I love pancakes',
                visibility: 'public',
                language: 'es',
                difficulty: 'beginner',
                github: '',
                collaborators: [DB.collaborator.user.mail],
                tags: ['c#', 'cobol']
            }, { headers: { authorization: Data.USER_ACCESS_TOKEN } }
        );
        playlist = await Playlist.findOne({ where: { uuid: playlistRes.data.uuid }, include: Playlist.includes });
        video = await Video.findOne({ where: { videoId: TESTS_VIDEO_ID }, include: Video.includes });
        await Axios.post(
            TESTS_URL + Routes.Playlists.Videos.CRUD.Create(playlist.uuid, video.videoId).path,
            null,
            { headers: { authorization: Data.USER_ACCESS_TOKEN } }
        );
        await Wait(1500); // ES update (1s)
    });
    it('200 - Found with playlist title - No filter', async () => {
        let data = { query: { query: 'playlist searc' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with playlist description - No filter', async () => {
        let data = { query: { query: 'description lok' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with playlist tags - No filter', async () => {
        let data = { query: { query: 'java' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with video title - No filter', async () => {
        let data = { query: { query: 'vidoe titl' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with video description - No filter', async () => {
        let data = { query: { query: 'lov pancaks' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with video tags - No filter', async () => {
        let data = { query: { query: 'cobol' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with title - Difficulty match', async () => {
        let data = { query: { query: 'playlist', difficulty: JSON.stringify(['beginner', 'intermediate']) } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with title - Difficulty don\'t match', async () => {
        let data = { query: { query: 'playlist', difficulty: JSON.stringify(['confirmed']) } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(0);
        Expect(res.body.nextPage).to.be.null;
    });
    it('200 - Found with title - Language match', async () => {
        let data = { query: { query: 'playlist', language: JSON.stringify(['fr']) } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with title - Language don\'t match', async () => {
        let data = { query: { query: 'playlist', language: JSON.stringify(['en', 'it']) } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(0);
        Expect(res.body.nextPage).to.be.null;
    });
    it('200 - Found with title - Difficulty + Language match', async () => {
        let data = { query: { query: 'playlist', language: JSON.stringify(['fr']), difficulty: JSON.stringify(['beginner']) } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
        checkPlaylistResponse(res.body.results[0], playlist.formatDisplay());
    });
    it('200 - Found with title - Difficulty don\'t match + Language match', async () => {
        let data = { query: { query: 'playlist', language: JSON.stringify(['fr']), difficulty: JSON.stringify(['confirmed']) } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(0);
        Expect(res.body.nextPage).to.be.null;
    });
    it('200 - Found with title - Difficulty match + Language don\'t match', async () => {
        let data = { query: { query: 'playlist', language: JSON.stringify(['it']), difficulty: JSON.stringify(['beginner']) } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(0);
        Expect(res.body.nextPage).to.be.null;
    });
    it('200 - Found when video visibility to unlisted', async () => {
        // Pre
        await Axios.put(
            TESTS_URL + Routes.Videos.CRUD.Update(video.videoId).path,
            { visibility: 'unlisted' },
            { headers: { authorization: Data.USER_ACCESS_TOKEN } }
        );
        await Wait(1500); // ES update (1s)
        // Test
        let data = { query: { query: 'playlist' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(1);
        Expect(res.body.nextPage).to.be.null;
    });
    it('200 - Not found when video visibility to private (means empty playlist)', async () => {
        // Pre
        await Axios.put(
            TESTS_URL + Routes.Videos.CRUD.Update(video.videoId).path,
            { visibility: 'private' },
            { headers: { authorization: Data.USER_ACCESS_TOKEN } }
        );
        await Wait(1500); // ES update (1s)
        // Test
        let data = { query: { query: 'playlist' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(0);
        Expect(res.body.nextPage).to.be.null;
    });
    it('200 - Not found when playlist visibility to unlisted', async () => {
        // Pre
        await Axios.put(
            TESTS_URL + Routes.Videos.CRUD.Update(video.videoId).path,
            { visibility: 'public' },
            { headers: { authorization: Data.USER_ACCESS_TOKEN } }
        );
        await Axios.put(
            TESTS_URL + Routes.Playlists.CRUD.Update(playlist.uuid).path,
            { visibility: 'unlisted' },
            { headers: { authorization: Data.USER_ACCESS_TOKEN } }
        );
        await Wait(1500); // ES update (1s)
        // Test
        let data = { query: { query: 'playlist' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(0);
        Expect(res.body.nextPage).to.be.null;
    });
    it('200 - Not found when playlist visibility to private', async () => {
        // Pre
        await Axios.put(
            TESTS_URL + Routes.Playlists.CRUD.Update(playlist.uuid).path,
            { visibility: 'private' },
            { headers: { authorization: Data.USER_ACCESS_TOKEN } }
        );
        await Wait(1500); // ES update (1s)
        // Test
        let data = { query: { query: 'playlist' } };
        let res = await testSuccess(Routes.Playlists.Search(), 200, data);
        Expect(res.body.results).to.be.an('array').of.length(0);
        Expect(res.body.nextPage).to.be.null;
    });
    after(async function(){
        if(!TESTS_GOOGLE_ENABLED) this.skip();
        await playlist.destroy();
        await video.destroy();
    });
});

describe('Sync with Elasticsearch', () => {
    before(async function(){
        if(!TESTS_GOOGLE_ENABLED) this.skip();
    });
    let playlistUUID: string;
    it('Create a playlist', async () => {
        let PLAYLIST_DATA = {
            title: 'Find this Elasticsearch',
            description: '',
            visibility: 'unlisted',
            difficulty: 'beginner',
            language: 'fr',
            tags: ['css', 'html'],
        }
        let res = await Axios.post(TESTS_URL + Routes.Playlists.CRUD.Create().path, PLAYLIST_DATA, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        playlistUUID = res.data.uuid;
        // Check ES
        await Wait(1500); // ES update
        let ESresult = await ES.get<IPlaylistElasticSearch>({
            index: Constants.ElasticSearch.playlists.index,
            type: Constants.ElasticSearch.playlists.type,
            id: playlistUUID
        });
        let ESplaylist = ESresult._source;
        Expect(ESplaylist.title).to.deep.equal(PLAYLIST_DATA.title);
        Expect(ESplaylist.description).to.deep.equal(PLAYLIST_DATA.description);
        Expect(ESplaylist.difficulty).to.deep.equal(PLAYLIST_DATA.difficulty);
        Expect(ESplaylist.language).to.deep.equal(PLAYLIST_DATA.language);
        Expect(ESplaylist.visibility).to.deep.equal(PLAYLIST_DATA.visibility);
        Expect(ESplaylist.tags).to.have.members(PLAYLIST_DATA.tags);
        Expect(ESplaylist.videosTitle).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosDescription).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosTags).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosCount).to.deep.equal(0);
    });
    it('Update a playlist', async () => {
        let PLAYLIST_DATA = {
            title: 'New title for Elasticsearch playlist',
            description: 'And it includes description',
            visibility: 'public',
            difficulty: 'confirmed',
            language: 'en',
            tags: ['java'],
        }
        await Axios.put(TESTS_URL + Routes.Playlists.CRUD.Update(playlistUUID).path, PLAYLIST_DATA, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // Check ES
        await Wait(1500); // ES update
        let ESresult = await ES.get<IPlaylistElasticSearch>({
            index: Constants.ElasticSearch.playlists.index,
            type: Constants.ElasticSearch.playlists.type,
            id: playlistUUID
        });
        let ESplaylist = ESresult._source;
        Expect(ESplaylist.title).to.deep.equal(PLAYLIST_DATA.title);
        Expect(ESplaylist.description).to.deep.equal(PLAYLIST_DATA.description);
        Expect(ESplaylist.difficulty).to.deep.equal(PLAYLIST_DATA.difficulty);
        Expect(ESplaylist.language).to.deep.equal(PLAYLIST_DATA.language);
        Expect(ESplaylist.visibility).to.deep.equal(PLAYLIST_DATA.visibility);
        Expect(ESplaylist.tags).to.have.members(PLAYLIST_DATA.tags);
        Expect(ESplaylist.videosTitle).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosDescription).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosTags).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosCount).to.deep.equal(0);
    });
    it('Add video to playlist', async () => {
        let VIDEO_DATA = {
            videoId: TESTS_VIDEO_ID,
            title: 'Title of video in Elasticsearch playlist',
            description: 'Drink water.',
            visibility: 'public',
            language: 'it',
            difficulty: 'intermediate',
            github: 'https://github.com/hapijs/hapi',
            tags: ['c#'],
            collaborators: []
        }
        await Axios.post(TESTS_URL + Routes.Videos.CRUD.Create().path, VIDEO_DATA, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        await Axios.post(TESTS_URL + Routes.Playlists.Videos.CRUD.Create(playlistUUID, TESTS_VIDEO_ID).path, VIDEO_DATA, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // Check ES
        await Wait(1500); // ES update
        let ESresult = await ES.get<IPlaylistElasticSearch>({
            index: Constants.ElasticSearch.playlists.index,
            type: Constants.ElasticSearch.playlists.type,
            id: playlistUUID
        });
        let ESplaylist = ESresult._source;
        Expect(ESplaylist.videosTitle).to.eql([VIDEO_DATA.title]);
        Expect(ESplaylist.videosDescription).to.eql([VIDEO_DATA.description]);
        Expect(ESplaylist.videosTags).to.eql(VIDEO_DATA.tags);
        Expect(ESplaylist.videosCount).to.deep.equal(1);
    });
    it('Update video visibility to unlisted', async () => {
        await Axios.put(TESTS_URL + Routes.Videos.CRUD.Update(TESTS_VIDEO_ID).path, { visibility: 'unlisted' }, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // Check ES
        await Wait(1500); // ES update
        let ESresult = await ES.get<IPlaylistElasticSearch>({
            index: Constants.ElasticSearch.playlists.index,
            type: Constants.ElasticSearch.playlists.type,
            id: playlistUUID
        });
        let ESplaylist = ESresult._source;
        Expect(ESplaylist.videosTitle).to.be.an('array').of.length(1);
        Expect(ESplaylist.videosDescription).to.be.an('array').of.length(1);
        Expect(ESplaylist.videosTags).to.be.an('array').of.length(1);
        Expect(ESplaylist.videosCount).to.deep.equal(1);
    });
    it('Update video visibility to private', async () => {
        await Axios.put(TESTS_URL + Routes.Videos.CRUD.Update(TESTS_VIDEO_ID).path, { visibility: 'private' }, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // Check ES
        await Wait(1500); // ES update
        let ESresult = await ES.get<IPlaylistElasticSearch>({
            index: Constants.ElasticSearch.playlists.index,
            type: Constants.ElasticSearch.playlists.type,
            id: playlistUUID
        });
        let ESplaylist = ESresult._source;
        Expect(ESplaylist.videosTitle).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosDescription).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosTags).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosCount).to.deep.equal(0);
    });
    it('Remove video from playlist', async () => {
        await Axios.delete(TESTS_URL + Routes.Playlists.Videos.CRUD.Delete(playlistUUID, TESTS_VIDEO_ID).path, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // Check ES
        await Wait(1500); // ES update
        let ESresult = await ES.get<IPlaylistElasticSearch>({
            index: Constants.ElasticSearch.playlists.index,
            type: Constants.ElasticSearch.playlists.type,
            id: playlistUUID
        });
        let ESplaylist = ESresult._source;
        Expect(ESplaylist.videosTitle).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosDescription).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosTags).to.be.an('array').of.length(0);
        Expect(ESplaylist.videosCount).to.deep.equal(0);
    });
    it('Delete playlist', async () => {
        await Axios.delete(TESTS_URL + Routes.Playlists.CRUD.Delete(playlistUUID).path, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // Check ES
        await Wait(1500); // ES update
        try{
            await ES.get<IPlaylistElasticSearch>({
                index: Constants.ElasticSearch.playlists.index,
                type: Constants.ElasticSearch.playlists.type,
                id: playlistUUID
            });
            Expect.fail('ES is supposed to throw error Not Found');
        }
        catch(error){
            Expect(error.message).to.equal(new ESerrors.NotFound().message);
        }
    });
    after(async function(){
        before(async function(){
            if(!TESTS_GOOGLE_ENABLED) this.skip();
        });
        await Video.destroy({ where: { UserId: Data.USER_INSTANCE.id } });
    });
});