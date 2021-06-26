import 'mocha';

import { testError, Errors, testSuccess, DB, checkUserResponse, createVideo, createPlaylist, Expect, checkPlaylistResponse, checkVideoResponse, Wait } from './helpers';
import Routes from './routes';
import { PlaylistInstance } from '../src/models/Playlist';
import { VideoInstance } from '../src/models/Video';
import { PlaylistVideosAttributes, PlaylistVideosInstance } from '../src/models/PlaylistVideos';
import { Playlist, Video } from '../src/models';

const uuidv4 = require('uuid/v4');

describe('Show specific user data', () => {
    it('404 - User not found', async () => {
        await testError(Routes.Users.CRUD.FindOne(uuidv4()), Errors.UserNotFound);
    });
    it('200 - Main user data', async () => {
        let res = await testSuccess(Routes.Users.CRUD.FindOne(DB.main.user.uuid), 200);
        checkUserResponse(res.body, DB.main.user.formatDisplay());
    });
    it('200 - YoutubeLinked user data', async () => {
        let res = await testSuccess(Routes.Users.CRUD.FindOne(DB.youtubeLinked.user.uuid), 200);
        checkUserResponse(res.body, DB.youtubeLinked.user.formatDisplay());
    });
    it('200 - Lambda user data', async () => {
        let res = await testSuccess(Routes.Users.CRUD.FindOne(DB.lambda.user.uuid), 200);
        checkUserResponse(res.body, DB.lambda.user.formatDisplay());
    });
});

