import 'mocha';
import Axios from 'axios';

import { testMissingAuth, testYoutubeAccountLinked, DB, testError, Errors, testSuccess, Data, validateBody, Joi, Expect, checkVideoResponse, Wait, ES, Constants, methodPathParamsToRequest, checkCodeResponse, ESerrors } from './helpers';
import Routes from './routes';
import { TESTS_VIDEO_ID, TESTS_GOOGLE_ENABLED, ELASTIC_SEARCH_HOST, TESTS_URL } from '../src/config';
import { User, Video, Code, Collaborator, Tag } from '../src/models';
import { VideoInstance } from '../src/models/Video';
import { CodeInstance } from '../src/models/Code';
import { IVideoFormatDisplay, IVideoElasticSearch } from '../src/interfaces/model';

describe('Add a video', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip(); });
    let VIDEO_DATA = { videoId: '', title: '', description: '', visibility: '', language: '', difficulty: '', github: '', collaborators: [] as string[], tags: [] as string[] }
    it('Create video data', () => {
        VIDEO_DATA = {
            videoId: TESTS_VIDEO_ID,
            title: 'New video',
            description: 'This is a new video',
            visibility: 'public',
            language: 'en',
            difficulty: 'beginner',
            github: '',
            collaborators: [DB.collaborator.user.mail],
            tags: ['c++', 'java']
        }
    })
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Videos.CRUD.Create());
    });
    it('400 - Youtube account not linked', async () => {
        let data = { payload: VIDEO_DATA };
        await testYoutubeAccountLinked(Routes.Videos.CRUD.Create(), data);
    });
    it('400 - Not author', async () => {
        // Pre
        let user = await User.getByUuid(Data.USER_UUID);
        let channelId = user.channelId;
        await user.update({ channelId: '0123456789' })
        // Test
        let data = { payload: VIDEO_DATA, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testError(Routes.Videos.CRUD.Create(), Errors.NotAuthor, data);
        // Post
        await user.update({ channelId });
    });
    it('400 - Video does not exist', async () => {
        let data = { payload: { ...VIDEO_DATA, videoId: 'azazazazazw' }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testError(Routes.Videos.CRUD.Create(), Errors.VideoDoesNotExists, data);
    });
    it('201 - Video created', async () => {
        let data = { payload: VIDEO_DATA, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        let res = await testSuccess(Routes.Videos.CRUD.Create(), 201, data);
        let videoDB = await Video.findOne({ where: { videoId: VIDEO_DATA.videoId }, include: Video.includes });
        checkVideoResponse(res.body, videoDB.formatDisplay(Data.USER_INSTANCE));
    });
    it('409 - Video already registered', async () => {
        let data = { payload: VIDEO_DATA, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testError(Routes.Videos.CRUD.Create(), Errors.VideoAlreadyRegistered, data);
    });
    after(async function(){
        if(!TESTS_GOOGLE_ENABLED) this.skip();
        await Video.destroy({ where: { videoId: VIDEO_DATA.videoId } });
    });
});

describe('Delete a video', () => {
    let video: VideoInstance;
    before(async () => {
        video = await Video.create({
            videoId: 'syncodeoAww',
            title: 'Delete me',
            description: 'Video a supprimer',
            difficulty: 'beginner',
            visibility: 'public',
            language: 'fr',
            duration: 150,
            github: '',
            UserId: DB.main.user.id
        });
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Videos.CRUD.Delete(video.videoId));
    });
    it('404 - Video not found', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testError(Routes.Videos.CRUD.Delete('azazazazazw'), Errors.VideoNotFound, data);
    });
    it('400 - Can\'t edit ressource', async () => {
        let data = { headers: { authorization: DB.lambda.token } }
        await testError(Routes.Videos.CRUD.Delete(video.videoId), Errors.CantEditRessource, data);
    });
    it('204 - Deleted', async () => {
        let data = { headers: { authorization: DB.main.token } };
        await testSuccess(Routes.Videos.CRUD.Delete(video.videoId), 204, data);
        // Vérification BDD
        let videoDB = await Video.findAll({ where: { videoId: video.videoId }});
        Expect(videoDB).to.be.a('array').of.length(0);
    });
});

