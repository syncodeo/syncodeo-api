import * as Hapi from 'hapi';
import Axios from 'axios';

import { Server } from '../server';
import * as Constants from '../constants/';
import { IEventInternalError, IEventNewUser, IEventNewVideo, IEventFeedback } from '../interfaces/events';
import { SITE_URL } from '../config';

export interface DiscordPluginOptions{
    server: Server;
}

export type DiscordPluginType = Hapi.Plugin<DiscordPluginOptions>;
export const Plugin: DiscordPluginType = {
    name: 'DiscordPlugin',
    register: function(server: Hapi.Server, options: DiscordPluginOptions) {
        // ----------
        // Storage
        // ----------
        const _logs = new LogsDiscord();
        const _internalErrors = new InternalErrorsDiscord();
        const _feedbacks = new FeedbacksDiscord();

        // ----------
        // Internal errors
        // ----------
        options.server.eventEmitter.on(Constants.Events.InternalError, function(data: IEventInternalError){
            _internalErrors.sendInternalError(data.message, data.date, data.route);
        });

        // ----------
        // Logs
        // ----------
        options.server.eventEmitter.on(Constants.Events.NewUser, function(data: IEventNewUser){
            _logs.sendLog('NEW_USER', data.date, data);
        });
        options.server.eventEmitter.on(Constants.Events.NewVideo, function(data: IEventNewVideo){
            _logs.sendLog('NEW_VIDEO', data.date, data);
        });
        
        // ----------
        // Feedbacks
        // ----------
        options.server.eventEmitter.on(Constants.Events.FeedbackMessage, function(data: IEventFeedback){
            _feedbacks.sendFeedback('MESSAGE', data);
        });
        options.server.eventEmitter.on(Constants.Events.FeedbackBug, function(data: IEventFeedback){
            _feedbacks.sendFeedback('BUG', data);
        });
        options.server.eventEmitter.on(Constants.Events.FeedbackImprovement, function(data: IEventFeedback){
            _feedbacks.sendFeedback('IMPROVEMENT', data);
        });
        options.server.eventEmitter.on(Constants.Events.FeedbackFeature, function(data: IEventFeedback){
            _feedbacks.sendFeedback('FEATURE', data);
        });

        // ----------
        // WebHooks
        // ----------
        setInterval(() => {
            // Internal Error
            if(Constants.Discord.InternalErrors && _internalErrors.internalErrors.length > 0){
                Axios.post(Constants.Discord.InternalErrors, { embeds: _internalErrors.internalErrors.slice(0, 10).map(err => err.toEmbed()) });
                _internalErrors.internalErrors = _internalErrors.internalErrors.slice(10);
            }
            // Log
            if(Constants.Discord.Logs && _logs.logs.length > 0){
                Axios.post(Constants.Discord.Logs, { embeds: _logs.logs.slice(0, 10).map(log => log.toEmbed()) });
                _logs.logs = _logs.logs.slice(10);
            }
            // Feedbacks
            if(Constants.Discord.Messages && _feedbacks.messages.length > 0){
                Axios.post(Constants.Discord.Messages, { embeds: _feedbacks.messages.slice(0, 10).map(f => f.toEmbed()) }).then(res => console.log(res.data)).catch(error => console.log(error.response.statusCode + ' - ' + error.response.data));
                _feedbacks.messages = _feedbacks.messages.slice(10);
            }
            if(Constants.Discord.BugReports && _feedbacks.bugs.length > 0){
                Axios.post(Constants.Discord.BugReports, { embeds: _feedbacks.bugs.slice(0, 10).map(f => f.toEmbed()) });
                _feedbacks.bugs = _feedbacks.bugs.slice(10);
            }
            if(Constants.Discord.Improvements && _feedbacks.improvements.length > 0){
                Axios.post(Constants.Discord.Improvements, { embeds: _feedbacks.improvements.slice(0, 10).map(f => f.toEmbed()) });
                _feedbacks.improvements = _feedbacks.improvements.slice(10);
            }
            if(Constants.Discord.Features && _feedbacks.features.length > 0){
                Axios.post(Constants.Discord.Features, { embeds: _feedbacks.features.slice(0, 10).map(f => f.toEmbed()) });
                _feedbacks.features = _feedbacks.features.slice(10);
            }
        }, 2000);
    }
}

