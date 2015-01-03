
/**
 * Module dependencies
 */

var Writable = require('stream').Writable;
var debug = require('debug')('save-to-mongo');
var util = require('util');
var MongoClient = require('mongodb').MongoClient;


module.exports = SaveToMongo;


// SaveToMongo

function SaveToMongo(opts) {
  if (!(this instanceof SaveToMongo)) return new SaveToMongo(opts);

  var options = this.options = opts || {};

  // check bulk options

  if (options.bulk) {

    if (typeof options.bulk !== 'object') {
      throw new TypeError('Option `bulk` must be an object');
    }

    if (options.bulk.mode !== 'ordered' && options.bulk.mode !== 'unordered') {
      throw new Error('Option `bulk.mode` must be a string and can be "ordered" or "unordered"');
    }

    if (options.bulk.bufferSize && (typeof options.bulk.bufferSize !== 'number' || options.bulk.bufferSize <= 0)) {
      throw new Error('Option `bulk.bufferSize` must be a number greater than 0');
    }

  }

  this.bulk = options.bulk;
  this.opCounter = options.bulk ? 0 : null;

  if (this.bulk && !this.bulk.bufferSize) this.bulk.bufferSize = 1000;

  // stream super constructor

  Writable.call(this, options.streamOptions || {
    objectMode: true
  });

  // handle finish (only if bulk)

  this.on('finish', function() {

    if (this.bulk && this.opCounter > 0) {
      debug('Executing remaining bulk inserts');

      this.executeBulkOps(function(err, result) {
        this._db.close();
        this.emit('done');
      });

    } else {
      this._db.close();
      this.emit('done');
    }

  });

}
util.inherits(SaveToMongo, Writable);

/**
 * Connecting to MongoDB with native driver,
 * then setup collection / db
 *
 * @param  {Function} callback
 */

SaveToMongo.prototype.connect = function(callback) {

  var self = this;
  var options = this.options;

  // check uri / collection / connection

  if (typeof options.uri !== 'string') {
    return this.emit('error', new TypeError('Option `uri` must be a string'));
  }

  if (typeof options.collection !== 'string') {
    return this.emit('error', new TypeError('Option `collection` must be a string'));
  }

  if (options.connection && typeof options.connection !== 'object') {
    return this.emit('error', new TypeError('Option `connection` must be an object'));
  }

  // connecting with MongoClient

  debug('Connecting to MongoDB with native driver...');

  MongoClient.connect(options.uri, options.connection || {}, function(err, db) {

    if (!err) debug('Connected to MongoDB');

    // init db / collection

    self._db = db;
    self._collection = self._db.collection(options.collection);

    callback(err || null);
  });

};

/**
 * Set & return a collection in 'ordered' or 'unordered' bulk mode
 */

SaveToMongo.prototype.getBulkCollection = function() {

  if (this.bulk && this.bulk.mode) {

    debug('Setting collection to %s bulk mode', this.bulk.mode);

    return this.bulk.mode === 'ordered' ?
      this._collection.initializeOrderedBulkOp() :
      this._collection.initializeUnorderedBulkOp();

  }

};


SaveToMongo.prototype._write = function(object, encoding, done) {

  if (!this._db) {

    var self = this;

    this.connect(function(err) {
      if (err) return self.emit('error', err);
      self.insert(object, done);
    });

  } else {
    this.insert(object, done);
  }

};

/**
 * Simple abstraction for an 'insert' op
 *
 * @param  {object} object
 * @param  {Function} callback
 */

SaveToMongo.prototype.insert = function(object, callback) {

  // non-bulk

  if (!this.bulk) return this._defaultInsert(object, callback);

  // bulk

  if (++this.opCounter % this.bulk.bufferSize === 0) {

    this._bulkInsert(object);
    debug('Added last bulk insert of current group');

    var self = this;

    this.executeBulkOps(function(err, result) {
      self._bulkCollection = self.getBulkCollection();

      callback(null);
    });

  } else {

    this._bulkInsert(object);
    callback(null);
  }

};

/**
 * Send a group of bulk inserts
 *
 * @param  {Function} callback
 */

SaveToMongo.prototype.executeBulkOps = function(callback) {
  var self = this;

  debug('Executing bulk %s inserts', this.opCounter);

  this._bulkCollection.execute(function(err, result) {

    // Here we don't emit pure "error", nor passing error on callback.
    // We simply emit a "execute-error" event so the stream won't break.

    if (err) {
      self.emit('execute-error', err);
    } else {
      debug('Correctly inserted %s elements', result.nInserted);
    }

    self.opCounter = 0;
    if (callback) callback.call(self, null, result);

  });

};

/**
 * Execute a bulk insert (without callback)
 *
 * @param  {object} object
 */

SaveToMongo.prototype._bulkInsert = function(object) {

  if (!this._bulkCollection) {
    this._bulkCollection = this.getBulkCollection();
    debug('Obtained bulk collection');
  }

  this._bulkCollection.insert(object);
  debug('Added bulk insert');

};

/**
 * Execute a default insert (with callback)
 *
 * @param  {object} object
 * @param  {Function} callback
 */

SaveToMongo.prototype._defaultInsert = function(object, callback) {

  var self = this;

  this._collection.insert(object, function(err, result) {

    // Here we don't emit pure "error", nor passing error on callback.
    // We simply emit a "write-error" event so the stream won't break.

    if (err) {
      self.emit('write-error', err);
    } else {
      debug('default insert done');
    }

    callback(null, result);
  });

};
