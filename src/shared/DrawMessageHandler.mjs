import { MessageHandler, Message } from '@uncut/hotel';
import RoomStateMessage from '@uncut/hotel/src/messages/RoomStateMessage.mjs';
import WatchRoom from './DrawRoom.mjs';

export default class WatchMessageHandler extends MessageHandler {

    static get Room() {
        return WatchRoom;
    }

    get messageTypes() {
        return Object.assign(super.messageTypes, {
            'ping': msg => { },
            'user.state': msg => this.filterRequest(msg, () => this.handleUserState(msg)),
            'user.canvas': msg => this.filterRequest(msg, () => this.handleUserCanvas(msg)),
        });
    }

    filterRequest(message, callback) {
        const room = this.getRoom(message.socket.room);

        if(room) {
            if (!room.state.hostonly || (room.state.hostonly && room.state.host === message.socket.uid)) {
                callback();
            }
        }
    }

    handleUserCanvas(msg) {
        const room = this.getRoom(msg.socket.room);
        if(room) {
            room.state.canvas = msg.data.canvas;
        }
    }

    handleUserState(msg) {
        const room = this.getRoom(msg.socket.room);

        const roomUser = room.userlist.get(msg.socket.uid);
        roomUser.cursor = msg.data.state.cursor;
        roomUser.tool = msg.data.state.tool;

        const stroke = roomUser.stroke;
        roomUser.stroke = msg.data.state.stroke;

        if(stroke && stroke.length > 0 && msg.data.state.drawing) {
            roomUser.stroke.unshift(stroke[stroke.length-1]);
        }

        this.broadcast(room, new Message('room.state', room.getState()));
    }

    handleJoinMessage(message) {
        super.handleJoinMessage(message);

        const room = this.getRoom(message.socket.room);

        // TODO: no no
        room.handler = this;

        room.socketConnected(message.socket);

        message.reply(new Message('join', { id: message.socket.uid }));
        message.reply(new Message('room.state', room.getState()));
        message.reply(new Message('room.canvas', { canvas: room.state.canvas }));
    }

    handleLeaveMessage(message) {
        super.handleLeaveMessage(message);

        const room = this.getRoom(message.socket.room);

        if (room) {
            room.socketDisconnected(message.socket);

            this.broadcast(room, new Message('message', {
                message: message.socket.username + " left"
            }));
        }
    }

}
