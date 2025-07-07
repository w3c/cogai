/*
	Basic HTTP server on port 8000
	and unencrypted web socket on same URL
*/
var URL = require('url'),
        PATH = require('path'),
        FS = require('fs'),
        net = require('net'),
        crypto = require('crypto');
        
const { EventEmitter } = require('node:events');

const mime_types = {
    "html": "text/html",
    "txt": "text/plain",
    "js": "text/javascript",
    "mjs": "text/javascript",
    "json": "application/json",
    "css": "text/css",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "ico": "image/x-icon",
    "svg": "image/svg+xml",
    "mp3": "audio/mpeg",
    "pdf": "application/pdf",
    "ttl": "text/turtle",
    "rdf": "text/turtle",
    "crl": "text/crl",
    "chk": "text/chunks",
    "csv": "text/plain",
    "md": "text/plain",
    "pkn": "text/pkn",
    "ebnf": "text/plain",
    "abnf": "text/plain"
};

const prefix = ".";

class WebServer extends EventEmitter {
    constructor(options = {}) {
        super();
        this.port = options.port || 8000;
        this.clients = new Set();

        net.createServer(socket => {
            let upgraded = false, message = "";
            //console.log('client has connected');

            socket.on('data', data => {
                if (upgraded) {
                    data = Uint8Array.from(data);
                    //console.log("\nreceived: " + data);
        
                    let isMasked = (data[1] & 0b10000000) !== 0;
                    let fin = (data[0] & 0b10000000) !== 0;
                    let opcode = data[0] & 0b00001111;
                    //console.log("opcode = " + opcode);
                    //console.log("masked = " + (isMasked ? true : false));
    
                    let start = 2; // index for first data octet
                    let msglen = data[1] & 0b01111111;
    
                    if (msglen === 126) {
                        let view = new DataView(new ArrayBuffer[2]);
                        view.setUint8(0, data[2]);
                        view.setUint8(1, data[3]);
                        msglen = view.getUint16(0, false); // big-endian
                        start = 4;
                    } else if (msglen === 127) {
                        let view = new DataView(new ArrayBuffer[8]);
                        view.setUint8(0, data[2]);
                        view.setUint8(1, data[3]);
                        view.setUint8(2, data[4]);
                        view.setUint8(3, data[5]);
                        view.setUint8(4, data[6]);
                        view.setUint8(5, data[7]);
                        view.setUint8(6, data[8]);
                        view.setUint8(7, data[9]);
                        messageLength = view.getBigUint64(0, false); // big-endian
                        start = 10;
                    }
    
                    //console.log("payload length = " + msglen);
    
                    if (!isMasked) {
                        console.log("Error: unmasked client message");
                        socket.destroySoon();
                    } else if (opcode === 0x08) {
                        console.log("client requesting close connection");
                        let decoded = new Uint8Array(msglen);
        
                        let i = start + 4;
                        let masks = data.slice(start, i);
                        let index = 0;
                        console.log("masks = " + new Uint8Array(masks));

                        while (index < msglen) {
                            decoded[index] += data[i++] ^ masks[index++ % 4];
                        }
        
                        message = String.fromCharCode(...decoded);
                        console.log("close with message: " + message);
                    } else if (opcode === 0x09) {
                        // need to check the PING & PONG formats against spec
                        console.log("received PING, so send PONG");
                        data[0] = (data[0] & 0xF0) | 0x0A;
                        socket.write(buffer, 'binary');
                    } else if (opcode === 0x0A) {
                        // need to check the PING & PONG formats against spec
                        console.log("received PONG");
                    } else {
                        //console.log("received " + data.length + " raw bytes");
                        //console.log("received " + new Uint8Array(data));
                        let decoded = new Uint8Array(msglen);
        
                        let i = start + 4;
                        let masks = data.slice(start, i);
                        let index = 0;
                        //console.log("masks = " + new Uint8Array(masks));

                        while (index < msglen) {
                            decoded[index] += data[i++] ^ masks[index++ % 4];
                        }
        
                        message += String.fromCharCode(...decoded);
                        //data.splice(0, )
                    
                        // test FIN to check for continuation frame
                        if (fin) {
                            // final frame for this message
                            //thing.receive(socket, message);
                            //console.log("received message: '" + message + "'");
                            this.emit('data', message, (message) => {
                                this.ws_send(socket, message)
                            });
                            
                            message = "";
                        }
        
                        //socket.write(new Buffer.from([0x8A]), 'binary');
                    }
                } else {
                    let lines = data.toString().split('\r\n');
                    let method = lines[0].split(' ')[0];
                    let path = lines[0].split(' ')[1];
                    let headers = {};
    
                    for (let i = 1; i < lines.length - 1; ++i) {
                        let line = lines[i].split(': ');
                        headers[line[0].toLowerCase()] = line[1];
                    }
    
                    //console.log(JSON.stringify(headers));
        
                    if (headers.upgrade === "websocket") {
                        upgraded = true;
            
                        // compute response key for web socket handshake
                        const key = headers['sec-websocket-key'] + 
                            "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
                        let sha = crypto.createHash('sha1');
                        sha.update(key);
                        const accept_key = sha.digest('base64');

                        socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
                            'Upgrade: WebSocket\r\n' +
                            'Connection: Upgrade\r\n' +
                            'Sec-WebSocket-Accept: ' + accept_key + '\r\n' +
                            '\r\n'); 
                
                        this.clients.add(socket);
                        this.emit('new', (data) => {this.ws_send(socket, data)});
                    } else {
                        console.log(lines[0]);
                        if (method === "GET" || method === "HEAD") {
                            this.process_get(method, path, socket);
                        }
                    }
                }
            });
            
            // triggered by write after end
            socket.on('error', (err) => {
                console.log("socket error: " + err.message);
                this.clients.delete(socket);
                socket.destroy();
            });

            socket.on('close', data => {
                console.log("client has left");
                this.clients.delete(socket);
                socket.destroy();
            });
        }).listen(this.port);
    }

    // send message to all current clients
    broadcast(message) {
        this.clients.forEach((socket) => {
            ws_send(socket, message);
        });
    }

    // send unmasked string message to web socket
    // masking only applies to messages from client
    ws_send(socket, message) {
        //console.log("sending message: (" + message.length + " octets) '" + message + "'");
        let start = 2, len = message.length, buffer;

        if (len <= 125) {
            buffer = new Uint8Array(2+len);
            buffer[1] = len;
            start = 2;
        } else if (len <= 0xffff) {
            buffer = new Uint8Array(4+len);
            buffer[1] = 126;
            buffer[2] = (len >> 8) & 0xff;
            buffer[3] = len & 0xff;
            start = 4;
        } else { // 0xffff < len <= 2^63
            buffer = new Uint8Array(10+len);
            buffer[1] = 127;
            buffer[2] = (len >> 56) & 0xff;
            buffer[3] = (len >> 48) & 0xff;
            buffer[4] = (len >> 40) & 0xff;
            buffer[5] = (len >> 32) & 0xff;
            buffer[6] = (len >> 24) & 0xff;
            buffer[7] = (len >> 16) & 0xff;
            buffer[8] = (len >> 8) & 0xff;
            buffer[9] = len & 0xff;
            start = 10;
        }

        buffer[0] = 0x81;

        for (let i = 0; i < message.length; ++i)
            buffer[start+i] = message.charCodeAt(i);

        socket.write(buffer, 'binary');
        //console.log('sent (' + buffer.length + ' octets) ' + buffer);
        //console.log("socket has written " + socket.bytesWritten + " bytes");
    }

    // handles HTTP GET & HEAD requests
    process_get(method, path, socket) {
        //console.log('request for "' + path + '"');
        // assume this is a request for a file

        if (path[path.length-1] === '/')
            path += 'index.html';

        let filename = decodeURI(prefix + path);
        let gzipped = false;

        //console.log('filename: ' + filename);

        FS.stat(filename, function(error, stat) {
            var ext = PATH.extname(filename);
            var mime = null;

            if (ext === ".gz") {
                gzipped = true;
                ext = PATH.extname(filename.substr(0, filename.length-3));
            }

            if (ext.length > 1)
                mime = mime_types[ext.split(".")[1]];

            if (error || !mime) {
                console.log("unable to serve " + filename);
                var body = "404 not found: " + path;
                writeHead(socket, 404, {
                    'Content-Type': 'text/plain',
                    'Content-Length': body.length
                });

                if (method === "GET")
                    socket.write(body);

                socket.end();
            } else {
                if (gzipped) {
                    console.log("filename has mime type " + mime);
                    writeHead(socket, 200, {
                        'Content-Type': mime,
                        'Content-Length': stat.size,
                        'Content-Encoding': 'gzip',
                        'Pragma': 'no-cache',
                        'Cache-Control': 'no-cache',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Credentials': 'true'
                    });
                } else {
                    writeHead(socket, 200, {
                        'Content-Type': mime,
                        'Content-Length': stat.size,
                        'Pragma': 'no-cache',
                        'Cache-Control': 'no-cache',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Credentials': 'true'
                    });
                }
                
                if (method === "GET" && !socket.destroyed) {
                    var stream = FS.createReadStream(filename);
                    stream.pipe(socket);
                } else
                    socket.end();
            }
        });

        function writeHead (socket, code, head) {
            let response = 'HTTP/1.1 200 OK\r\nDate: ' + new Date().toUTCString() + '\r\n';
    
            for (let header in head) {
                response += header + ': ' + head[header] + '\r\n';
            }
    
            response += '\r\n';
            
            if (socket.destroyed)
                console.log("socket already destroyed");
            else
                socket.write(response);
        }
    }
}

let server = new WebServer();

// new client
server.on('new', (reply) => {
    console.log("client has joined");
    reply("world");
    reply("!");
});

// client has sent us some data
server.on('data', (data, reply) => {
    console.log("client sent '" + data + "'");
});

