const {createServer} = require('node:http');
const {Duplex} = require('node:stream');
const {createApp} = require('./start');
const {makeSeason} = require('./catalogue');

// Exercise the actual Express middleware and cookie handling without a listening socket.
function send(app, method, url, body, cookie) {
  return new Promise((resolve,reject) => {
    const timer=setTimeout(()=>reject(new Error(method+" "+url+" did not finish")),3000);
    const output = [];
    const wire = new Duplex({
      read() {},
      write(chunk, encoding, done) { output.push(Buffer.from(chunk)); done(); }
    });
    wire.setTimeout = () => wire;
    wire.once('error', reject);
    wire.once('finish', () => {
      clearTimeout(timer);
      try {
        const response = Buffer.concat(output);
        const split = response.indexOf('\r\n\r\n');
        const headers = response.subarray(0, split).toString('latin1');
        const payload = response.subarray(split + 4);
        resolve({
          code: Number(headers.split(' ')[1]),
          body: /content-type: application\/pdf/i.test(headers) ? payload : JSON.parse(payload.toString()),
          headers,
          cookie: /^set-cookie:\s*([^;]+)/im.exec(headers)?.[1]
        });
      } catch (error) { reject(error); }
    });
    const content = body === undefined ? '' : JSON.stringify(body);
    const headers = [method + ' ' + url + ' HTTP/1.1', 'Host: localhost', 'Connection: close'];
    if (body !== undefined) headers.push('Content-Type: application/json', 'Content-Length: ' + Buffer.byteLength(content));
    if (cookie) headers.push('Cookie: ' + cookie);
    createServer(app).emit('connection', wire);
    wire.push(Buffer.from(headers.join('\r\n') + '\r\n\r\n' + content));
  });
}
function testApp() {
  const docs=new Map();
  const visits={
    async findOne(q){const d=docs.get(q._id);return d && d.expiresAt>new Date()?structuredClone(d):null;},
    async insertOne(d){docs.set(d._id,structuredClone(d));},
    async updateOne(q,op){
      const d=docs.get(q._id);
      if(!d || (q.revision!==undefined&&d.revision!==q.revision) || (q.role&&q.role!==d.role))return {modifiedCount:0};
      Object.assign(d,structuredClone(op.$set));d.revision+=op.$inc?.revision||0;return {modifiedCount:1};
    }
  };
  const baseline=makeSeason();
  return createApp({collection:()=>visits},async()=>structuredClone(baseline));
}
module.exports = { send, testApp };