describe('Update a video', () => {
    let video: VideoInstance;
    before(async () => {
        video = await Video.create({
            videoId: 'syncodeoAww',
            title: 'Update me',
            description: 'Video a update',
            difficulty: 'confirmed',
            visibility: 'unlisted',
            language: 'en',
            duration: 99,
            github: '',
            UserId: DB.main.user.id
        });
        video = await video.reload({ where: { id: video.id }, include: Video.includes });
    });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Videos.CRUD.Update(video.videoId));
    });
    it('404 - Video not found', async () => {
        let data = { headers: { authorization: DB.main.token }, payload: {} };
        await testError(Routes.Videos.CRUD.Update('azazazazazw'), Errors.VideoNotFound, data);
    });
    it('400 - Can\'t edit ressource', async () => {
        let data = { headers: { authorization: DB.lambda.token }, payload: {} }
        await testError(Routes.Videos.CRUD.Update(video.videoId), Errors.CantEditRessource, data);
    });
    it('200 - Update title', async () => {
        let title = 'New updated title';
        let data = { headers: { authorization: DB.main.token }, payload: { title } };
        let res = await testSuccess(Routes.Videos.CRUD.Update(video.videoId), 200, data);
        checkVideoResponse(res.body, video.set({ title }).formatDisplay(DB.main.user));
        // Vérification BDD
        let videoDB = await Video.findOne({ where: { videoId: video.videoId }});
        Expect(videoDB.title).to.deep.equal(title);
    });
    it('200 - Update description', async () => {
        let description = 'New updated description';
        let data = { headers: { authorization: DB.main.token }, payload: { description } };
        let res = await testSuccess(Routes.Videos.CRUD.Update(video.videoId), 200, data);
        checkVideoResponse(res.body, video.set({ description }).formatDisplay(DB.main.user));
        // Vérification BDD
        let videoDB = await Video.findOne({ where: { videoId: video.videoId }});
        Expect(videoDB.description).to.deep.equal(description);
    });
    it('200 - Update visibility', async () => {
        let visibility = 'private';
        let data = { headers: { authorization: DB.main.token }, payload: { visibility } };
        let res = await testSuccess(Routes.Videos.CRUD.Update(video.videoId), 200, data);
        checkVideoResponse(res.body, video.set({ visibility }).formatDisplay(DB.main.user));
        // Vérification BDD
        let videoDB = await Video.findOne({ where: { videoId: video.videoId }});
        Expect(videoDB.visibility).to.deep.equal(visibility);
    });
    it('200 - Update language', async () => {
        let language = 'it';
        let data = { headers: { authorization: DB.main.token }, payload: { language } };
        let res = await testSuccess(Routes.Videos.CRUD.Update(video.videoId), 200, data);
        checkVideoResponse(res.body, video.set({ language }).formatDisplay(DB.main.user));
        // Vérification BDD
        let videoDB = await Video.findOne({ where: { videoId: video.videoId }});
        Expect(videoDB.language).to.deep.equal(language);
    });
    it('200 - Update difficulty', async () => {
        let difficulty = 'beginner';
        let data = { headers: { authorization: DB.main.token }, payload: { difficulty } };
        let res = await testSuccess(Routes.Videos.CRUD.Update(video.videoId), 200, data);
        checkVideoResponse(res.body, video.set({ difficulty }).formatDisplay(DB.main.user));
        // Vérification BDD
        let videoDB = await Video.findOne({ where: { videoId: video.videoId }});
        Expect(videoDB.difficulty).to.deep.equal(difficulty);
    });
    it('200 - Update GitHub', async () => {
        let github = 'https://github.com/hapijs/hapi/tree/master/lib';
        let data = { headers: { authorization: DB.main.token }, payload: { github } };
        let res = await testSuccess(Routes.Videos.CRUD.Update(video.videoId), 200, data);
        checkVideoResponse(res.body, video.set({ github }).formatDisplay(DB.main.user));
        // Vérification BDD
        let videoDB = await Video.findOne({ where: { videoId: video.videoId }});
        Expect(videoDB.github).to.deep.equal(github);
    });
    it('200 - Update collaborators', async () => {
        let collaborators = ['collaborator@new.com', 'second@test.org'];
        let data = { headers: { authorization: DB.main.token }, payload: { collaborators } };
        let res = await testSuccess(Routes.Videos.CRUD.Update(video.videoId), 200, data);
        checkVideoResponse(res.body, video.set({ collaborators: collaborators.map(c => { return { mail: c }; }) }).formatDisplay(DB.main.user));
        // Vérification BDD
        let videoDB = await Video.findOne({ where: { videoId: video.videoId }});
        let collaboratorsDB = await Collaborator.findAll({ where: { VideoId: videoDB.id } });
        Expect(collaboratorsDB.map(c => c.mail)).to.have.members(collaborators);
    });
    it('200 - Update tags', async () => {
        let tags = ['cobol', 'VB.net'];
        let data = { headers: { authorization: DB.main.token }, payload: { tags } };
        let res = await testSuccess(Routes.Videos.CRUD.Update(video.videoId), 200, data);
        checkVideoResponse(res.body, video.set({ tags: tags.map(t => { return { value: t }; }) }).formatDisplay(DB.main.user));
        // Vérification BDD
        let videoDB = await Video.findOne({ where: { videoId: video.videoId }});
        let tagsDB = await Tag.findAll({ where: { VideoId: videoDB.id } });
        Expect(tagsDB.map(t => t.value)).to.have.members(tags);
    });
    after(async () => {
        await Video.destroy({ where: { videoId: video.videoId } });
    });
});

