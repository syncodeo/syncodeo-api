import 'mocha';

import { DB, testMissingAuth, testYoutubeAccountLinked, testError, Errors, testSuccess, checkCodeResponse, Expect, createVideo } from './helpers';
import Routes from './routes';
import { Video, Code } from '../src/models';
import { UserInstance } from '../src/models/User';
import { TESTS_VIDEO_ID } from '../src/config';
import { VideoInstance } from '../src/models/Video';
import { CodeInstance } from '../src/models/Code';

const uuidv4 = require('uuid/v4');

describe('Create a code', () => {
    let video: VideoInstance;
    let CODE_DATA = {
        title: 'Code title',
        value: 'if(a === 5) console.log(a)',
        mode: 'javascript',
        time: 10,
        githubLink: ''
    };
    before(async () => {
        video = await createVideo();
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Videos.Codes.CRUD.Create(video.videoId));
    });
    it('404 - Video not found', async () => {
        let data = { payload: CODE_DATA, headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Create('azazazazazw'), Errors.VideoNotFound, data);
    });
    it('403 - Can\'t edit ressource', async () => {
        let data = { payload: CODE_DATA, headers: { authorization: DB.lambda.token } };
        await testError(Routes.Videos.Codes.CRUD.Create(video.videoId), Errors.CantEditRessource, data);
    });
    it('400 - Time out of video range < 0', async () => {
        let data = { payload: { ...CODE_DATA, time: -1 }, headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Create(video.videoId), Errors.InvalidRequestPayload, data);
    });
    it('400 - Time out of video range > video.duration', async () => {
        let data = { payload: { ...CODE_DATA, time: video.duration + 1 }, headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Create(video.videoId), Errors.CodeTimeOutOfRange, data);
    });
    it('400 - Code added as owner, github value to null', async () => {
        let data = { payload: CODE_DATA, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.Create(video.videoId), 201, data);
        let codeDB = await Code.findOne({ where: { VideoId: video.id, time: CODE_DATA.time } });
        checkCodeResponse(res.body, codeDB.formatDisplay());
    });
    it('400 - Code added as collaborator, value to null when github', async () => {
        let time = CODE_DATA.time + 10;
        let githubLink = 'https://raw.githubusercontent.com/hapijs/hapi/master/README.md';
        let data = { 
            payload: { ...CODE_DATA, value: '', githubLink, time },
            headers: { authorization: DB.collaborator.token }
        };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.Create(video.videoId), 201, data);
        let codeDB = await Code.findOne({ where: { VideoId: video.id, time } });
        checkCodeResponse(res.body, codeDB.formatDisplay());
    });
    it('400 - Code time already exist', async () => {
        let data = { payload: CODE_DATA, headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Create(video.videoId), Errors.CodeTimeAlreadyExists, data);
    });
    after(async () => {
        await Code.destroy({ where: { VideoId: video.id } });
        await video.destroy();
    });
});

describe('Delete a code', () => {
    let video: VideoInstance;
    let code1: CodeInstance, code2: CodeInstance;
    before(async () => {
        video = await createVideo();
        code1 = await Code.create({
            title: 'code 1',
            value: '',
            mode: 'java',
            time: 10,
            githubBranch: null, githubUser: null, githubPath: null, githubRepository: null,
            VideoId: video.id
        });
        code2 = await Code.create({
            title: 'code 2',
            value: '',
            mode: 'java',
            time: 15,
            githubBranch: null, githubUser: null, githubPath: null, githubRepository: null,
            VideoId: video.id
        });
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Videos.Codes.CRUD.Delete(video.videoId, code1.uuid));
    });
    it('404 - Video not found', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Delete('azazazazazw', code1.uuid), Errors.VideoNotFound, data);
    });
    it('404 - Code not found', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Delete(video.videoId, uuidv4()), Errors.CodeNotFound, data);
    });
    it('403 - Can\'t edit ressource', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        await testError(Routes.Videos.Codes.CRUD.Delete(video.videoId, code1.uuid), Errors.CantEditRessource, data);
    });
    it('204 - Delete code with owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Videos.Codes.CRUD.Delete(video.videoId, code1.uuid), 204, data);
        // Verification BDD
        let codeDB = await Code.findOne({ where: { VideoId: video.id, time: code1.time } });
        Expect(codeDB).to.be.null;
    });
    it('204 - Delete code with collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        await testSuccess(Routes.Videos.Codes.CRUD.Delete(video.videoId, code2.uuid), 204, data);
        // Verification BDD
        let codeDB = await Code.findOne({ where: { VideoId: video.id, time: code2.time } });
        Expect(codeDB).to.be.null;
    });
    after(async () => {
        await video.destroy();
    });
});

