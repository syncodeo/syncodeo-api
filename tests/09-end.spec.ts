import 'mocha';

import { Expect } from './helpers';
import Routes from './routes';
import { Video, Playlist, Tag, PlaylistTag, PlaylistVideos, Collaborator, Code } from '../src/models';

describe('Check database', () => {
    it('Videos table should be empty', async () => {
        let videos = await Video.findAll();
        Expect(videos).to.be.an('array').of.length(0);
    });
    it('Playlists table should be empty', async () => {
        let playlists = await Playlist.findAll();
        Expect(playlists).to.be.an('array').of.length(0);
    });
    it('Tags table should be empty', async () => {
        let tags = await Tag.findAll();
        Expect(tags).to.be.an('array').of.length(0);
    });
    it('PlaylistTags table should be empty', async () => {
        let playlistTags = await PlaylistTag.findAll();
        Expect(playlistTags).to.be.an('array').of.length(0);
    });
    it('PlaylistVideos table should be empty', async () => {
        let playlistVideos = await PlaylistVideos.findAll();
        Expect(playlistVideos).to.be.an('array').of.length(0);
    });
    it('Collaborators table should be empty', async () => {
        let collaborators = await Collaborator.findAll();
        Expect(collaborators).to.be.an('array').of.length(0);
    });
    it('Codes table should be empty', async () => {
        let codes = await Code.findAll();
        Expect(codes).to.be.an('array').of.length(0);
    });
});