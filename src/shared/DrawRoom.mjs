import { Room, Message } from '@uncut/hotel';

export default class WatchRoom extends Room {

    broadcast(type, data) {
        this.handler.broadcast(this, new Message(type, data));
    }

    constructor() {
        super();

        this.userlist = new Map();

        this.state = {
            host: null,
            hostonly: false,
        }
    }

    getState() {
        return this.state;
    }

    socketConnected(socket) {
        if (this.userlist.size < 1 && this.queue.length > 0) {
            const vid = this.queue[0];
            this.loadVideo(vid.service, vid.id);
        }

        this.userlist.set(socket.uid, {
            username: socket.username,
            socket: socket,
        });

        if (!this.hostId || this.userlist.size < 1) {
            this.hostId = socket.uid;
        }

        this.resolveHost(socket);
    }

    socketDisconnected(socket) {
        this.userlist.delete(socket.uid);
        this.resolveHost(socket);
    }

    resolveHost(socket) {
        // find another host
        const currentHost = this.userlist.get(this.hostId);
        if (!currentHost) {
            const next = this.userlist.keys().next().value;
            this.hostId = next;

            const host = this.userlist.get(this.hostId);

            if (host) {
                const hostSocket = host.socket;
                console.log("Found new host from " + hostSocket.uid + " to " + next + " for " + this.id);
            }
        }

        this.state.host = this.hostId;
    }

}
