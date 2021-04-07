// web worker for memory experiments

onconnect = function(e) {
   let port = e.ports[0];

   // handle message from web page
   port.onmessage = function(e) {
       let data = e.data;
       let result = 'Result: ' + (data[0] * data[1]);
       port.postMessage(result);
   }
}

onmessage = function (e) {
	postMessage(e.data);
}