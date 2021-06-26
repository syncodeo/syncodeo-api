import * as Boom from 'boom';

export default {
    // 400 - Bad Request
    YoutubeAccountNeedToBeLinked: Boom.badRequest('You must have linked your Youtube account', { code: 'E-400-01' }),
    YoutubeAccountRequired: Boom.badRequest('You must have a Youtube account', { code: 'E-400-02' }),
    VideoDoesNotExists: Boom.badRequest('Video does not exist', { code: 'E-400-03' }),
    YoutubeVideoNotReady: Boom.badRequest('YouTube video not ready yet, please try again in few minutes', { code: 'E-400-04' }),
    CodeTimeOutOfRange: Boom.badRequest('Code time is out of video duration range', { code: 'E-400-05' }),
    CodeTimeAlreadyExists: Boom.badRequest('Video already contains specified code time', { code: 'E-400-06' }),
    InvalidTokenPayload: Boom.badRequest('Invalid token (Invalid payload)', { code: 'E-400-07' }),
    InvalidTokenDevice: Boom.badRequest('Invalid token (Invalid device)', { code: 'E-400-08' }),
    InvalidTokenUser: Boom.badRequest('Invalid token (Invalid user)', { code: 'E-400-09' }),
    InvalidTokenInstance: Boom.badRequest('Invalid token (Invalid instance)', { code: 'E-400-10' }),
    InvalidRequestParams: Boom.badRequest('Invalid request URL parameters', { code: 'E-400-11' }),
    InvalidRequestQuery: Boom.badRequest('Invalid request query input', { code: 'E-400-12' }),
    InvalidRequestPayload: Boom.badRequest('Invalid request payload input', { code: 'E-400-13' }),
    InvalidCredentials: Boom.badRequest('Invalid credentials', { code: 'E-400-14' }),
    // 401 - Unauthorized
    RequireAuthorization: Boom.unauthorized('You need to be logged in'),
    // 403 - Forbidden
    NotOwner: Boom.forbidden('You are not the owner of the Youtube channel, please sign-in as the owner of the Youtube account', { code: 'E-403-01' }),
    NotAuthor: Boom.forbidden('You are not the author of the video', { code: 'E-403-02' }),
    CantEditRessource: Boom.forbidden('You are not allowed to edit this ressource', { code: 'E-403-03' }),
    // 404 - Not Found
    UserNotFound: Boom.notFound('User not found', { code: 'E-404-01' }),
    VideoNotFound: Boom.notFound('Video not found', { code: 'E-404-02'}),
    CodeNotFound: Boom.notFound('Code not found', { code: 'E-404-03' }),
    PlaylistNotFound: Boom.notFound('Playlist not found', { code: 'E-404-04' }),
    // 409 - Conflict
    VideoAlreadyRegistered: Boom.conflict('Video already registered', { code: 'E-409-01' }),
    YoutubeAccountAlreadyLinked: Boom.conflict('Youtube account already linked', { code: 'E-409-02' }),
    VideoAlreadyInPlaylist: Boom.conflict('Video already in playlist', { code: 'E-409-03' }),
    // 429 - Too Many Requests
    TooManyRequests: Boom.tooManyRequests('Too many requests, please try again later', { code: 'E-429-01' }),
    DeadlockError: Boom.tooManyRequests('Ressource in use, please try again later', { code: 'E-429-02' }),
    // 500 - Internal server error
    InternalServerError: Boom.internal(undefined, { code: 'E-500-01' })
}