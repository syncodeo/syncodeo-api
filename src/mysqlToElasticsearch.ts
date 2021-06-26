import * as colors from 'colors';
import { Client as ElasticSearchClient } from 'elasticsearch';

import { sequelize, checkConnection, Video, Playlist } from './models/';
import * as Helpers from './helpers/';
import { server } from './server';
import { ELASTIC_SEARCH_HOST, ELASTIC_SEARCH_PORT } from './config';

server.elasticSearch = new ElasticSearchClient({
    host: ELASTIC_SEARCH_HOST + ':' + ELASTIC_SEARCH_PORT,
    log: 'error'
});

async function mysqlToElasticsearch(){
    console.log(colors.rainbow('Testing MySQL connexion...'));
    await checkConnection();
    console.log(colors.green('Connected to MySQL'));

    console.log(colors.rainbow('Retrieving videos...'));
    let videos = await Video.findAll({ include: Video.includes });
    console.log(colors.green('Videos retrieved successfully!'));

    console.log(colors.rainbow('Retrieving playlists...'));
    let playlists = await Playlist.findAll({ include: Playlist.includes });
    console.log(colors.green('Playlists retrieved successfully!'));

    console.log(colors.rainbow('Adding videos to Elasticsearch...'));
    for(let video of videos){
        await Helpers.ElasticSearch.createOrUpdateVideo(video);
    }
    console.log(colors.green('Videos added to Elasticsearch successfully!'));

    console.log(colors.rainbow('Adding playlists to Elasticsearch...'));
    for(let playlist of playlists){
        await Helpers.ElasticSearch.createOrUpdatePlaylist(playlist);
    }
    console.log(colors.green('Playlists added to Elasticsearch successfully!'));
}

mysqlToElasticsearch()
.then(() => console.log(colors.green('Export successful!'))).then(() => process.exit(0))
.catch((error) => { console.log(colors.red('Error while exporting data...')); console.log(error); process.exit(1); })