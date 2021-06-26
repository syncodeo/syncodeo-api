import * as joi from 'joi';
import * as Boom from 'boom';
import * as chai from 'chai';
import * as redis from 'redis';
import { Response, Request } from 'superagent';
import { Client as ElasticsearchClient, errors as ElasticsearchErrors } from 'elasticsearch';
import 'chai-http';

import * as constants from '../src/constants/';
import { TESTS_URL, DB_MIGRATION, ELASTIC_SEARCH_HOST, ELASTIC_SEARCH_PORT, REDIS_HOST, REDIS_PORT, TESTS_VIDEO_ID } from '../src/config';
import { sequelize, migration, Playlist, Video } from '../src/models/';
import { UserInstance } from '../src/models/User';
import { IRoute } from './routes';
import { VideoAttributes } from '../src/models/Video';
import { IVideoFormatDisplay, ICodeFormatDisplay, IPlaylistFormatDisplay, IUserFormatDisplay } from '../src/interfaces/model';

chai.use(require('chai-http'));

export const Expect = chai.expect;
export const Joi = joi;
export const Constants = constants;
export const Errors = constants.Errors;
export const Redis = redis.createClient({
    host: REDIS_HOST,
    port: REDIS_PORT
});
export const ES = new ElasticsearchClient({
    host: ELASTIC_SEARCH_HOST + ':' + ELASTIC_SEARCH_PORT,
});
export const ESerrors = ElasticsearchErrors;

interface IRequestParams{
    query?: {[key: string]: any};
    payload?: {[key: string]: any};
    headers?: {[key: string]: any};
}

const buildRequestParams = (req: Request, params?: IRequestParams) => {
    if(!params) return req;
    if(params.query) req = req.query(params.query);
    if(params.payload) req = req.send(params.payload);
    if(params.headers) for(let key of Object.keys(params.headers)) req = req.set(key, params.headers[key]);
    return req;
}

const request = () => chai.request(TESTS_URL);
export const get = (path: string, params?: IRequestParams) => buildRequestParams(request().get(path), params);
export const post = (path: string, params?: IRequestParams) => buildRequestParams(request().post(path), params);
export const put = (path: string, params?: IRequestParams) => buildRequestParams(request().put(path), params);
export const del = (path: string, params?: IRequestParams) => buildRequestParams(request().delete(path), params);

export const methodPathParamsToRequest = (route: IRoute, params?: IRequestParams) => {
    if(route.method === 'get') return get(route.path, params);
    if(route.method === 'post') return post(route.path, params);
    if(route.method === 'put') return put(route.path, params);
    if(route.method === 'del') return del(route.path, params);
}

interface ResponseBody {
    statusCode: 400;
    error: string;
    message: string;
    code?: string;
}
interface IResponse extends Response{
    body: ResponseBody;
}
const testErrorResponse = (res: IResponse, error: Boom<any>) => {
    Expect(res).to.have.status(error.output.statusCode);
    Expect(res.body.statusCode).to.deep.equal(error.output.statusCode);
    Expect(res.body.error).to.deep.equal(error.output.payload.error);
    if(res.body.code){
        Expect(res.body.code).to.deep.equal(error.data.code);
    }
}

export const testMissingAuth = (route: IRoute) => {
    let req = methodPathParamsToRequest(route);
    return new Promise((resolve, reject) => {
        req.end((err, res) => {
            if(err) reject(err);
            Expect(res).to.have.status(401);
            Expect(res.body.message).to.deep.equal('Missing authentication');
            resolve(res);
        })
    });
}
export const testYoutubeAccountLinked = (route: IRoute, params?: IRequestParams) => {
    params = {
        ...params,
        headers: {
            ...(params && params.headers),
            authorization: DB.lambda.token
        }
    }
    return testError(route, Errors.YoutubeAccountNeedToBeLinked, params);
}
export const testError = (route: IRoute, error: Boom<any>, params?: IRequestParams) => {
    let req = methodPathParamsToRequest(route, params);
    return new Promise((resolve, reject) => {
        req.end((err, res) => {
            if(err) reject(err);
            testErrorResponse(res, error);
            resolve(res);
        })
    }) as Promise<Response>;
}
export const testSuccess = (route: IRoute, code: 200|201|204, params?: IRequestParams) => {
    let req = methodPathParamsToRequest(route, params);
    return new Promise((resolve, reject) => {
        req.end((err, res) => {
            if(err) reject(err);
            Expect(res).to.have.status(code);
            resolve(res);            
        });
    }) as Promise<Response>;
}