describe('Get data of one video', () => {
    let video: VideoInstance;
    before(async () => {
        video = await Video.create({
            videoId: 'syncodeoAww',
            title: 'Get my data !',
            description: 'And get my description !',
            language: 'it',
            difficulty: 'intermediate',
            visibility: 'public',
            github: '',
            duration: 42,
            tags: [{ value: 'java' }, { value: 'c#' }],
            collaborators: [{ mail: 'collab@mail.fr' }, { mail: DB.collaborator.user.mail }],
            UserId: DB.main.user.id
        }, { include: Video.includes });
        video = await video.reload({ where: { id: video.id }, include: Video.includes });
    });
    it('404 - Video not found', async () => {
        await testError(Routes.Videos.CRUD.FindOne('azazazazazw'), Errors.VideoNotFound);
    });
    it('200 - Owner - Public', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200, data);
        checkVideoResponse(res.body, video.formatDisplay(DB.main.user));
    });
    it('200 - Collaborator - Public', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200, data);
        checkVideoResponse(res.body, video.formatDisplay(DB.collaborator.user));
    });
    it('200 - Lambda - Public', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200, data);
        checkVideoResponse(res.body, video.formatDisplay(DB.lambda.user));
    });
    it('200 - Guest - Public', async () => {
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200);
        checkVideoResponse(res.body, video.formatDisplay());
    });
    it('Update video visibility to unlisted', async () => {
        await video.update({ visibility: 'unlisted' });
    });
    it('200 - Owner - Unlisted', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200, data);
        checkVideoResponse(res.body, video.formatDisplay(DB.main.user));
    });
    it('200 - Collaborator - Unlisted', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200, data);
        checkVideoResponse(res.body, video.formatDisplay(DB.collaborator.user));
    });
    it('200 - Lambda - Unlisted', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200, data);
        checkVideoResponse(res.body, video.formatDisplay(DB.lambda.user));
    });
    it('200 - Guest - Unlisted', async () => {
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200);
        checkVideoResponse(res.body, video.formatDisplay());
    });
    it('Update video visibility to private', async () => {
        await video.update({ visibility: 'private' });
    });
    it('200 - Owner - Private', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200, data);
        checkVideoResponse(res.body, video.formatDisplay(DB.main.user));
    });
    it('200 - Collaborator - Private', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.CRUD.FindOne(video.videoId), 200, data);
        checkVideoResponse(res.body, video.formatDisplay(DB.collaborator.user));
    });
    it('404 - Lambda - Private', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        await testError(Routes.Videos.CRUD.FindOne(video.videoId), Errors.VideoNotFound, data);
    });
    it('404 - Guest - Private', async () => {
        await testError(Routes.Videos.CRUD.FindOne(video.videoId), Errors.VideoNotFound);
    });
    after(async () => {
        await video.destroy();
    });
});