describe('List playlists of user', () => {
    let publicFull: PlaylistInstance;               // P1
    let publicFullIfCollaborator: PlaylistInstance; // P2
    let publicEmpty: PlaylistInstance;              // P3
    let unlistedFull: PlaylistInstance;             // P4
    let privateFull: PlaylistInstance;              // P5
    let videoPublicCollab: VideoInstance;
    let videoUnlistedCollab: VideoInstance;
    let videoPrivateCollab: VideoInstance;
    before(async () => {
        // Videos
        videoPublicCollab = await createVideo();
        await videoPublicCollab.update({ videoId: 'lstPvideo1w', title: 'List videos, video 1' });
        videoUnlistedCollab = await createVideo();
        await videoUnlistedCollab.update({ videoId: 'lstPvideo2w', visibility: 'unlisted', title: 'List playlists, video 2' });
        videoPrivateCollab = await createVideo();
        await videoPrivateCollab.update({ videoId: 'lstPvideo3w', visibility: 'private', title: 'List plylists, video 3' });
        // Playlists
        publicFull = await createPlaylist(); // P1
        await publicFull.update({ title: 'E List playlist, playlist 1' });
        await publicFull.addVideo(videoPublicCollab, { through: { rank: 1 } as PlaylistVideosInstance });
        await publicFull.addVideo(videoUnlistedCollab, { through: { rank: 2 } as PlaylistVideosInstance });
        await publicFull.addVideo(videoPrivateCollab, { through: { rank: 3 } as PlaylistVideosInstance });
        publicFullIfCollaborator = await createPlaylist(); // P2
        await publicFullIfCollaborator.update({ title: 'D List playlist, playlist 2' });
        await publicFullIfCollaborator.addVideo(videoUnlistedCollab, { through: { rank: 1 } as PlaylistVideosInstance });
        await publicFullIfCollaborator.addVideo(videoPrivateCollab, { through: { rank: 2 } as PlaylistVideosInstance });
        publicEmpty = await createPlaylist(); // P3
        await publicEmpty.update({ title: 'C List playlist, playlist 3' });
        unlistedFull = await createPlaylist(); // P4
        await unlistedFull.update({ visibility: 'unlisted', title: 'B List playlist, playlist 4' });
        await unlistedFull.addVideo(videoPublicCollab, { through: { rank: 1 } as PlaylistVideosInstance });
        await unlistedFull.addVideo(videoUnlistedCollab, { through: { rank: 2 } as PlaylistVideosInstance });
        await unlistedFull.addVideo(videoPrivateCollab, { through: { rank: 3 } as PlaylistVideosInstance });
        privateFull = await createPlaylist(); // P5
        await privateFull.update({ visibility: 'private', title: 'A List playlist, playlist 5' });
        await privateFull.addVideo(videoPublicCollab, { through: { rank: 1 } as PlaylistVideosInstance });
        await privateFull.addVideo(videoUnlistedCollab, { through: { rank: 2 } as PlaylistVideosInstance });
        await privateFull.addVideo(videoPrivateCollab, { through: { rank: 3 } as PlaylistVideosInstance });
        // Reloads
        await publicFull.reload({ include: Playlist.includes });
        await publicFullIfCollaborator.reload({ include: Playlist.includes });
        await publicEmpty.reload({ include: Playlist.includes });
        await unlistedFull.reload({ include: Playlist.includes });
        await privateFull.reload({ include: Playlist.includes });
        await videoPublicCollab.reload({ include: Video.includes });
        await videoUnlistedCollab.reload({ include: Video.includes });
        await videoPrivateCollab.reload({ include: Video.includes });
    });
    it('404 - User not found', async () => {
        await testError(Routes.Users.Playlists.CRUD.FindAll(uuidv4()), Errors.UserNotFound);
    });
    it('200 - Owner - Show p1, p2, p3, p4, p5', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Users.Playlists.CRUD.FindAll(DB.main.user.uuid), 200, data);
        Expect(res.body).to.be.an('array').of.length(5);
        // Check P5
        checkPlaylistResponse(res.body[0], privateFull.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[0].videos[0], videoPublicCollab.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[0].videos[1], videoUnlistedCollab.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[0].videos[2], videoPrivateCollab.formatDisplay(DB.main.user));
        // Check P4
        checkPlaylistResponse(res.body[1], unlistedFull.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[1].videos[0], videoPublicCollab.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[1].videos[1], videoUnlistedCollab.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[1].videos[2], videoPrivateCollab.formatDisplay(DB.main.user));
        // Check P3
        checkPlaylistResponse(res.body[2], publicEmpty.formatDisplay(DB.main.user));
        // Check P2
        checkPlaylistResponse(res.body[3], publicFullIfCollaborator.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[3].videos[0], videoUnlistedCollab.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[3].videos[1], videoPrivateCollab.formatDisplay(DB.main.user));
        // Check P1
        checkPlaylistResponse(res.body[4], publicFull.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[4].videos[0], videoPublicCollab.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[4].videos[1], videoUnlistedCollab.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[4].videos[2], videoPrivateCollab.formatDisplay(DB.main.user));
    });
    it('200 - Collaborator - Show p1, p2', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Users.Playlists.CRUD.FindAll(DB.main.user.uuid), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        // Check P2
        checkPlaylistResponse(res.body[0], publicFullIfCollaborator.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[0].videos[0], videoUnlistedCollab.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[0].videos[1], videoPrivateCollab.formatDisplay(DB.collaborator.user));
        // Check P1
        checkPlaylistResponse(res.body[1], publicFull.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[1].videos[0], videoPublicCollab.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[1].videos[1], videoUnlistedCollab.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[1].videos[2], videoPrivateCollab.formatDisplay(DB.collaborator.user));
    });
    it('200 - Lambda - Show p1', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Users.Playlists.CRUD.FindAll(DB.main.user.uuid), 200, data);
        Expect(res.body).to.be.an('array').of.length(1);
        // Check P1
        checkPlaylistResponse(res.body[0], publicFull.formatDisplay(DB.lambda.user));
        checkVideoResponse(res.body[0].videos[0], videoPublicCollab.formatDisplay(DB.lambda.user));
    });
    it('200 - Guest - Show p1', async () => {
        let res = await testSuccess(Routes.Users.Playlists.CRUD.FindAll(DB.main.user.uuid), 200);
        Expect(res.body).to.be.an('array').of.length(1);
        // Check P1
        checkPlaylistResponse(res.body[0], publicFull.formatDisplay());
        checkVideoResponse(res.body[0].videos[0], videoPublicCollab.formatDisplay());
    });
    after(async () => {
        await Promise.all([
            videoPublicCollab,
            videoUnlistedCollab,
            videoPrivateCollab
        ].map(v => v.destroy()));
        await Promise.all([
            publicFull,
            publicFullIfCollaborator,
            publicEmpty,
            unlistedFull,
            privateFull
        ].map(p => p.destroy()));
    });
});

