import { Request, RequestAuth, AuthCredentials } from "hapi";
import { IJwtUser } from "./auth";
import { UserInstance } from "../models/User";

// Credentials content (content defined in JwtUser interface)
export interface ICredentials extends AuthCredentials, IJwtUser{

}

export interface IRequestAuth extends RequestAuth{
    credentials: ICredentials;
    user?: UserInstance;
}

// Request with typed credentials
export interface IRequest extends Request{
    auth: IRequestAuth
}

/**
 * Internal error
 */
export interface IRequestInternalError extends IRequest{
    internalErrorLog: {
        message: string;
        stack: string;
    }
}