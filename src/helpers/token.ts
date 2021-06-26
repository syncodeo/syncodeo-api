import * as JWT from 'jsonwebtoken';
import * as Joi from 'joi';
import { IJwtUser, IRefreshTokenData } from '../interfaces/auth';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from '../config';
import { server } from '../server';

const UUID_SCHEMA = Joi.string().uuid().required();

const REFRESH_TOKEN_CONTENT_SCHEMA = Joi.object().keys({
    uuid: Joi.string().uuid().required(),
    device: Joi.string().max(50).required(),
    iat: Joi.any().optional(),
    exp: Joi.any().optional(),
});

/**
 * Vérifie que le token d'authentification est valide
 * @param token Token d'authentification à vérifier
 * @return  Résultat de la validité du token d'authentification
 */
export function isAccessTokenValid(token: string){
    try{
        let tokenData = JWT.verify(token, ACCESS_TOKEN_SECRET) as IJwtUser;
        return Joi.validate(tokenData.uuid, UUID_SCHEMA).error === null;
    }
    catch(error){
        return false;
    }
}

export function isRefreshTokenValid(token: string){
    try{
        let tokenData = JWT.verify(token, REFRESH_TOKEN_SECRET) as IRefreshTokenData;
        return Joi.validate(tokenData, REFRESH_TOKEN_CONTENT_SCHEMA).error === null;
    }
    catch(error){
        return false;
    }
}

// --- DEFAULT --- //
export default {
    isAccessTokenValid,
    isRefreshTokenValid
}