describe('Gather Youtube video data', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip(); });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Videos.Gather());
    });
    it('400 - Youtube account not linked', async () => {
        let data = { query: { videoId: TESTS_VIDEO_ID } };
        await testYoutubeAccountLinked(Routes.Videos.Gather(), data);
    });
    it('400 - Video does not exist', async () => {
        let data = { query: { videoId: 'azazazazazw' }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testError(Routes.Videos.Gather(), Errors.VideoDoesNotExists, data);
    });
    it('403 - Not author', async () => {
        // Pre
        let channelId = Data.USER_INSTANCE.channelId;
        await Data.USER_INSTANCE.update({ channelId: '0123456789' });
        // Test
        let data = { query: { videoId: TESTS_VIDEO_ID }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testError(Routes.Videos.Gather(), Errors.NotAuthor, data);
        // Post
        await Data.USER_INSTANCE.update({ channelId });
    });
    it('200 - Video data when not registered', async () => {
        let data = { query: { videoId: TESTS_VIDEO_ID }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        let res = await testSuccess(Routes.Videos.Gather(), 200, data);
        validateBody(res.body, {
            videoId: Joi.string().equal(TESTS_VIDEO_ID),
            registered: Joi.boolean().equal(false)
        })
    });
    it('200 - Video data when registered', async () => {
        // Pre
        let video = await Video.create({
            videoId: TESTS_VIDEO_ID,
            title: '',
            description: '',
            difficulty: 'beginner',
            visibility: 'public',
            language: 'fr',
            github: '',
            duration: 150,
            UserId: Data.USER_INSTANCE.id
        });
        // Test
        let data = { query: { videoId: TESTS_VIDEO_ID }, headers: { authorization: Data.USER_ACCESS_TOKEN } };
        let res = await testSuccess(Routes.Videos.Gather(), 200, data);
        validateBody(res.body, {
            videoId: Joi.string().equal(TESTS_VIDEO_ID),
            registered: Joi.boolean().equal(true)
        });
        // Post
        await video.destroy();
    });
});

describe('Get recently updated videos', () => {
    let video1: VideoInstance, video2: VideoInstance, video3: VideoInstance;
    let codeVideo1: CodeInstance, codeVideo2: CodeInstance;
    before(async () => {
        video1 = await Video.create({
            videoId: 'video1azazw',
            title: 'Title video 1',
            description: 'Description video 1',
            difficulty: 'beginner',
            language: 'en',
            visibility: 'public',
            github: '',
            duration: 101,
            UserId: DB.main.user.id
        });
        video2 = await Video.create({
            videoId: 'video2azazw',
            title: 'Title video 2',
            description: 'Description video 2',
            difficulty: 'beginner',
            language: 'en',
            visibility: 'public',
            github: '',
            duration: 102,
            UserId: DB.main.user.id
        });
        video3 = await Video.create({
            videoId: 'video3azazw',
            title: 'Title video 3',
            description: 'Description video 3',
            difficulty: 'beginner',
            language: 'en',
            visibility: 'public',
            github: '',
            duration: 103,
            UserId: DB.main.user.id
        });
        await Wait(1500);
        codeVideo2 = await Code.create({
            title: 'Code video 2',
            value: 'let a = 3',
            mode: 'java',
            time: 5,
            githubBranch: null,
            githubPath: null,
            githubRepository: null,
            githubUser: null,
            VideoId: video2.id
        });
        codeVideo1 = await Code.create({
            title: 'Code video 1',
            value: 'let a = 3',
            mode: 'java',
            time: 5,
            githubBranch: null,
            githubPath: null,
            githubRepository: null,
            githubUser: null,
            VideoId: video1.id
        });
        await Wait(1500);
        await codeVideo1.update({
            time: 10
        });
        // Reloads
        await video1.reload({ where: { id: video1.id }, include: Video.includes });
        await video2.reload({ where: { id: video2.id }, include: Video.includes });
        await video3.reload({ where: { id: video3.id }, include: Video.includes });
    });
    it('Return videos in order', async () => {
        let res = await testSuccess(Routes.Videos.RecentlyUpdated(), 200);
        Expect(res.body.map((v: IVideoFormatDisplay) => v.videoId)).to.eql([video1.videoId, video2.videoId, video3.videoId]);
        checkVideoResponse(res.body[0], video1.formatDisplay());
        checkVideoResponse(res.body[1], video2.formatDisplay());
        checkVideoResponse(res.body[2], video3.formatDisplay());
    });
    it('Don\'t show private videos', async () => {
        // Pre
        await video3.update({ visibility: 'private' });
        // Test
        let res = await testSuccess(Routes.Videos.RecentlyUpdated(), 200);
        Expect(res.body.map((v: IVideoFormatDisplay) => v.videoId)).to.eql([video1.videoId, video2.videoId]);
        checkVideoResponse(res.body[0], video1.formatDisplay());
        checkVideoResponse(res.body[1], video2.formatDisplay());
    });
    it('Don\'t show unlisted videos', async () => {
        // Pre
        await video1.update({ visibility: 'unlisted' });
        // Test
        let res = await testSuccess(Routes.Videos.RecentlyUpdated(), 200);
        Expect(res.body.map((v: IVideoFormatDisplay) => v.videoId)).to.eql([video2.videoId]);
        checkVideoResponse(res.body[0], video2.formatDisplay());
    });
    after(async () => {
        await Promise.all([codeVideo1, codeVideo2].map(instance => instance.destroy()));
        await Promise.all([video1, video2, video3].map(instance => instance.destroy()));
    });
});

describe('Get user recent uploads', () => {
    before(function(){ if(!TESTS_GOOGLE_ENABLED) this.skip() });
    it('401 - Missing auth', async () => {
        await testMissingAuth(Routes.Videos.RecentUploads());
    });
    it('400 - Youtube account not linked', async () => {
        await testYoutubeAccountLinked(Routes.Videos.RecentUploads());
    });
    it('200 - Recent uploads', async () => {
        // Pre
        let video = await Video.create({
            videoId: TESTS_VIDEO_ID,
            title: '',
            description: '',
            github: '',
            difficulty: 'beginner',
            visibility: 'private',
            language: 'fr',
            duration: 150,
            UserId: Data.USER_INSTANCE.id
        });
        // Tests
        let data = { headers: { authorization: Data.USER_ACCESS_TOKEN } };
        let res = await testSuccess(Routes.Videos.RecentUploads(), 200, data);
        Expect(res.body).to.be.an('array').of.length.greaterThan(0);
        for(let v of res.body){
            Expect(v.registered).to.deep.equal(v.videoId === TESTS_VIDEO_ID);
            validateBody(v, {
                videoId: Joi.string(),
                title: Joi.string().allow(''),
                description: Joi.string().allow(''),
                status: Joi.string().valid(['private', 'public', 'unlisted'])
            });
        }
        // Post
        await video.destroy();
    });
});

describe('Search for a video', () => {
    let video: VideoInstance;
    before(async function(){
        if(!TESTS_GOOGLE_ENABLED) this.skip();
        await ES.deleteByQuery({
            index: Constants.ElasticSearch.videos.index,
            type: Constants.ElasticSearch.videos.type,
            body: { query: { match_all: {} } }
        });
        await Axios.post(TESTS_URL + Routes.Videos.CRUD.Create().path, {
            videoId: TESTS_VIDEO_ID,
            title: 'This is my title',
            description: 'wow a description',
            visibility: 'public',
            language: 'fr',
            difficulty: 'beginner',
            collaborators: [],
            tags: ['java'],
            github: ''
        }, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        video = await Video.findOne({ where: { videoId: TESTS_VIDEO_ID }, include: Video.includes });
        await Wait(1500); // ES update (1s)
    });
    it('200 - Found with title - No filter', async () => {
        let data = { query: { query: 'is tile thi' } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(1),
            nextPage: Joi.string().allow(null).equal(null)
        });
        checkVideoResponse(res.body.results[0], video.formatDisplay());
    });
    it('200 - Found with description - No filter', async () => {
        let data = { query: { query: 'wwo desription' } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(1),
            nextPage: Joi.string().allow(null).equal(null)
        });
        checkVideoResponse(res.body.results[0], video.formatDisplay());
    });
    it('200 - Found with title + description - No filter', async () => {
        let data = { query: { query: 'this is my description' } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(1),
            nextPage: Joi.string().allow(null).equal(null)
        });
        checkVideoResponse(res.body.results[0], video.formatDisplay());
    });
    it('200 - Found with tags - No filter', async () => {
        let data = { query: { query: 'java' } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(1),
            nextPage: Joi.string().allow(null).equal(null)
        });
        checkVideoResponse(res.body.results[0], video.formatDisplay());
    });
    it('200 - Found with title + description - Difficulty match', async () => {
        let data = { query: { query: 'this is my description', difficulty: JSON.stringify(['beginner']) } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(1),
            nextPage: Joi.string().allow(null).equal(null)
        });
        checkVideoResponse(res.body.results[0], video.formatDisplay());
    });
    it('200 - Found with title + description - Difficulty don\'t match', async () => {
        let data = { query: { query: 'this is my description', difficulty: JSON.stringify(['intermediate']) } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(0),
            nextPage: Joi.string().allow(null).equal(null)
        });
    });
    it('200 - Found with title + description - Language match', async () => {
        let data = { query: { query: 'this is my description', language: JSON.stringify(['fr']) } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(1),
            nextPage: Joi.string().allow(null).equal(null)
        });
        checkVideoResponse(res.body.results[0], video.formatDisplay());
    });
    it('200 - Found with title + description - Language don\'t match', async () => {
        let data = { query: { query: 'this is my description', language: JSON.stringify(['en']) } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(0),
            nextPage: Joi.string().allow(null).equal(null)
        });
    });
    it('200 - Found with title + description - Difficulty + Language match', async () => {
        let data = { query: { query: 'this is my description', language: JSON.stringify(['fr']), difficulty: JSON.stringify(['beginner']) } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(1),
            nextPage: Joi.string().allow(null).equal(null)
        });
        checkVideoResponse(res.body.results[0], video.formatDisplay());
    });
    it('200 - Found with title + description - Difficulty match + Language don\'t match', async () => {
        let data = { query: { query: 'this is my description', language: JSON.stringify(['en', 'it']), difficulty: JSON.stringify(['beginner']) } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(0),
            nextPage: Joi.string().allow(null).equal(null)
        });
    });
    it('200 - Found with title + description - Language match + Difficulty don\'t match', async () => {
        let data = { query: { query: 'this is my description', language: JSON.stringify(['fr']), difficulty: JSON.stringify(['confirmed']) } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(0),
            nextPage: Joi.string().allow(null).equal(null)
        });
    });
    it('200 - Not found when unlisted', async () => {
        // Pre
        await Axios.put(
            TESTS_URL + Routes.Videos.CRUD.Update(TESTS_VIDEO_ID).path,
            { visibility: 'unlisted' },
            { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        await Wait(1500); // ES update (1s)
        // Test
        let data = { query: { query: 'this is my description' } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(0),
            nextPage: Joi.string().allow(null).equal(null)
        });
    });
    it('200 - Not found when private', async () => {
        // Pre
        await Axios.put(
            TESTS_URL + Routes.Videos.CRUD.Update(TESTS_VIDEO_ID).path,
            { visibility: 'private' },
            { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        await Wait(1500); // ES update (1s)
        // Test
        let data = { query: { query: 'this is my description' } };
        let res = await testSuccess(Routes.Videos.Search(), 200, data);
        validateBody(res.body, {
            results: Joi.array().length(0),
            nextPage: Joi.string().allow(null).equal(null)
        });
    });
    after(async function(){
        if(!TESTS_GOOGLE_ENABLED) this.skip();
        await video.destroy();
    });
});

describe('Watch a video', () => {
    let video: VideoInstance;
    let code1: CodeInstance, code2: CodeInstance;
    before(async () => {
        video = await Video.create({
            videoId: TESTS_VIDEO_ID,
            title: 'abcde',
            description: 'descabcde',
            visibility: 'public',
            difficulty: 'beginner',
            language: 'ru',
            github: '',
            duration: 150,
            UserId: DB.main.user.id,
            viewsCount: 0,
            collaborators: [{ mail: DB.collaborator.user.mail }]
        }, { include: Video.includes });
        code1 = await Code.create({
            title: 'Code 1',
            value: 'while(true)',
            time: 10,
            mode: 'java',
            githubBranch: null, githubPath: null, githubRepository: null, githubUser: null,
            VideoId: video.id
        });
        code2 = await Code.create({
            title: 'Code 2',
            value: null,
            time: 5,
            mode: 'c++',
            githubBranch: 'master', githubPath: '/directory', githubRepository: 'hapijs', githubUser: 'hapi',
            VideoId: video.id
        });
    });
    it('404 - Video not found', async() => {
        await testError(Routes.Videos.Watch('azazazazazw'), Errors.VideoNotFound);
    });
    it('200 - Owner - Increase view count', async () => {
        let data = { headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
        Expect((await Video.findOne({ where: { id: video.id } })).viewsCount).to.deep.equal(1);
    });
    it('200 - Owner - Don\'t increase view count', async () => {
        let data = { headers: { authorization: Data.USER_ACCESS_TOKEN } };
        await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
        Expect((await Video.findOne({ where: { id: video.id } })).viewsCount).to.deep.equal(1);
    });
    it('200 - Get video as editable when owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
        validateBody(res.body, {
            github: Joi.string().allow('').equal(''),
            editable: Joi.boolean().equal(true),
            codes: Joi.array().length(2),
            owner: Joi.string().uuid().equal(DB.main.user.uuid)
        });
        checkCodeResponse(res.body.codes[0], code2.formatDisplay());
        checkCodeResponse(res.body.codes[1], code1.formatDisplay());
    });
    it('200 - Get video as editable when collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
        validateBody(res.body, {
            github: Joi.string().allow('').equal(''),
            editable: Joi.boolean().equal(true),
            codes: Joi.array().length(2),
            owner: Joi.string().uuid().equal(DB.main.user.uuid)
        });
        checkCodeResponse(res.body.codes[0], code2.formatDisplay());
        checkCodeResponse(res.body.codes[1], code1.formatDisplay());
    });
    it('200 - Get video as non-editable when lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
        validateBody(res.body, {
            github: Joi.string().allow('').equal(''),
            editable: Joi.boolean().equal(false),
            codes: Joi.array().length(2),
            owner: Joi.string().uuid().equal(DB.main.user.uuid)
        });
        checkCodeResponse(res.body.codes[0], code2.formatDisplay());
        checkCodeResponse(res.body.codes[1], code1.formatDisplay());
    });
    it('200 - Get video as non-editable when guest', async () => {
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200);
        validateBody(res.body, {
            github: Joi.string().allow('').equal(''),
            editable: Joi.boolean().equal(false),
            codes: Joi.array().length(2),
            owner: Joi.string().uuid().equal(DB.main.user.uuid)
        });
        checkCodeResponse(res.body.codes[0], code2.formatDisplay());
        checkCodeResponse(res.body.codes[1], code1.formatDisplay());
    });
    it('Set video visibility to unlisted', async () => {
        await video.update({ visibility: 'unlisted' })
    });
    it('200 - Unlisted - Owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
    });
    it('200 - Unlisted - Collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
    });
    it('200 - Unlisted - Lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
    });
    it('200 - Unlisted - Guest', async () => {
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200);
    });
    it('Set video visibility to private', async () => {
        await video.update({ visibility: 'private' })
    });
    it('200 - Private - Owner', async () => {
        let data = { headers: { authorization: DB.main.token } };
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
    });
    it('200 - Private - Collaborator', async () => {
        let data = { headers: { authorization: DB.collaborator.token } };
        let res = await testSuccess(Routes.Videos.Watch(TESTS_VIDEO_ID), 200, data);
    });
    it('200 - Private - Lambda', async () => {
        let data = { headers: { authorization: DB.lambda.token } };
        await testError(Routes.Videos.Watch(TESTS_VIDEO_ID), Errors.VideoNotFound, data);
    });
    it('200 - Private - Guest', async () => {
        await testError(Routes.Videos.Watch(TESTS_VIDEO_ID), Errors.VideoNotFound);
    });
    after(async () => {
        await Code.destroy({ where: { videoId: video.videoId } });
        await video.destroy();
    });
});

