import * as Boom from 'boom';

import * as Helpers from '../../helpers/';
import * as Constants from '../../constants/';

export default Helpers.route.createRoute({
    method: 'get',
    path: '/documentation/errors',
    handler: async (request, h) => {
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>API Errors</title>
                    <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.4/css/bulma.min.css">
                </head>
                <body style="overflow: auto">
                    <table class="table is-fullwidth">
                        <tbody>
                            <tr>
                                <th>Error Code</th>
                                <th>Status Code</th>
                                <th>Reason</th>
                                <th>Message</th>
                            </tr>
                            ${
                                Object.keys(Constants.Errors).map(key => `
                                    <tr>
                                        <td>${(Constants.Errors[key].data && Constants.Errors[key].data.code) || ''}</td>
                                        <td>${Constants.Errors[key].output.payload.statusCode}</td>
                                        <td>${Constants.Errors[key].output.payload.error}</td>
                                        <td>${Constants.Errors[key].message}</td>
                                    </tr>
                                `).join('\n')
                            }
                        </tbody>
                    </table>
                </body>
            </html>
        `;
    }
});