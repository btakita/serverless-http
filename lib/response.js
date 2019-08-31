'use strict';

const http = require('http');
const stream = require('stream');

const headerEnd = '\r\n\r\n';

const BODY = Symbol();
const HEADERS = Symbol();

function getString(data) {
  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  } else if (typeof data === 'string') {
    return data;
  } else {
    throw new Error(`response.write() of unexpected type: ${typeof data}`);
  }
}

module.exports = class ServerlessResponse extends http.ServerResponse {

  static from(res) {
    const response = new ServerlessResponse(res);

    response.statusCode = res.statusCode
    response[HEADERS] = res.headers;
    response[BODY] = [Buffer.from(res.body)];
    response.end();
    console.debug('serverless-http|ServerlessResponse|from|debug|1')
    console.debug(`res.body: ${JSON.stringify(res.body)}`)
    console.debug(`response[BODY]: ${JSON.stringify(response[BODY])}`)
    return response;
  }

  static body(res) {
    console.debug('serverless-http|ServerlessResponse|body|debug|1')
    console.debug(`res[BODY].toString(): ${JSON.stringify(res[BODY].toString())}`)
    console.debug(`res[BODY]: ${JSON.stringify(res[BODY])}`)
    console.debug(`Buffer.concat(res[BODY]): ${JSON.stringify(Buffer.concat(res[BODY]))}`)
    return Buffer.concat(res[BODY]);
  }

  static headers(res) {
    return Object.assign(res._headers, res[HEADERS]);
  }

  get headers() {
    return this[HEADERS];
  }

  setHeader(key, value) {
    if (this._wroteHeader) {
      this[HEADERS][key] = value;
    } else {
      super.setHeader(key, value);
    }
  }

  constructor(req) {
    super(req);

    this[BODY] = [];
    this[HEADERS] = {};

    this._headers = {};

    this.useChunkedEncodingByDefault = false;
    this.chunkedEncoding = false;

    const addData = (data) => {
      if (Buffer.isBuffer(data) || typeof data === 'string') {
        console.debug('serverless-http|addData|debug|1')
        console.debug(`data: ${JSON.stringify(data)}`)
        this[BODY].push(Buffer.from(data));
      } else {
        throw new Error(`response.write() of unexpected type: ${typeof data}`);
      }
    }

    this.assignSocket(new stream.Writable({
      // sometimes the data is written directly to the socket
      write: (data, encoding, done) => {
        if (typeof encoding === 'function') {
          done = encoding;
          encoding = null;
        }

        if (this._wroteHeader) {
          addData(data);
        } else {
          const string = getString(data);
          const index = string.indexOf(headerEnd);

          if (index !== -1) {
            const remainder = string.slice(index + headerEnd.length);

            if (remainder) {
              addData(remainder);
            }

            this._wroteHeader = true;
          }
        }

        if (typeof done === 'function') {
          done();
        }
      }
    }));

    this.write = function(data, encoding, callback) {
      if (typeof encoding === 'function') {
        callback = encoding;
        encoding = null;
      }
console.debug('serverless-http|write|debug|1')
      console.debug(`encoding: ${JSON.stringify(encoding)}`)
      addData(data);

      if (typeof callback === 'function') {
        callback();
      }
    };

  }

};