// -------------------------------------------------------
// > INTERNAL ERROR
// -------------------------------------------------------
class InternalErrorDiscord{

    message: string;
    date: Date;
    route: string;

    constructor(message: string, date: Date, route: string){
        this.message = message;
        this.date = date;
        this.route = route;
    }
    
    toEmbed(){
        return {
            title: this.message,
            description: this.route,
            timestamp: this.date.toJSON(),
            url: SITE_URL + '/api/v1/internalErrors?at=' + this.date.getTime()
        }
    }
}
class InternalErrorsDiscord{

    internalErrors: InternalErrorDiscord[];

    constructor(){
        this.internalErrors = [];
    }

    sendInternalError(message: InternalErrorDiscord['message'], date: InternalErrorDiscord['date'], route: InternalErrorDiscord['route']){
        this.internalErrors.push(new InternalErrorDiscord(message, date, route));
    }
}

// -------------------------------------------------------
// > LOGS
// -------------------------------------------------------
class LogDiscord{

    type: 'NEW_USER' | 'NEW_VIDEO';
    date: Date;
    data: IEventNewUser | IEventNewVideo

    constructor(type: LogDiscord['type'], date: LogDiscord['date'], data: LogDiscord['data']){
        this.type = type;
        this.date = date;
        this.data = data;
    }

    toEmbed(){
        let embed = { timestamp: this.date.toJSON() };
        if(this.type === 'NEW_USER') return { ...embed, ...this.newUserToEmbed() };
        else return { ...embed, ...this.newVideoToEmbed() };
    }

    newUserToEmbed(){
        return {
            title: `:wave: L'utilisateur ${(this.data as IEventNewUser).name} a rejoint Syncodeo !`
        };
    }

    newVideoToEmbed(){
        return {
            title: `:clapper: L'utilisateur ${(this.data as IEventNewVideo).user.name} a ajouté une nouvelle vidéo !`,
            description: (this.data as IEventNewVideo).video.title,
            url: SITE_URL + '/watch?v=' + (this.data as IEventNewVideo).video.videoId
        }
    }
}
class LogsDiscord{

    logs: LogDiscord[];

    constructor(){
        this.logs = [];
    }

    sendLog(type: LogDiscord['type'], date: LogDiscord['date'], data: LogDiscord['data']){
        this.logs.push(new LogDiscord(type, date, data));
    }
}

// -------------------------------------------------------
// > FEEDBACKS
// -------------------------------------------------------
class FeedbackDiscord{

    page: IEventFeedback['page'];
    message: IEventFeedback['message'];
    date: IEventFeedback['date'];
    user: IEventFeedback['user'];

    constructor(page: FeedbackDiscord['page'], message: FeedbackDiscord['message'], date: FeedbackDiscord['date'], user: FeedbackDiscord['user']){
        this.page = page;
        this.message = message;
        this.date = date;
        this.user = user;
    }

    toEmbed(){
        return {
            title: this.page,
            description: this.message,
            timestamp: this.date.toJSON(),
            fields: [{
                name: "Name",
                value: this.user.name,
                inline: true
            }, {
                name: "Mail",
                value: this.user.mail,
                inline: true
            }, {
                name: "UUID",
                value: this.user.uuid
            }]
        };
    }
}
class FeedbacksDiscord{

    messages: FeedbackDiscord[];
    bugs: FeedbackDiscord[];
    improvements: FeedbackDiscord[];
    features: FeedbackDiscord[];

    constructor(){
        this.messages = [];
        this.bugs = [];
        this.improvements = [];
        this.features = [];
    }

    sendFeedback(type: 'MESSAGE' | 'BUG' | 'IMPROVEMENT' | 'FEATURE', data: IEventFeedback){
        switch(type){
            case "MESSAGE":
                this.messages.push(new FeedbackDiscord(data.page, data.message, data.date, data.user));
                break;
            case "BUG":
                this.bugs.push(new FeedbackDiscord(data.page, data.message, data.date, data.user));
                break;
            case "IMPROVEMENT":
                this.improvements.push(new FeedbackDiscord(data.page, data.message, data.date, data.user));
                break;
            case "FEATURE":
                this.features.push(new FeedbackDiscord(data.page, data.message, data.date, data.user));
                break;
        }
    }
}