import { MessageHandler, Message } from '@uncut/hotel';
import RoomStateMessage from '@uncut/hotel/src/messages/RoomStateMessage.mjs';
import WatchRoom from './DrawRoom.mjs';

export default class DrawMessageHandler extends MessageHandler {

    static get Room() {
        return WatchRoom;
    }

    get messageTypes() {
        return Object.assign(super.messageTypes, {
            'ping': msg => { },
            'user.state': msg => this.filterRequest(msg, () => this.handleUserState(msg)),
            'canvas.request': msg => this.filterRequest(msg, () => this.handleUserCanvasRequest(msg)),
            'canvas.initial': msg => this.filterRequest(msg, () => this.handleUserCanvasPush(msg)),
            'stroke': msg => this.filterRequest(msg, () => this.handleStroke(msg)),
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

    handleStroke(msg) {
        const room = this.getRoom(msg.socket.room);

        if(room) {
            const roomUser = room.userlist.get(msg.socket.uid);
            const stroke = { stroke: msg.data, tool: roomUser.tool };
            room.handleStroke(stroke);
            const message = new Message('stroke', stroke);
            this.broadcast(room, message, (uid) => uid !== msg.socket.uid);
        }
    }

    handleUserState(msg) {
        const room = this.getRoom(msg.socket.room);

        const roomUser = room.userlist.get(msg.socket.uid);
        roomUser.cursor = msg.data.state.cursor;
        roomUser.tool = msg.data.state.tool;

        this.broadcast(room, new Message('room.state', room.getState()));
    }

    handleUserCanvasRequest(msg) {
        const room = this.getRoom(msg.socket.room);
        const firstUser = [...room.userlist][0][1];

        firstUser.socket.send(JSON.stringify({ type: 'canvas.request' }));
    }

    handleUserCanvasPush(msg) {
        const room = this.getRoom(msg.socket.room);
        this.broadcast(room, new Message('canvas.initial', { canvas: msg.data.canvas } ));
    }

    handleJoinMessage(message) {
        super.handleJoinMessage(message);

        const room = this.getRoom(message.socket.room);

        // TODO: no no
        room.handler = this;

        room.socketConnected(message.socket);

        message.reply(new Message('join', { 
            id: message.socket.uid,
            canvas: room.history
        }));

        message.reply(new Message('room.state', room.getState()));
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
