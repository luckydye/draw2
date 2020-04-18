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
            'stroke': msg => this.filterRequest(msg, () => this.handleStroke(msg)),
        });
    }

    handleStroke(msg) {
        const room = this.getRoom(msg.socket.room);

        if(room) {
            const roomUser = room.userlist.get(msg.socket.uid);
            const message = new Message('stroke', { stroke: msg.data, tool: roomUser.tool });
            this.broadcast(room, message, (uid) => uid !== msg.socket.uid);
        }
    }

    filterRequest(message, callback) {
        const room = this.getRoom(message.socket.room);

        if(room) {
            if (!room.state.hostonly || (room.state.hostonly && room.state.host === message.socket.uid)) {
                callback();
            }
        }
    }

    handleUserState(msg) {
        const room = this.getRoom(msg.socket.room);

        const roomUser = room.userlist.get(msg.socket.uid);
        roomUser.cursor = msg.data.state.cursor;
        roomUser.tool = msg.data.state.tool;

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
