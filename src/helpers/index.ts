import { Request } from 'hapi';
import * as Boom from 'boom';
import * as Joi from 'joi';
import * as JWT from 'jsonwebtoken';

import * as Constants from '../constants/';
import TokenHelper from './token';
import { User } from '../models';

export { default as array } from './array';
export { default as oauth2client } from './oauth2client';
export { default as route } from './route';
export { default as token } from './token';
export { default as youtube } from './youtube';
export { default as ElasticSearch } from './elastic-search';

export function explodeGithubFile(file?: string){
    if(file){
        let fileData = Constants.Regex.githubFile.exec(file);
        return {
            githubUser: fileData[1],
            githubRepository: fileData[2],
            githubBranch: fileData[3],
            githubPath: fileData[4]
        }
    }
    else{
        return {
            githubUser: null,
            githubRepository: null,
            githubBranch: null,
            githubPath: null
        }
    }
}

export function getIP(request: Request, fromProxy: boolean){
    return fromProxy ? request.headers['x-forwarded-for'].split(',')[0].split(' ').join('') : request.info.remoteAddress;
}

export function generateResponseErrorSchema(...errors: Boom[]){
    return {
        description: errors[0].output.payload.error,
        schema: Joi.object({
            statusCode: Joi.number().required().default(errors[0].output.payload.statusCode).description('Error(s) status code'),
            error: Joi.string().required().default(errors[0].output.payload.error).description('Error(s) status code signification'),
            message: Joi.string().required().default(errors.map(b => b.message).join('|')).description('Error(s) message'),
            code: Joi.string().required().default(errors.map(b => (b.data && b.data.code) || '').join('|')).description('Error(s) code')
        }).label('Response')
    };
}

export async function getUserFromOptionnalAuth(request: Request){
    try{
        let token = request.headers.authorization;
        let auth = token && TokenHelper.isAccessTokenValid(token);
        return (auth && (await User.getByUuid(JWT.decode(token)['uuid']))) || undefined;
    }
    catch{
        return undefined;
    }
}