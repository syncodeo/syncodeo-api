import { OAuth2Client } from "google-auth-library";

export interface IVideoCacheKey  {
    id: string;
    oAuthClient: OAuth2Client;
}