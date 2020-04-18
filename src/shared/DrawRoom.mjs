import { Room, Message } from '@uncut/hotel';

export default class WatchRoom extends Room {

    broadcast(type, data) {
        this.handler.broadcast(this, new Message(type, data));
    }

    constructor() {
        super();

        this.userlist = new Map();
        this.state = {};
        this.history = [];
    }

    handleStroke(stroke) {
        this.history.push(stroke);
    }

    getState() {
        const state = {};

        state.users = [];
        for(let [uid, user] of this.userlist) {
            state.users.push({
                uid: uid,
                tool: user.tool,
                cursor: user.cursor,
            });
        }

        return state;
    }

    socketConnected(socket) {
        this.userlist.set(socket.uid, {
            username: socket.username,
            socket: socket,
        });
    }

    socketDisconnected(socket) {
        this.userlist.delete(socket.uid);
    }

}
