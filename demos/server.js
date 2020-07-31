/*
	Basic HTTP server on port 8000 for debugging my apps
*/
var HTTP = require("http"),
        URL = require('url'),
        PATH = require('path'),
        FS = require('fs');
        
const mime_types = {
    "html": "text/html",
    "txt": "text/plain",
    "js": "text/javascript",
    "json": "application/json",
    "css": "text/css",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "ico": "image/x-icon",
    "mp3": "audio/mpeg",
	"pdf": "application/pdf",
    "ttl": "text/turtle",
    "rdf": "text/turtle",
    "crl": "text/crl",
    "chk": "text/chunks",
	"csv": "text/plain",
	"md": "text/plain"
};

const port = 8000;
const prefix = ".";

const server = HTTP.createServer(function(request, response) {
	var uri = URL.parse(request.url);
	
	if (request.method === "GET" || request.method === "HEAD") {
		process_get(request, response, uri);
	}
}).listen(port);


// handles HTTP GET & HEAD requests
function process_get(request, response, uri) {
	let path = URL.parse(request.url).pathname;
	console.log('request for "' + path + '"');
	// assume this is a request for a file

	if (path[path.length-1] === '/')
		path += 'index.html';

	let filename = decodeURI(prefix + path);
	let gzipped = false;

	console.log('filename: ' + filename);

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
			var body = "404 not found: " + request.url;
			response.writeHead(404, {
				'Content-Type': 'text/plain',
				'Content-Length': body.length
			});

			if (request.method === "GET")
				response.write(body);

			response.end();
		} else {
			if (gzipped) {
				console.log("filename has mime type " + mime);
				response.writeHead(200, {
					'Content-Type': mime,
					'Content-Encoding': 'gzip',
					'Pragma': 'no-cache',
					'Cache-Control': 'no-cache',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Credentials': 'true',
					'Content-Length': stat.size
				});
			} else {
				response.writeHead(200, {
					'Content-Type': mime,
					'Pragma': 'no-cache',
					'Cache-Control': 'no-cache',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Credentials': 'true',
					'Content-Length': stat.size
				});
			}

			if (request.method === "GET") {
				var stream = FS.createReadStream(filename);
				stream.pipe(response);
			} else
				response.end();
		}
	});
}