type JoiValidationSchema = {[key: string]: (joi.Schema|JoiValidationSchema)};
export const validateBody = (body: any, schema: JoiValidationSchema, parent: string = '') => {
    for(let key of Object.keys(schema)){
        if(!(schema[key] as joi.Schema).isJoi) validateBody(body[key], schema[key] as JoiValidationSchema, key + '.');
        else Expect((schema[key] as joi.Schema).required().validate(body[key]).error, `${parent+key} = ${body[key]}`).to.deep.equal(null);
    }
}

export const Data = {
    USER_UUID: '',
    USER_ACCESS_TOKEN: '',
    USER_REFRESH_TOKEN: '',
    USER_INSTANCE: null as UserInstance
}

/**
 * Check instances
 */
export const checkVideoResponse = (body: any, video: IVideoFormatDisplay) => {
    Expect(body.videoId).to.deep.equal(video.videoId);
    Expect(body.title).to.deep.equal(video.title);
    Expect(body.description).to.deep.equal(video.description);
    Expect(body.language).to.deep.equal(video.language);
    Expect(body.difficulty).to.deep.equal(video.difficulty);
    Expect(body.visibility).to.deep.equal(video.visibility);
    Expect(body.github).to.deep.equal(video.github);
    Expect(body.duration).to.deep.equal(video.duration)
    Expect(body.tags).to.have.members(video.tags);
    if('collaborators' in video) Expect(body.collaborators).to.have.members(video.collaborators);
    else Expect(body).to.not.have.keys('collaborators');
    Expect(body.owner).to.deep.equal(video.owner);
}
export const checkCodeResponse = (body: any, code: ICodeFormatDisplay) => {
    Expect(body.uuid).to.deep.equal(code.uuid);
    Expect(body.title).to.deep.equal(code.title);
    Expect(body.mode).to.deep.equal(code.mode);
    Expect(body.time).to.deep.equal(code.time);
    if(body.value !== null){
        Expect(body.value).to.deep.equal(code.value);
        Expect(body.github.user).to.deep.equal(null);
        Expect(body.github.repository).to.deep.equal(null);
        Expect(body.github.branch).to.deep.equal(null);
        Expect(body.github.path).to.deep.equal(null);
    }
    else{
        Expect(body.value).to.deep.equal(null);
        Expect(body.github.user).to.deep.equal(code.github.user);
        Expect(body.github.repository).to.deep.equal(code.github.repository);
        Expect(body.github.branch).to.deep.equal(code.github.branch);
        Expect(body.github.path).to.deep.equal(code.github.path);
    }
}
export const checkPlaylistResponse = (body: any, playlist: IPlaylistFormatDisplay) => {
    Expect(body.uuid).to.deep.equal(playlist.uuid);
    Expect(body.title).to.deep.equal(playlist.title);
    Expect(body.description).to.deep.equal(playlist.description);
    Expect(body.visibility).to.deep.equal(playlist.visibility);
    Expect(body.difficulty).to.deep.equal(playlist.difficulty);
    Expect(body.language).to.deep.equal(playlist.language);
    Expect(body.tags).to.have.members(playlist.tags);
    Expect(body.owner).to.deep.equal(playlist.owner);
    playlist.videos.forEach((video, i) => checkVideoResponse(body.videos[i], video));
};
export const checkUserResponse = (body: any, user: IUserFormatDisplay) => {
    Expect(body.uuid).to.deep.equal(user.uuid);
    Expect(body.name).to.deep.equal(user.name);
    Expect(body.picture).to.deep.equal(user.picture);
    Expect(body.channelId).to.deep.equal(user.channelId || null);
};

/**
 * Create helpers
 */
export const createVideo = async () => {
    return await Video.create({
        videoId: TESTS_VIDEO_ID,
        title: 'CodeTestsVideoTitle',
        description: 'This is une description',
        difficulty: 'beginner',
        visibility: 'public',
        language: 'en',
        github: '',
        duration: 100,
        viewsCount: 0,
        UserId: DB.main.user.id,
        collaborators: [{ mail: DB.collaborator.user.mail }]
    }, { include: Video.includes });
}
export const createPlaylist = async () => {
    return await Playlist.create({
        title: 'My playlist',
        description: 'What a playlist',
        difficulty: 'intermediate',
        language: 'en',
        visibility: 'public',
        UserId: DB.main.user.id
    }, { include: Playlist.includes });
};

/**
 * Database
 */
export const DB = {
    init: (async () => {
        sequelize.options.logging = false;
        await sequelize.authenticate();
        if(DB_MIGRATION === 'DROP') await migration.drop();
    })(),
    main: {
        user: null as UserInstance,
        token: null as string
    },
    lambda: {
        user: null as UserInstance,
        token: null as string
    },
    collaborator: {
        user: null as UserInstance,
        token: null as string
    },
    youtubeLinked: {
        user: null as UserInstance,
        token: null as string
    }
}

/**
 * Other helpers
 */
export const Wait = (ms: number) => new Promise((resolve, reject) => setTimeout(resolve, ms));