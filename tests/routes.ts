export type IMethod = 'get' | 'post' | 'put' | 'del';

export interface IRoute{
    method: IMethod;
    path: string;
}

const buildRoute = (method: IMethod, path: string) => {
    return {
        method,
        path
    } as IRoute;
}

const Routes = {
    Account: {
        LinkYoutubeAccount: () => buildRoute('post', '/accounts/linkYoutubeAccount'),
        Login: () => buildRoute('post', '/accounts/login'),
        Me: () => buildRoute('get', '/accounts/me'),
        Refresh: () => buildRoute('post', '/accounts/refresh')
    },
    Constants: {
        Difficulties: () => buildRoute('get', '/constants/difficulties'),
        Localizations: () => buildRoute('get', '/constants/localizations'),
        Visibilities: () => buildRoute('get', '/constants/visibilities')
    },
    Feedback: {
        CRUD: {
            Create: () => buildRoute('post', '/feedback')
        }
    },
    Playlists: {
        CRUD: {
            Create: () => buildRoute('post', '/playlists'),
            Delete: (playlistuuid: string) => buildRoute('del', `/playlists/${playlistuuid}`),
            FindOne: (playlistuuid: string) => buildRoute('get', `/playlists/${playlistuuid}`),
            Update: (playlistuuid: string) => buildRoute('put', `/playlists/${playlistuuid}`)
        },
        Videos: {
            CRUD: {
                Create: (playlistuuid: string, videoid: string) => buildRoute('post', `/playlists/${playlistuuid}/videos/${videoid}`),
                Delete: (playlistuuid: string, videoid: string) => buildRoute('del', `/playlists/${playlistuuid}/videos/${videoid}`),
                Update: (playlistuuid: string, videoid: string) => buildRoute('put', `/playlists/${playlistuuid}/videos/${videoid}`)
            }
        },
        Search: () => buildRoute('get', '/playlists/search')
    },
    Tests: {
        RateLimit: {
            Get: () => buildRoute('get', '/tests/rateLimit'),
            Post: () => buildRoute('post', '/tests/rateLimit'),
            Put: () => buildRoute('put', '/tests/rateLimit'),
            Delete: () => buildRoute('del', '/tests/rateLimit')
        }
    },
    Users: {
        CRUD: {
            FindOne: (useruuid: string) => buildRoute('get', `/users/${useruuid}`)
        },
        Playlists: {
            CRUD: {
                FindAll: (useruuid: string) => buildRoute('get', `/users/${useruuid}/playlists`)
            }
        },
        Videos: {
            CRUD: {
                FindAll: (useruuid: string) => buildRoute('get', `/users/${useruuid}/videos`)
            }
        }
    },
    Videos: {
        CRUD: {
            Create: () => buildRoute('post', '/videos'),
            Delete: (videoid: string) => buildRoute('del', `/videos/${videoid}`),
            FindOne: (videoid: string) => buildRoute('get', `/videos/${videoid}`),
            Update: (videoid: string) => buildRoute('put', `/videos/${videoid}`)
        },
        Codes: {
            CRUD: {
                Create: (videoid: string) => buildRoute('post', `/videos/${videoid}/codes`),
                Delete: (videoid: string, codeuuid: string) => buildRoute('del', `/videos/${videoid}/codes/${codeuuid}`),
                FindAll: (videoid: string) => buildRoute('get', `/videos/${videoid}/codes`),
                FindOne: (videoid: string, codeuuid: string) => buildRoute('get', `/videos/${videoid}/codes/${codeuuid}`),
                Update: (videoid: string, codeuuid: string) => buildRoute('put', `/videos/${videoid}/codes/${codeuuid}`),
            }
        },
        Gather: () => buildRoute('get', '/videos/gather'),
        RecentlyUpdated: () => buildRoute('get', '/videos/recentlyUpdated'),
        RecentUploads: () => buildRoute('get', '/videos/recentUploads'),
        Search: () => buildRoute('get', '/videos/search'),
        Watch: (videoid: string) => buildRoute('get', `/videos/${videoid}/watch`),
    }
}

export default Routes;