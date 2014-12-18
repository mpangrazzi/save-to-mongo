
/**
 * Module dependencies
 */

var JSONStream = require('JSONStream');
var fs = require('fs');
var path = require('path');
var db = require('monk')('localhost/test');

var SaveToMongo = require('../lib');
var accounts = fs.createReadStream(path.join(__dirname, './accounts.json'));


var saveToMongo = SaveToMongo({
  uri: 'mongodb://127.0.0.1:27017/test',
  collection: 'savetomongo',
  bulk: {
    mode: 'ordered'
  }
});

db.get('savetomongo').remove({}, start);

function start() {
  accounts
    .pipe(JSONStream.parse('*'))
    .pipe(saveToMongo)
    .on('done', function() {
      console.log('All done!');
      process.exit(0);
    });

}