describe('Find all codes of a video', () => {
    let video: VideoInstance;
    let code1: CodeInstance, code2: CodeInstance;
    before(async () => {
        video = await createVideo();
        code1 = await Code.create({
            title: 'code 1',
            value: 'true',
            mode: 'c++',
            time: 50,
            githubBranch: null, githubPath: null, githubRepository: null, githubUser: null,
            VideoId: video.id
        });
        code2 = await Code.create({
            title: 'code 2',
            value: 'false',
            mode: 'cobol',
            time: 25,
            githubBranch: null, githubPath: null, githubRepository: null, githubUser: null,
            VideoId: video.id
        });
    });
    it('404 - Video not found', async () => {
        await testError(Routes.Videos.Codes.CRUD.FindAll('azazazazazw'), Errors.VideoNotFound);
    });
    it('200 - public - owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('200 - public - collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('200 - public - lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('200 - public - guest', async () => {
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('Change video visibility to unlisted', async () => {
        await video.update({ visibility: 'unlisted' });
    });
    it('200 - unlisted - owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('200 - unlisted - collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('200 - unlisted - lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('200 - unlisted - guest', async () => {
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('Change video visibility to unlisted', async () => {
        await video.update({ visibility: 'private' });
    });
    it('200 - private - owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('200 - private - collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindAll(video.videoId), 200, data);
        Expect(res.body).to.be.an('array').of.length(2);
        checkCodeResponse(res.body[0], code2.formatDisplay());
        checkCodeResponse(res.body[1], code1.formatDisplay());
    });
    it('404 - private - lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        await testError(Routes.Videos.Codes.CRUD.FindAll(video.videoId), Errors.VideoNotFound, data);
    });
    it('404 - private - guest', async () => {
        await testError(Routes.Videos.Codes.CRUD.FindAll(video.videoId), Errors.VideoNotFound);
    });
    after(async () => {
        await Code.destroy({ where: { VideoId: video.id } });
        await video.destroy();
    });
});

describe('Find a specific code of a video', () => {
    let video: VideoInstance;
    let code: CodeInstance;
    before(async () => {
        video = await createVideo();
        code = await Code.create({
            title: 'code 1',
            value: 'true',
            mode: 'c++',
            time: 50,
            githubBranch: null, githubPath: null, githubRepository: null, githubUser: null,
            VideoId: video.id
        });
    });
    it('404 - Video not found', async () => {
        await testError(Routes.Videos.Codes.CRUD.FindOne('azazazazazw', code.uuid), Errors.VideoNotFound);
    });
    it('404 - Code not found', async () => {
        await testError(Routes.Videos.Codes.CRUD.FindOne(video.videoId, uuidv4()), Errors.CodeNotFound);
    });
    it('200 - public - owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('200 - public - collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('200 - public - lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('200 - public - guest', async () => {
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('Change video visibility to unlisted', async () => {
        await video.update({ visibility: 'unlisted' });
    });
    it('200 - unlisted - owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('200 - unlisted - collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('200 - unlisted - lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('200 - unlisted - guest', async () => {
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('Change video visibility to unlisted', async () => {
        await video.update({ visibility: 'private' });
    });
    it('200 - private - owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('200 - private - collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.formatDisplay());
    });
    it('404 - private - lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        await testError(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), Errors.VideoNotFound, data);
    });
    it('404 - private - guest', async () => {
        await testError(Routes.Videos.Codes.CRUD.FindOne(video.videoId, code.uuid), Errors.VideoNotFound);
    });
    after(async () => {
        await Code.destroy({ where: { VideoId: video.id } });
        await video.destroy();
    });
});

describe('Update a code', () => {
    let video: VideoInstance;
    let code: CodeInstance;
    before(async () => {
        video = await createVideo();
        code = await Code.create({
            title: 'Updatable code',
            mode: 'html',
            value: '<p>Bonjour</p>',
            time: 10,
            githubBranch: null, githubPath: null, githubRepository: null, githubUser: null,
            VideoId: video.id
        });
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid));
    });
    it('404 - Video not found', async () => {
        let data = { payload: {},  headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Update('azazazazazw', code.uuid), Errors.VideoNotFound, data);
    });
    it('404 - Code not found', async () => {
        let data = { payload: {}, headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Update(video.videoId, uuidv4()), Errors.CodeNotFound, data);
    });
    it('403 - Can\'t edit ressource', async () => {
        let data = { payload: {}, headers: { authorization: DB.lambda.token } };
        await testError(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), Errors.CantEditRessource, data);
    });
    it('400 - Time out of range < 0', async () => {
        let data = { payload: { time: -1 }, headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), Errors.InvalidRequestPayload, data);
    });
    it('400 - Time out of range = video.duration', async () => {
        let data = { payload: { time: video.duration }, headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), Errors.CodeTimeOutOfRange, data);
    });
    it('400 - Code time already exist', async () => {
        let placeholderCode = await Code.create({
            title: 'Hello',
            value: 'abcde',
            mode: 'oui',
            time: 55,
            githubBranch: null, githubPath: null, githubRepository: null, githubUser: null,
            VideoId: video.id
        });
        let data = { payload: { time: placeholderCode.time }, headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), Errors.CodeTimeAlreadyExists, data);
    });
    it('200 - Update time', async () => {
        let time = 15;
        let data = { payload: { time }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.set({ time }).formatDisplay());
        // Verification BDD
        let codeDB = await Code.findOne({ where: { uuid: code.uuid } });
        Expect(codeDB.time).to.deep.equal(codeDB.time);
    });
    it('200 - Update title', async () => {
        let title = 'updated code title';
        let data = { payload: { title }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.set({ title }).formatDisplay());
        // Verification BDD
        let codeDB = await Code.findOne({ where: { uuid: code.uuid } });
        Expect(codeDB.title).to.deep.equal(codeDB.title);
    });
    it('200 - Update mode as collaborator', async () => {
        let mode = 'updatedmode';
        let data = { payload: { mode }, headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), 200, data);
        checkCodeResponse(res.body, code.set({ mode }).formatDisplay());
        // Verification BDD
        let codeDB = await Code.findOne({ where: { uuid: code.uuid } });
        Expect(codeDB.mode).to.deep.equal(codeDB.mode);
    });
    it('200 - Update github', async () => {
        let githubLink = 'https://raw.githubusercontent.com/hapijs/hapi/master/README.md';
        let github = {
            user: 'hapijs',
            repository: 'hapi',
            branch: 'master',
            path: 'README.md'
        };
        let data = { payload: { githubLink }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), 200, data);
        code.set({ value: null, githubUser: github.user, githubRepository: github.repository, githubBranch: github.branch, githubPath: github.path });
        checkCodeResponse(res.body, code.formatDisplay());
        // Verification BDD
        let codeDB = await Code.findOne({ where: { uuid: code.uuid } });
        Expect(codeDB.value).to.deep.equal(null);
        Expect(codeDB.githubUser).to.deep.equal(github.user);
        Expect(codeDB.githubRepository).to.deep.equal(github.repository);
        Expect(codeDB.githubBranch).to.deep.equal(github.branch);
        Expect(codeDB.githubPath).to.deep.equal(github.path);
    });
    it('200 - Update value', async () => {
        let value = 'let updatedvalue = true;';
        let data = { payload: { value }, headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Codes.CRUD.Update(video.videoId, code.uuid), 200, data);
        code.set({ value, githubUser: null, githubRepository: null, githubBranch: null, githubPath: null });
        checkCodeResponse(res.body, code.formatDisplay());
        // Verification BDD
        let codeDB = await Code.findOne({ where: { uuid: code.uuid } });
        Expect(codeDB.value).to.deep.equal(codeDB.value);
        Expect(codeDB.githubUser).to.deep.equal(null);
        Expect(codeDB.githubRepository).to.deep.equal(null);
        Expect(codeDB.githubBranch).to.deep.equal(null);
        Expect(codeDB.githubPath).to.deep.equal(null);
    });
    after(async () => {
        await Code.destroy({ where: { VideoId: video.id } });
        await video.destroy();
    });
});