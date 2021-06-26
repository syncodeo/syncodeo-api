import { FindOptions } from 'sequelize';
import * as Joi from 'joi';

import * as Helpers from '../helpers/';
import * as Constants from '../constants/';
import { IRequest } from '../interfaces/request';
import { Feedback, sequelize } from '../models';
import { FeedbackAttributes } from '../models/Feedback';

interface CustomRequest extends IRequest{
    query: {
        type?: string;
        from?: any; // Date
        to?: any; // Date
    }
}

function displayDate(d: Date){
    return d.toJSON().replace('T', ' ').replace('Z', '');
}

function escapeString(str: string){
    return str.replace(/</g, '«').replace(/>/g, '»');
}

export default Helpers.route.createRoute({
    method: 'get',
    path: '/feedbacks',
    handler: async (request: CustomRequest, h) => {
        // Récupération des paramètres
        const type: string = request.query.type;
        const from: Date = request.query.from;
        const to:Date = request.query.to;
        // Récupération des feedbacks
        let options: FindOptions<FeedbackAttributes> = { where: undefined, order: [['createdAt', 'DESC']], include: Feedback.includes };
        if(request.query.type) options.where = { type: request.query.type };
        if(request.query.from) options.where = { ...options.where, createdAt: {[sequelize.Op.gte]: displayDate(from)} };
        if(request.query.to) options.where = { ...options.where, createdAt: {[sequelize.Op.lte]: displayDate(to)} };
        let feedbacks = await Feedback.findAll(options);
        // Renvoi du HTML
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
                    <a class="button" href="/v1/feedbacks?type=message${from ? `&from=${displayDate(from)}` : ''}${to ? `&to=${displayDate(to)}` : ''}">Message</a>
                    <a class="button" href="/v1/feedbacks?type=bug${from ? `&from=${displayDate(from)}` : ''}${to ? `&to=${displayDate(to)}` : ''}">Bug</a>
                    <a class="button" href="/v1/feedbacks?type=feature${from ? `&from=${displayDate(from)}` : ''}${to ? `&to=${displayDate(to)}` : ''}">Feature</a>
                    <a class="button" href="/v1/feedbacks?type=improvement${from ? `&from=${displayDate(from)}` : ''}${to ? `&to=${displayDate(to)}` : ''}">Improvement</a>
                    <h2 class="subtitle" style="display: inline">From ${from ? displayDate(from) : '<i>NOT SPECIFIED</i>'} to ${to ? displayDate(to) : '<i>NOT SPECIFIED</i>'}</h2>
                    <table class="table is-fullwidth">
                        <tbody>
                            <tr>
                                <th>From</th>
                                <th>Type</th>
                                <th>Message</th>
                                <th>Page</th>
                                <th>Date</th>
                            </tr>
                            ${
                                feedbacks.map(feedback => `
                                    <tr>
                                        <td title="${escapeString(feedback.creator.mail)}">${feedback.creator.uuid}</td>
                                        <td>${escapeString(feedback.type)}</td>
                                        <td>${escapeString(feedback.message)}</td>
                                        <td>${escapeString(feedback.page)}</td>
                                        <td>${escapeString(displayDate(feedback.createdAt))}</td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </body>
            </html>
        `;
    },
    options: {
        auth: 'basic',
        validate: {
            query: {
                type: Joi.string().valid(Constants.getFeedbackTypes()),
                from: Joi.date(),
                to: Joi.date()
            }
        }
    }
});