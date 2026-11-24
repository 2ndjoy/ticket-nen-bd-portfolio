const {test} = require('node:test');
const assert = require('node:assert/strict');
const {send,testApp} = require('./test-fixture');
const {accounts} = require('./catalogue');

test('only the booking owner can download the PDF with its reservation filename', async () => {
  const app = testApp();
  const ticket = '/api/reservations/TNB-SAMPLE-1/ticket.pdf';
  assert.equal((await send(app,'GET',ticket)).code,401);
  const {cookie} = await send(app,'POST','/api/login',accounts[0]);
  const pdf = await send(app,'GET',ticket,undefined,cookie);
  assert.equal(pdf.code,200);
  assert.match(pdf.headers,/content-disposition: attachment; filename="TNB-SAMPLE-1.pdf"/i);
  assert.equal(pdf.body.subarray(0,5).toString(),'%PDF-');
  assert.match(pdf.body.toString('latin1'),/\/Subtype \/Image/);
  assert.equal((await send(app,'GET','/api/reservations/TNB-SAMPLE-2/ticket.pdf',undefined,cookie)).code,404);
  const booked = await send(app,'POST','/api/reservations',{eventId:'sylhet-photo',quantity:1},cookie);
  const other = await send(app,'POST','/api/login',accounts[0]);
  assert.equal((await send(app,'GET','/api/reservations/'+booked.body.id+'/ticket.pdf',undefined,other.cookie)).code,404);
  for (const role of [accounts[1],accounts[2]]) {
    await send(app,'POST','/api/login',role,cookie);
    assert.equal((await send(app,'GET',ticket,undefined,cookie)).code,403);
  }
});

test('deletions enforce ownership, stop reservations and preserve cancelled tickets', async () => {
  const app = testApp();
  const {cookie} = await send(app,'POST','/api/login',accounts[0]);
  const other = await send(app,'POST','/api/login',accounts[0]);
  const owned = '/api/events/dhaka-acoustic';
  const outside = '/api/events/chattogram-food';
  assert.equal((await send(app,'DELETE',owned,{},cookie)).code,403);
  await send(app,'POST','/api/login',accounts[1],cookie);
  assert.equal((await send(app,'DELETE',outside,{},cookie)).code,403);
  assert.equal((await send(app,'DELETE',owned,{},cookie)).code,200);
  assert.equal((await send(app,'DELETE',owned,{},cookie)).code,404);
  await send(app,'POST','/api/login',accounts[2],cookie);
  assert.equal((await send(app,'PATCH',owned,{status:'Published'},cookie)).code,404);
  assert.equal((await send(app,'DELETE',outside,{},cookie)).code,200);
  assert.equal((await send(app,'GET','/api/dashboard',undefined,cookie)).body.events.length,4);
  assert.equal((await send(app,'GET','/api/events',undefined,cookie)).body.length,4);
  assert.equal((await send(app,'GET','/api/events',undefined,other.cookie)).body.length,6);
  await send(app,'POST','/api/login',accounts[0],cookie);
  assert.equal((await send(app,'POST','/api/reservations',{eventId:'dhaka-acoustic',quantity:1},cookie)).code,409);
  const wallet = (await send(app,'GET','/api/dashboard',undefined,cookie)).body;
  assert.equal(wallet.events[0].status,'Deleted');
  assert.equal(wallet.tickets,0);
  assert.equal(wallet.bookings[0].id,'TNB-SAMPLE-1');
  assert.equal((await send(app,'GET','/api/reservations/TNB-SAMPLE-1/ticket.pdf',undefined,cookie)).code,200);
});

test('a new draft becomes publicly visible to its visitor after admin approval', async () => {
  const app = testApp();
  const login = (account,cookie) => send(app,'POST','/api/login',account,cookie);
  const {cookie} = await login(accounts[1]);
  const localStart = new Date(Date.now()+86400000*7).toISOString().slice(0,16);
  const draft = await send(app,'POST','/api/events',{title:'Community print fair',location:'Sylhet',localStart,capacity:25,price:200},cookie);
  assert.equal(draft.code,201);
  const id = draft.body.id;
  assert.ok(!(await send(app,'GET','/api/events',undefined,cookie)).body.some(e => e.id === id));
  await login(accounts[2],cookie);
  assert.equal((await send(app,'PATCH','/api/events/'+id,{status:'Published'},cookie)).code,200);
  await login(accounts[0],cookie);
  assert.equal((await send(app,'POST','/api/reservations',{eventId:id,quantity:2},cookie)).code,201);
  assert.ok((await send(app,'GET','/api/dashboard',undefined,cookie)).body.bookings.some(b => b.eventId === id && b.quantity === 2));
});
test('each README login reaches the right dashboard; visitors cannot read a dashboard',async()=>{
  const app=testApp();
  assert.equal((await send(app,'GET','/api/dashboard')).code,401);
  assert.equal((await send(app,'POST','/api/login',{email:accounts[2].email,password:'wrong'})).code,401);
  for(const {email,password,role} of accounts){
    const login=await send(app,'POST','/api/login',{email,password});
    assert.equal(login.body.account.role,role);
    assert.equal((await send(app,'GET','/api/dashboard',undefined,login.cookie)).code,200);
  }
});
test('role changes retain the visitor’s edits and different browsers remain isolated',async()=>{
  const app=testApp();
  const sign=(a,c)=>send(app,'POST','/api/login',{email:a.email,password:a.password},c);
  const first=(await sign(accounts[0])).cookie;
  const other=(await sign(accounts[0])).cookie;
  const id='sylhet-photo';
  const path='/api/events/'+id;
  assert.equal((await send(app,'PATCH',path,{status:'Draft'},first)).code,403);
  const outcomes=await Promise.all([1,2].map(()=>send(app,'POST','/api/reservations',{eventId:id,quantity:1},first)));
  assert.deepEqual(outcomes.map(r=>r.code).sort(),[201,409]);
  assert.equal((await send(app,'GET','/api/dashboard',undefined,other)).body.bookings.length,1);
  await sign(accounts[1],first);
  assert.equal((await send(app,'PATCH','/api/events/chattogram-food',{title:'New title',capacity:70},first)).code,403);
  assert.equal((await send(app,'PATCH',path,{title:'Sylhet photo walk',capacity:80},first)).code,200);
  await sign(accounts[2],first);
  assert.equal((await send(app,'PATCH',path,{status:'Draft'},first)).code,200);
  assert.ok(!(await send(app,'GET','/api/events',undefined,first)).body.some(e=>e.id===id));
  assert.ok((await send(app,'GET','/api/events',undefined,other)).body.some(e=>e.id===id));
  await send(app,'POST','/api/logout',{},first);
  assert.equal((await send(app,'GET','/api/dashboard',undefined,first)).code,401);
});
