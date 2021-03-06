
/**
 * Module dependencies
 */

var JSONStream = require('JSONStream');
var SaveToMongo = require('../lib');
var fs = require('fs');
var path = require('path');
var db = require('monk')('localhost/test');

var accounts = null;

describe('Save-To-Mongo', function() {

  beforeEach(function(done) {
    accounts = fs.createReadStream(path.join(__dirname, '../examples/accounts.json'));
    db.get('savetomongo').remove({}, done);
  });


  it('Should emit error if options `uri` is missing', function(done) {

    var saveToMongo = SaveToMongo({
      collection: 'savetomongo'
    });

    accounts
      .pipe(JSONStream.parse('*'))
      .pipe(saveToMongo)
      .on('error', function(err) {
        err.message.should.equal('Option `uri` must be a string');
        done();
      });

  });


  it('Should emit error if options `collection` is missing', function(done) {

    var saveToMongo = SaveToMongo({
      uri: 'mongodb://127.0.0.1:27017/test'
    });

    accounts
      .pipe(JSONStream.parse('*'))
      .pipe(saveToMongo)
      .on('error', function(err) {
        err.message.should.equal('Option `collection` must be a string');
        done();
      });

  });


  it('Should write all objects to MongoDB (default mode)', function(done) {

    var saveToMongo = SaveToMongo({
      uri: 'mongodb://127.0.0.1:27017/test',
      collection: 'savetomongo'
    });

    accounts
      .pipe(JSONStream.parse('*'))
      .pipe(saveToMongo)
      .on('done', function() {

        db.get('savetomongo').count({}, function(err, count) {
          count.should.be.exactly(100);
          done();
        });

      });

  });


  it('Should write all objects to MongoDB (bulk ordered)', function(done) {

    var saveToMongo = SaveToMongo({
      uri: 'mongodb://127.0.0.1:27017/test',
      collection: 'savetomongo',
      bulk: {
        mode: 'ordered'
      }
    });

    accounts
      .pipe(JSONStream.parse('*'))
      .pipe(saveToMongo)
      .on('done', function() {

        db.get('savetomongo').count({}, function(err, count) {
          count.should.be.exactly(100);
          done();
        });

      });

  });


  it('Should write all objects to MongoDB (bulk unordered)', function(done) {

    var saveToMongo = SaveToMongo({
      uri: 'mongodb://127.0.0.1:27017/test',
      collection: 'savetomongo',
      bulk: {
        mode: 'unordered'
      }
    });

    accounts
      .pipe(JSONStream.parse('*'))
      .pipe(saveToMongo)
      .on('done', function() {

        db.get('savetomongo').count({}, function(err, count) {
          count.should.be.exactly(100);
          done();
        });

      });

  });


  it('Should write all objects to MongoDB (bulk ordered, little buffer)', function(done) {

    var saveToMongo = SaveToMongo({
      uri: 'mongodb://127.0.0.1:27017/test',
      collection: 'savetomongo',
      bulk: {
        mode: 'ordered',
        bufferSize: 20
      }
    });

    accounts
      .pipe(JSONStream.parse('*'))
      .pipe(saveToMongo)
      .on('done', function() {

        db.get('savetomongo').count({}, function(err, count) {
          count.should.be.exactly(100);
          done();
        });

      });

  });


  it('Should write all objects to MongoDB (bulk unordered, little buffer)', function(done) {

    var saveToMongo = SaveToMongo({
      uri: 'mongodb://127.0.0.1:27017/test',
      collection: 'savetomongo',
      bulk: {
        mode: 'unordered',
        bufferSize: 20
      }
    });

    accounts
      .pipe(JSONStream.parse('*'))
      .pipe(saveToMongo)
      .on('done', function() {

        db.get('savetomongo').count({}, function(err, count) {
          count.should.be.exactly(100);
          done();
        });

      });

  });


  it('Should continue stream if an error has occurred (e.g.: E11000 duplicate key error index)', function(done) {

    var collection = db.get('savetomongo');
    var dup = require('../examples/accounts.json')[0];

    var saveToMongo = SaveToMongo({
      uri: 'mongodb://127.0.0.1:27017/test',
      collection: 'savetomongo'
    });

    saveToMongo.on('write-error', function(err) {
      console.log('write', err)
      err.code.should.be.exactly(11000);
    });

    collection.insert(dup, { castIds: false })
      .then(function(object) {

        accounts
          .pipe(JSONStream.parse('*'))
          .pipe(saveToMongo)
          .on('done', function() {

            collection.count({}, function(err, count) {
              console.log(err, count)
              count.should.be.exactly(100);
              done();
            });

          })
      })
      .catch(function(err) {
        console.log(err)
      })

  });


});
