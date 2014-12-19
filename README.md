Save-To-Mongo
=============

A Node.js Writable stream useful for saving (big) object streams directly to MongoDB.

Features:

- Connects to MongoDB using [node-mongodb-native](https://github.com/mongodb/node-mongodb-native)
- Supports both [ordered an unordered](http://docs.mongodb.org/manual/core/bulk-write-operations/#ordered-vs-unordered-operations) bulk modes for fast inserts


## Usage

See `/examples` folder. But basically:

```js
var JSONStream = require('JSONStream');
var fs = require('fs');
var path = require('path');

// init stream

var SaveToMongo = require('save-to-mongo');

var saveToMongo = SaveToMongo({
  uri: 'mongodb://127.0.0.1:27017/test',
  collection: 'savetomongo',
  bulk: {
    mode: 'unordered'
  }
});

// go!!!

fs.createReadStream(path.join(__dirname, './accounts.json'));
  .pipe(JSONStream.parse('*'))
  .pipe(saveToMongo)
  .on('execute-error', function(err) {
    console.log(err);
  })
  .on('done', function() {
    console.log('All done!');
    process.exit(0);
  });
```

JSON random data was generated using [json-generator](http://www.json-generator.com).


## Documentation

To obtain a `Save-To-Mongo` instance, you have to do:

```js
  var SaveToMongo = require('save-to-mongo');
  var stream = SaveToMongo({ /* options */ });
```

stream available `options` are:

- `uri` (String, required): MongoDB connection uri.
- `collection` (String, required): MongoDB target collection.
- `connection` (Object, optional): optional connection options. You can pass all options supported by [node-mongodb-native](https://github.com/mongodb/node-mongodb-native).
- `streamOptions` (Object, optional): underlying Writable stream options. Default: `{ objectMode: true }`.
- `bulk` (Object, optional): enables [bulk](http://docs.mongodb.org/manual/core/bulk-write-operations) mode. If you set this, you may want to set also:
  - `mode`: (String, required): can be `ordered` or `unordered`. See MongoDB docs if you want more info on them.
  - `bufferSize` (Number, required): By default all bulk operations are splitted in groups, each contains **1000** ops. Change this if you want a lower value.


## Events

#### "write-error"

Emitted every time a MongoDB `insert` op fails (e.g: duplicate *_id*). Note that this will not *break* the stream.

#### "execute-error"

Emitted every time a MongoDB `execute` op fails. Note that this will not *break* the stream.

#### "done"

Emitted when all writes are executed (after stream's `finish` event).


## Performance

Both bulk modes (expecially *unordered* mode) increases significantly `insert` speed.

On provided examples:

```bash

# for 100 records

time node ./examples/default.js # real: 0m0.450s
time node ./examples/unordered.js # real: 0m0.340s
```

**UPDATE**: for **100000** records (similar to the ones used in examples), using bulk unordered method drop execution time from 2:42m to 1:42m. Not bad :)

## Debug

This module is built with [debug](https://github.com/visionmedia/debug), so you can inspect what's happening.

On examples, you can do:

```bash
DEBUG=save-to-mongo node ./exampes/default.js
```


## Install

With [npm](https://www.npmjs.com):

```bash
npm install save-to-mongo
```
