
let reconnecting;

function displayNotification(msg, time) {
    console.log(msg);
}

class HotelClient {

	emit(type, data) {
		this.send({ type, data });
	}

	on(type, callback) {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, []);
		}
		const arr = this.listeners.get(type);
		arr.push(callback);
	}

	constructor() {
		this.connected = false;
		this.listeners = new Map();
		this.pingRate = 5000;
		this.pingTimer = null;
	}

	send(data) {
		if (this.connected) {
			this.socket.send(JSON.stringify(data));
		}
	}

	sendBinary(data) {
		this.socket.send(data);
	}

	onMessage(e) {
		const listeners = this.listeners.get(e.type);
		if (listeners) {
			for (let listener of listeners) {
				listener(e.data);
			}
		}
	}

	ping() {
		this.send({ type: 'ping' });

		clearTimeout(this.pingTimer);
		this.pingTimer = setTimeout(this.ping.bind(this), this.pingRate);
	}

	onConnect(e) {
		console.log('[WebSocket] connected to', this.socket.url);

		this.ping();
	}

	onError(e) {
		console.log('[WebSocket] error on socket', e);

		displayReloadPrompt();
	}

	onClose(e) {
		console.log('[WebSocket] socket closed', e);

		const listeners = this.listeners.get('disconnect');
		if (listeners) {
			for (let listener of listeners) {
				listener(e.data);
			}
		}
	}

	connect() {
		return new Promise((resolve, reject) => {
			if (this.connected) reject('already connected');

			this.protocol = location.protocol == "https:" ? "wss:" : "ws:";

			this.socket = new WebSocket(`${this.protocol}//${location.host}/`);

			this.socket.onmessage = e => {
				if (e.data instanceof Blob) {
					this.onMessage(e.data);
				} else {
					try {
						const json = JSON.parse(e.data);
						this.onMessage(json);
					} catch (err) {
						console.error('recieved unhandled response', err);
					}
				}
			};

			this.socket.onopen = e => {
				this.connected = true;
				resolve(this.socket);
				this.onConnect(e);
			}

			this.socket.onerror = e => {
				this.connected = false;
				reject('error connecting to socket');
				this.onError(e);
			}
			this.socket.onclose = e => {
				this.connected = false;
				this.onClose(e);
			};
		})
	}

}


export default class SocketClient {

	get username() { return "Unknown User"; }

	isHost() {
		return this.id === this.host;
	}

	constructor() {
		this.client = new HotelClient();
        this.client.connect();
        
		this.updaterate = 500;
		this.room = null;
    }
    
    sendUpdate() {
        this.client.emit('user.state', {
            timestamp: Date.now(),
            
        });

        if(this.client.connected) {
            setTimeout(() => this.sendUpdate(), this.updaterate);
        }
    }

	init() {
		this.sendUpdate();

		this.events = {

			'disconnect': () => {
				displayNotification("ERROR: Disconnected", 2000);

				if (!reconnecting) {
					reconnecting = setInterval(() => {
						if (!this.client.connected) {
							this.client.connect();
						} else {
							this.connect(location.pathname);
							clearInterval(reconnecting);
							reconnecting = null;
						}
					}, 1000);
				} else {
					displayReloadPrompt();
				}
			},

			'join': msg => {
				this.id = msg.id;
			},

			'message': msg => {
				
			},

			'room.state': msg => {
				this.host = msg.host;

				
			},

			'room.list': msg => {
				
			},
		}

		this.initListeners(this.events);
	}

	initListeners(events) {
		for (let event in events) {
			this.client.on(event, msg => {
				events[event](msg);
			});
		}
	}

	emit(event, msg) {
		this.client.emit(event, msg);
	}

	connect(roomId) {
		const socket = this.client;

		this.room = roomId;

		socket.emit('join', {
			roomId: roomId,
			username: this.username
		});

		displayNotification("Connected", 2500);
	}

}
