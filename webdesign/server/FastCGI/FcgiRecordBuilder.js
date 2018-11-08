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

fcgi.RecordBuilder = function RecordBuilder() {
   
   this.buildStdoutRecord = function buildStdoutRecord(requesterId, content) {
      var requesterIdB1 = (requesterId & 0xFF00) >> 8;
      var requesterIdB0 = requesterId & 0xFF;
      var contentLengthB1 = (content.length & 0xFF00) >> 8;
      var contentLengthB0 = content.length & 0xFF;
      
      var rawRecord = [1, 6, requesterIdB1, requesterIdB0, contentLengthB1, contentLengthB0, 0, 0];
      
      for (var index = 0; index < content.length; index++) {
         rawRecord.push(content.codePointAt(index));
      }
      
      return Buffer.from(rawRecord);
   };
   
   this.buildEndRequestRecord = function buildEndRequestRecord(requesterId) {
      var requesterIdB1 = (requesterId & 0xFF00) >> 8;
      var requesterIdB0 = requesterId & 0xFF;
      var contentLengthB1 = 0;
      var contentLengthB0 = 8;
      var paddingLength = 0;
      var reserved = 0;
      
      return Buffer.from([1, 3, requesterIdB1, requesterIdB0, contentLengthB1, contentLengthB0, paddingLength, reserved, 0, 0, 0, 0, 0, 0, 0, 0]);
   };

};