describe('List videos of user', () => {
    let publicVideo: VideoInstance;
    let unlistedVideo: VideoInstance;
    let privateVideo: VideoInstance;
    before(async () => {
        publicVideo = await createVideo();
        await publicVideo.update({ videoId: 'lstVvideo1w', title: 'List videos, video 1 public' });
        await publicVideo.reload({ include: Video.includes });
        await Wait(1500); // Pour l'ordre (et le chaos...)
        unlistedVideo = await createVideo();
        await unlistedVideo.update({ videoId: 'lstVvideo2w', visibility: 'unlisted', title: 'List videos, video 2 unlisted' });
        await unlistedVideo.reload({ include: Video.includes });
        await Wait(1500); // Pour l'ordre
        privateVideo = await createVideo();
        await privateVideo.update({ videoId: 'lstVvideo3w', visibility: 'private', title: 'List videos, video 3 private' });
        await privateVideo.reload({ include: Video.includes });
        // La public apparaitra donc en dernier
    });
    it('404 - User not found', async () => {
        await testError(Routes.Users.Videos.CRUD.FindAll(uuidv4()), Errors.UserNotFound);
    });
    it('200 - Owner - See all', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Users.Videos.CRUD.FindAll(DB.main.user.uuid), 200, data);
        Expect(res.body).to.be.an('array').of.length(3);
        checkVideoResponse(res.body[0], privateVideo.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[1], unlistedVideo.formatDisplay(DB.main.user));
        checkVideoResponse(res.body[2], publicVideo.formatDisplay(DB.main.user));
    });
    it('200 - Collaborator - See all', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Users.Videos.CRUD.FindAll(DB.main.user.uuid), 200, data);
        Expect(res.body).to.be.an('array').of.length(3);
        checkVideoResponse(res.body[0], privateVideo.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[1], unlistedVideo.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[2], publicVideo.formatDisplay(DB.collaborator.user));
    });
    it('200 - Lambda - See public', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Users.Videos.CRUD.FindAll(DB.main.user.uuid), 200, data);
        Expect(res.body).to.be.an('array').of.length(1);
        checkVideoResponse(res.body[0], publicVideo.formatDisplay(DB.lambda.user));
    });
    it('200 - Guest - See public', async () => {
        let res = await testSuccess(Routes.Users.Videos.CRUD.FindAll(DB.main.user.uuid), 200);
        Expect(res.body).to.be.an('array').of.length(1);
        checkVideoResponse(res.body[0], publicVideo.formatDisplay());
    });
    it('200 - Owner - See collaborators video', async () => {
        let data = { query: { collaborator: true }, headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Users.Videos.CRUD.FindAll(DB.collaborator.user.uuid), 200, data);
        Expect(res.body).to.be.an('array').of.length(3);
        checkVideoResponse(res.body[0], privateVideo.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[1], unlistedVideo.formatDisplay(DB.collaborator.user));
        checkVideoResponse(res.body[2], publicVideo.formatDisplay(DB.collaborator.user));
    });
    it('401 - Lambda - Require authorization', async () => {
        let data = { query: { collaborator: true }, headers: { authorization: DB.lambda.token } };
        await testError(Routes.Users.Videos.CRUD.FindAll(DB.main.user.uuid), Errors.RequireAuthorization, data);
    });
    after(async () => {
        await Promise.all([publicVideo, unlistedVideo, privateVideo].map(v => v.destroy()));
    });
});