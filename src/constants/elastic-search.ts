interface IItem {
    index: string;
    type: string;
}

interface IItems {
    videos: IItem;
    logs: IItem;
    playlists: IItem;
}

export default {
    videos: {
        index: 'syncodeo',
        type: 'videos'
    },
    logs: {
        index: 'syncodeo-logs',
        type: 'requests'
    },
    playlists: {
        index: 'syncodeo-playlists',
        type: 'playlists'
    }
} as IItems