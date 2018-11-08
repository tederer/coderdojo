require('./NamespaceUtils.js');

assertNamespace('fcgi');

// typedef struct {
//    unsigned char version;
//    unsigned char type;
//    unsigned char requestIdB1;
//    unsigned char requestIdB0;
//    unsigned char contentLengthB1;
//    unsigned char contentLengthB0;
//    unsigned char paddingLength;
//    unsigned char reserved;
//    unsigned char contentData[contentLength];
//    unsigned char paddingData[paddingLength];
// } FCGI_Record;

fcgi.RecordParser = function RecordParser() {
   
   var RECORDTYPE = {
       1: 'BEGIN_REQUEST',    
       2: 'ABORT_REQUEST',     
       3: 'END_REQUEST',        
       4: 'PARAMS',             
       5: 'STDIN',              
       6: 'STDOUT',             
       7: 'STDERR',             
       8: 'DATA',               
       9: 'GET_VALUES',         
      10: 'GET_VALUES_RESULT' 
   };
   
   var ROLE = {
      1: 'FCGI_RESPONDER', 
      2: 'FCGI_AUTHORIZER',
      3: 'FCGI_FILTER'   
   };
   
   var decodeBeginRequest = function decodeBeginRequest() {
      var role = (currentRecord.content[0] << 8) + currentRecord.content[1];
      var flags = currentRecord.content[2];
      currentRecord.content = {role: ROLE[role], closeConnectionAfterResponding: (flags & 1) === 1};
   };
   
   var decodeLength = function decodeLength(bytes) {
      var value = 0;
      
      for (var index = 0; index < bytes.length; index++) {
         var readByte = bytes[index];
         if (index === 0 && bytes.length === 4) {
            readByte = readByte & 0x7f;
         }
         value += readByte << (8 * (bytes.length - index - 1));
      }
      
      return value;
   };
   
   var decodeParams = function decodeParams() {
      var index = 0;
      var params = {};
      
      while (index < currentRecord.content.length) {
         var nameLengthByteCount = ((currentRecord.content[index] & 0x80) === 1) ? 4 : 1;
         var valueLengthByteCount = ((currentRecord.content[index + nameLengthByteCount] & 0x80) === 1) ? 4 : 1;
         
         var nameLength = decodeLength(currentRecord.content.slice(index, index + nameLengthByteCount));
         var valueLength = decodeLength(currentRecord.content.slice(index + nameLengthByteCount, index + nameLengthByteCount + valueLengthByteCount));
         
         index += nameLengthByteCount + valueLengthByteCount;
         
         var name = '';
         for(var nameIndex = 0; nameIndex < nameLength; nameIndex++) {
            name += String.fromCharCode(currentRecord.content[index + nameIndex]);
         }
         
         index += nameLength;
         
         var value = '';
         for(var valueIndex = 0; valueIndex < valueLength; valueIndex++) {
            value += String.fromCharCode(currentRecord.content[index + valueIndex]);
         }
         
         index += valueLength;
         params[name] = value;
      }
      
      currentRecord.content = params;
   };
   
   var decodeStdin = function decodeStdin() {
      var text = '';
      
      for (var index = 0; index < currentRecord.content.length; index++) {
         text += String.fromCharCode(currentRecord.content[index]);
      }
      
      currentRecord.content = text;
   };
   
   var decodeStdout = function decodeStdout() {
      decodeStdin();
   };
   
   var decodeContent = function decodeContent() {
      switch (currentRecord.type) {
         case 'BEGIN_REQUEST':   decodeBeginRequest();
                                 break;
         case 'PARAMS':          decodeParams();
                                 break;
         case 'STDIN':           decodeStdin();
                                 break;
         case 'STDOUT':          decodeStdout();
                                 break;
      }
   };
   
   var currentRecordIsComplete = function currentRecordIsComplete() {
      decodeContent();
      receivedRecords.push(currentRecord);
      currentRecord = {};
   };

   var setState = function setState(nextState) {
      state = nextState;
      state.activate();
   };
      
   var VersionReadingState = function VersionReadingState() {
      
      this.processByte = function processByte(value) {
         currentRecord.version = value;
         setState(new TypeReadingState());
      };
      
      this.activate = function activate() {};
   };
   
   var TypeReadingState = function TypeReadingState() {
      
      this.processByte = function processByte(value) {
         currentRecord.type = RECORDTYPE[value];
         setState(new RequestIdReadingState());
      };
      
      this.activate = function activate() {};
   };
   
   var RequestIdReadingState = function RequestIdReadingState() {
      var requestId = 0;
      var bytesToRead = 2;
      
      this.processByte = function processByte(value) {
         bytesToRead--;
         requestId += value << (bytesToRead * 8);
         if (bytesToRead === 0) {
            currentRecord.requestId = requestId;
            setState(new ContentLengthReadingState());
         }
      };
      
      this.activate = function activate() {};
   };
   
   var ContentLengthReadingState = function ContentLengthReadingState() {
      var contentLength = 0;
      var bytesToRead = 2;
      
      this.processByte = function processByte(value) {
         bytesToRead--;
         contentLength += value << (bytesToRead * 8);
         if (bytesToRead === 0) {
            currentRecord.contentLength = contentLength;
            setState(new PaddingLengthReadingState());
         }
      };
      
      this.activate = function activate() {};
   };
   
   var PaddingLengthReadingState = function PaddingLengthReadingState() {
      
      this.processByte = function processByte(value) {
         currentRecord.paddingLength = value;
         setState(new ReservedReadingState());
      };
      
      this.activate = function activate() {};
   };
   
   var ReservedReadingState = function ReservedReadingState() {
      
      this.processByte = function processByte(value) {
         setState(new ContentDataReadingState());
      };
      
      this.activate = function activate() {};
   };
   
   var ContentDataReadingState = function ContentDataReadingState() {
      var bytesToRead = currentRecord.contentLength;
      var content = [];
      
      this.processByte = function processByte(value) {
         bytesToRead--;
         content.push(value);
         if (bytesToRead === 0) {
            currentRecord.content = content;
            setState(new PaddingDataReadingState());
         }
      };
      
      this.activate = function activate() {
         if (bytesToRead === 0) {
            currentRecord.content = [];
            setState(new PaddingDataReadingState());
         }
      };   
   };
   
   var PaddingDataReadingState = function PaddingDataReadingState() {
      var bytesToRead = currentRecord.paddingLength;
      var content = '';
      
      this.processByte = function processByte(value) {
         bytesToRead--;
         if (bytesToRead === 0) {
            currentRecordIsComplete();
            setState(new VersionReadingState());
         }
      };
            
      this.activate = function activate() {
         if (bytesToRead === 0) {
            currentRecordIsComplete();
            setState(new VersionReadingState());
         }
      };
   };
   
   var receivedRecords = [];
   var currentRecord = {};
   
   var state = new VersionReadingState();
   
   this.addData = function addData(buffer) {
      for (const value of buffer) {
         state.processByte(value);
      }
   };
   
   this.getNextRecord = function getNextRecord() {
      return receivedRecords.shift();
   };
};