describe('Sync with Elasticsearch', () => {
    before(async function(){
        if(!TESTS_GOOGLE_ENABLED) this.skip();
    });
    it('Add a video', async () => {
        let VIDEO_DATA = {
            videoId: TESTS_VIDEO_ID,
            title: 'Title of video in Elasticsearch',
            description: 'Eat apples.',
            visibility: 'public',
            language: 'it',
            difficulty: 'intermediate',
            github: 'https://github.com/hapijs/hapi',
            tags: ['c#', 'js'],
            collaborators: []
        }
        await Axios.post(TESTS_URL + Routes.Videos.CRUD.Create().path, VIDEO_DATA, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // ES check
        await Wait(1500); // ES update
        let ESresult = await ES.get<IVideoElasticSearch>({
            index: Constants.ElasticSearch.videos.index,
            type: Constants.ElasticSearch.videos.type,
            id: TESTS_VIDEO_ID
        });
        let ESvideo = ESresult._source;
        Expect(ESvideo.title).to.deep.equal(VIDEO_DATA.title);
        Expect(ESvideo.description).to.deep.equal(VIDEO_DATA.description);
        Expect(ESvideo.difficulty).to.deep.equal(VIDEO_DATA.difficulty);
        Expect(ESvideo.language).to.deep.equal(VIDEO_DATA.language);
        Expect(ESvideo.visibility).to.deep.equal(VIDEO_DATA.visibility);
        Expect(ESvideo.github).to.deep.equal(VIDEO_DATA.github);
        Expect(ESvideo.tags).to.have.members(VIDEO_DATA.tags);
    });
    it('Update the video', async () => {
        let VIDEO_DATA = {
            title: 'This is the new title for the Elasticsearch video',
            description: 'Look, a butterfly!',
            visibility: 'unlisted',
            language: 'ru',
            difficulty: 'beginner',
            github: '',
            tags: ['ts', 'react']
        }
        await Axios.put(TESTS_URL + Routes.Videos.CRUD.Update(TESTS_VIDEO_ID).path, VIDEO_DATA, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // ES check
        await Wait(1500); // ES update
        let ESresult = await ES.get<IVideoElasticSearch>({
            index: Constants.ElasticSearch.videos.index,
            type: Constants.ElasticSearch.videos.type,
            id: TESTS_VIDEO_ID
        });
        let ESvideo = ESresult._source;
        Expect(ESvideo.title).to.deep.equal(VIDEO_DATA.title);
        Expect(ESvideo.description).to.deep.equal(VIDEO_DATA.description);
        Expect(ESvideo.difficulty).to.deep.equal(VIDEO_DATA.difficulty);
        Expect(ESvideo.language).to.deep.equal(VIDEO_DATA.language);
        Expect(ESvideo.visibility).to.deep.equal(VIDEO_DATA.visibility);
        Expect(ESvideo.github).to.deep.equal(VIDEO_DATA.github);
        Expect(ESvideo.tags).to.have.members(VIDEO_DATA.tags);
    });
    it('Delete the video', async () => {
        await Axios.delete(TESTS_URL + Routes.Videos.CRUD.Delete(TESTS_VIDEO_ID).path, { headers: { authorization: Data.USER_ACCESS_TOKEN } });
        // ES check
        await Wait(1500); // ES update
        try{
            await ES.get<IVideoElasticSearch>({
                index: Constants.ElasticSearch.videos.index,
                type: Constants.ElasticSearch.videos.type,
                id: TESTS_VIDEO_ID
            });
            Expect.fail('ES is supposed to throw error Not Found');
        }
        catch(error){
            Expect(error.message).to.equal(new ESerrors.NotFound().message);
        }
    });
});