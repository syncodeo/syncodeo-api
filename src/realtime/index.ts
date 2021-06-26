/**
 * Modules
 */
import * as SocketIO from 'socket.io';
import * as HTTP from 'http';

import { SOCKET_IO_PORT } from '../config';
import Queue from '../helpers/Queue';
import { EventData, SendRealtimeDataType } from '../interfaces/realtime';

/**
 * Variables
 */
const server = HTTP.createServer();
const io = SocketIO(server, {
    path: '/io',
    serveClient: false,
    cookie: false 
});
const events = new Queue<EventData>(10);

/**
 * Export
 */
const Realtime = {
    send(data: SendRealtimeDataType){
        let event: EventData = {
            type: data.type,
            user: data.user.name,
            video: data.video.videoId,
            thumbnail: data.user.picture,
            date: new Date()
        };
        events.add(event);
        io.emit('EVENT', event);
    },
    getLast(){
        return events.get();
    }
}
export default Realtime;

/**
 * Si client
 */
io.on('connection', (socket) => {
    socket.emit('EVENTS', {
        events: events.get(),
        size: events.size
    });
});

/**
 * Ecoute du serveur Socket.IO
 */
export const startIOServer = () => new Promise((resolve, reject) => {
    server.listen(SOCKET_IO_PORT, resolve);
});