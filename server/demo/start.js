const express = require('express');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { randomBytes, createHash } = require('node:crypto');
const { MongoClient } = require('mongodb');
const { accounts, makeSeason, availableEvents, reserve, editEvent, addEvent, deleteEvent, dashboard, problem } = require('./catalogue');
const { buildDemoTicketPdf } = require('../utils/ticketPdf');

const dbName = 'ticketnen_portfolio_demo';
const ttl = 24 * 60 * 60 * 1000;
const fingerprint = token => createHash('sha256').update(token).digest('hex');
const publicAccount = role => {
  const account = accounts.find(a => a.role === role);
  return account ? { name: account.name, email: account.email, role } : null;
};

async function initialise(db) {
  if (db.databaseName !== dbName) throw new Error('The portfolio service requires its dedicated database.');
  await db.collection('visits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const seasons = db.collection('catalogue');
  async function season() {
    const current = await seasons.findOne({ _id: 'programme' });
    if (current?.events.length && current.events.every(e => Date.parse(e.startsAt) > Date.now())) return current;
    const next = { ...makeSeason(), version: randomBytes(12).toString('hex') };
    if (!current) {
      try { await seasons.updateOne({ _id:'programme' }, { $setOnInsert:next }, { upsert:true }); }
      catch (error) { if (error.code !== 11000) throw error; }
    } else {
      await seasons.updateOne({ _id:'programme', version: current.version }, { $set:next });
    }
    return seasons.findOne({ _id:'programme' });
  }
  await season();
  return season;
}

function createApp(db, season) {
  const app = express();
  const visits = db.collection('visits');
  app.disable('x-powered-by');
  app.use('/api',express.json({ limit:'8kb' }), (req,res,next) => {
    res.set('Cache-Control','no-store');
    if (!['GET','HEAD'].includes(req.method) && !req.is('application/json')) return res.status(415).json({error:'Send JSON.'});
    const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => /^tnb_visit=[a-f0-9]{64}$/.test(x));
    req.visitId = cookie ? fingerprint(cookie.slice(10)) : null;
    next();
  });
  async function visit(req) {
    return req.visitId ? visits.findOne({ _id:req.visitId, expiresAt:{ $gt:new Date() } }) : null;
  }
  async function current(req) {
    const doc = await visit(req);
    return doc || await season();
  }
  async function change(req, roleList, operation) {
    for (let n=0; n<5; n++) {
      const doc = await visit(req);
      if (!doc?.role) throw problem(401,'Please sign in.');
      if (!roleList.includes(doc.role)) throw problem(403,'This action is unavailable for this role.');
      const result = operation(doc);
      const saved = await visits.updateOne({ _id:doc._id, revision:doc.revision, role:doc.role, expiresAt:{ $gt:new Date() } },
        { $set:{ events:doc.events, bookings:doc.bookings }, $inc:{ revision:1 } });
      if (saved.modifiedCount) return result;
    }
    throw problem(409,'The data changed. Refresh and try again.');
  }
  app.get('/api/health',async (_req,res) => { await db.command({ping:1}); res.json({status:'ready'}); });
  app.get('/api/session', async (req,res) => res.json({account:publicAccount((await visit(req))?.role)}));
  app.post('/api/login',async (req,res) => {
    const { email,password } = req.body || {};
    const account = accounts.find(a => typeof email === 'string' && a.email === email.trim().toLowerCase() && a.password === password);
    if (!account) throw problem(401,'Check the demo email and password.');
    const previous = await visit(req);
    if (previous) {
      await visits.updateOne({_id:previous._id},{$set:{role:account.role,expiresAt:new Date(Date.now()+ttl)},$inc:{revision:1}});
    } else {
      const token = randomBytes(32).toString('hex');
      const { events,bookings } = await season();
      await visits.insertOne({ _id:fingerprint(token),role:account.role,events,bookings,revision:0,expiresAt:new Date(Date.now()+ttl) });
      const secure = process.env.NODE_ENV === 'production' && process.env.DEMO_COOKIE_SECURE !== 'false';
      res.cookie('tnb_visit',token,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:ttl});
    }
    res.json({account:publicAccount(account.role)});
  });
  app.post('/api/logout',async (req,res) => {
    if (req.visitId) await visits.updateOne({_id:req.visitId},{$set:{role:null},$inc:{revision:1}});
    res.json({account:null});
  });
  app.get('/api/events',async (req,res) => res.json(availableEvents(await current(req))));
  app.get('/api/dashboard',async (req,res) => {
    const doc = await visit(req);
    if (!doc?.role) throw problem(401,'Please sign in.');
    res.json(dashboard(doc,doc.role));
  });
  app.post('/api/reservations',async (req,res) => {
    const {eventId,quantity} = req.body || {};
    res.status(201).json(await change(req,['buyer'],d => reserve(d,d.role,eventId,quantity)));
  });
  app.get('/api/reservations/:id/ticket.pdf', async (req, res) => {
    const session = await visit(req);
    if (!session?.role) throw problem(401, 'Please sign in.');
    if (session.role !== 'buyer') throw problem(403, 'Sign in as the buyer to download a ticket.');
    const buyer = publicAccount('buyer');
    const booking = session.bookings.find(b => b.id === req.params.id && b.buyer === buyer.email);
    const event = booking && session.events.find(e => e.id === booking.eventId);
    if (!event) throw problem(404, 'Ticket not found in this wallet.');
    const pdf = await buildDemoTicketPdf(event, booking, buyer);
    res.attachment(booking.id + '.pdf').send(pdf);
  });
  app.post('/api/events',async (req,res) => res.status(201).json(await change(req,['organiser'],d => addEvent(d,d.role,req.body || {}))));
  app.patch('/api/events/:id',async (req,res) => res.json(await change(req,['organiser','admin'],d => editEvent(d,d.role,req.params.id,req.body || {}))));
  app.delete('/api/events/:id', async (req, res) => {
    res.json(await change(req, ['organiser','admin'], doc => deleteEvent(doc, doc.role, req.params.id)));
  });
  app.use('/api',(_req,res) => res.status(404).json({error:'Unknown API route.'}));
  const build = path.resolve(__dirname,'../../client/build');
  app.use(express.static(build));
  app.get('/{*route}',(_req,res) => res.sendFile(path.join(build,'index.html')));
  app.use((error,_req,res,_next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    res.status(status).json({error:status === 500 ? 'Service unavailable. Try again shortly.' : error.message});
  });
  return app;
}
async function main() {
  const uri = process.env.DEMO_MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const mongo = new MongoClient(uri,{serverSelectionTimeoutMS:6500});
  try {
    await mongo.connect();
    const db = mongo.db(dbName);
    const season = await initialise(db);
    if (process.argv.includes('--seed')) { console.log('Demo programme ready in ' + dbName); await mongo.close(); return; }
    const app = createApp(db,season);
    const server = app.listen(Number(process.env.PORT || 5000),()=>console.log('Ticket Nen BD ready on port ' + server.address().port));
    const close = () => server.close(async () => { await mongo.close(); });
    process.once('SIGTERM',close);
    process.once('SIGINT',close);
  } catch (error) {
    await mongo.close();
    console.error('Could not start the demo (' + (error.codeName || error.name) + '). Check that the demo MongoDB service is reachable and its user can write to ' + dbName + '.');
    process.exitCode=1;
  }
}
if (require.main === module) main();
module.exports = { dbName, createApp, initialise, main };
