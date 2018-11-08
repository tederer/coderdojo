// Please note that the purpose of this FastCGI (FCGI) listener is to understand/learn how FCGI works.
// Its implementation is not yet finished. Still open is the handling of multiple connections.
// Therefore this code should not be used in production!

const net = require('net');

const FcgiRecordParser = require('./FcgiRecordParser.js');
const FcgiRecordBuilder = require('./FcgiRecordBuilder.js');

var PORT = 8081;
var recordParser = new fcgi.RecordParser();
var recordBuilder = new fcgi.RecordBuilder();
var parameters = {};
var stdin = '';

const server = net.createServer();

function processParameters(record) {
   if (record.type === 'PARAMS') {
      Object.keys(record.content).forEach((key) => {
         parameters[key] = record.content[key];
      });
   }
};

function processStdin(record) {
   if (record.type === 'STDIN') {
      stdin += record.content;
   }
};

function sendResponse(socket, requestId) {
   var response = recordBuilder.buildStdoutRecord(requestId, 'Content-type: text/html\r\n\r\n<html><head><title>fcgi test</title></head><body><h1>test</h1></body></html>');
   socket.write(response);
   var emptyResponse = recordBuilder.buildStdoutRecord(requestId, '');
   socket.write(emptyResponse);
   var endRequestResponse = recordBuilder.buildEndRequestRecord(requestId);
   socket.write(endRequestResponse);
};

server.on('listening', () => {
   console.log('listening on port ' + PORT + ' ...');
});

server.on('connection', (socket)=> {
   
   console.log(' --- new connection ---');
   
   socket.on('end', () => {
      console.log('connection closed by remote party');
      socket.end();
      parameters = {};
      stdin = '';
   });
   
   socket.on('data', (buffer) => {
      recordParser.addData(buffer);
      
      var record = recordParser.getNextRecord();
      while(record !== undefined) {
         
         processParameters(record);
         processStdin(record);
         
         if (record.type === 'STDIN' && record.content.length === 0) {
            console.log('requestId = ' + record.requestId);
            console.log('params = ' + JSON.stringify(parameters));
            console.log('stdin = ' + stdin);
            sendResponse(socket, record.requestId);
            socket.end();
         }
         
         record = recordParser.getNextRecord();
      }
   });
});

server.on('error', (err) => {
   throw err;
});

server.listen(PORT);
