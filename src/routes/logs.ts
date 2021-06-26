import * as Joi from 'joi';
import * as Boom from 'boom';

import * as Helpers from '../helpers/';
import { server } from '../server';
import { IRequest } from '../interfaces/request';

interface CustomRequest extends IRequest{
    query: {
        id: string
    }
}

function formatCellTitle(key: string){
    return key === 'uuid' ? 'UUID' : key[0].toUpperCase() + key.substr(1).replace(/([A-Z])/g, ' $1');
}

function stringToFormattedJSON(string: string){
    try{
        return JSON.stringify(JSON.parse(string), undefined, 4);
    }
    catch(error){
        return string;
    }
}

function formatCell(key: string, value: string){
    value = (value + '').replace(/</g, '«').replace(/>/g, '»');
    switch(key){
        case 'timestamp':
            return new Date(Number(value)).toString();
        case 'uuid':
            return `<a href='https://grafana.syncodeo.io/d/OngxWmjiz/users?orgId=1&var-UUID=${value}'>${value}</a>`;
        case 'responseTime':
            return value + ' ms';
        default:
            return value;
    }
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/logs',
    handler: async (request: CustomRequest, h) => {
        try{
            let log = await server.elasticSearch.get({ index: 'syncodeo-logs', type: 'requests', id: request.query.id });
            return `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="utf-8">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <title>Log</title>
                        <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.4/css/bulma.min.css">
                    </head>
                    <body style="overflow: auto">
                        <table class="table is-fullwidth">
                            <tbody>
                                <tr>
                                    <th>ID</th>
                                    <td><pre>${log._id}</pre></td>
                                </tr>
                                ${
                                    Object.keys(log._source).map(key => `
                                        <tr>
                                            <th>${formatCellTitle(key)}</th>
                                            <td><pre>${stringToFormattedJSON(formatCell(key, log._source[key]))}</pre></td>
                                        </tr>
                                    `).join('\n')
                                }
                            </tbody>
                        </table>
                    </body>
                </html>
            `;
        }
        catch(error){
            throw Boom.notFound();
        }
    },
    options: {
        auth: 'basic',
        validate: {
            query: {
                id: Joi.string().required().description('Get a specific log')
            }
        }
    }
})