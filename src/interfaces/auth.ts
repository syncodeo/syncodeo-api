export interface IJwtUser{
    uuid: string;
}

export interface IRefreshTokenData extends IJwtUser{
    device: string;
}