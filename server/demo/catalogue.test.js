const test = require('node:test');
const assert = require('node:assert/strict');
const {makeSeason,availableEvents,dashboard,reserve,editEvent,accounts} = require('./catalogue');
const now = new Date('2026-11-24T10:00:00Z');

test('six future events and linked bookings are shared by the three dashboards',()=>{
  const db=makeSeason(now);
  assert.equal(availableEvents(db,now).length,6);
  const buyer=dashboard(db,'buyer'), org=dashboard(db,'organiser'), admin=dashboard(db,'admin');
  assert.equal(buyer.bookings.length,1);
  assert.equal(org.events.length,3);
  assert.equal(admin.events.length,6);
  assert.equal(admin.tickets,22);
  assert.equal(admin.value,db.bookings.reduce((n,b)=>n+b.quantity*b.unitPrice,0));
});
test('a reservation keeps one reference and updates wallet, stock and revenue',()=>{
  const db=makeSeason(now), event=db.events[1];
  const before=dashboard(db,'admin');
  const booked=reserve(db,'buyer',event.id,2,now);
  assert.equal(dashboard(db,'buyer').bookings.at(-1).id,booked.id);
  assert.equal(dashboard(db,'admin').value,before.value+2*event.price);
  assert.equal(availableEvents(db,now)[1].remaining,event.capacity-4);
  assert.throws(()=>reserve(db,'buyer',event.id,1,now),/already/);
});
test('roles, ownership, capacity and visibility are enforced in the service',()=>{
  const db=makeSeason(now);
  assert.throws(()=>editEvent(db,'buyer',db.events[0].id,{}),/cannot/);
  assert.throws(()=>editEvent(db,'organiser',db.events[2].id,{}),/another/);
  assert.throws(()=>reserve(db,'admin',db.events[0].id,1,now),/buyer/);
  assert.throws(()=>editEvent(db,'organiser',db.events[0].id,{title:'Test',capacity:1}),/Capacity/);
  editEvent(db,'admin',db.events[1].id,{status:'Draft'});
  assert.ok(!availableEvents(db,now).some(e=>e.id===db.events[1].id));
  assert.throws(()=>reserve(db,'buyer',db.events[1].id,1,now),/closed/);
});
test('past events, fractional quantities and sold-out seats cannot be reserved',()=>{
  const db=makeSeason(now), event=db.events[1];
  assert.throws(()=>reserve(db,'buyer',event.id,1.5,now),/one and six/);
  assert.throws(()=>reserve(db,'buyer',event.id,1,new Date('2030-01-01')),/closed/);
  event.capacity=2;
  assert.throws(()=>reserve(db,'buyer',event.id,1,now),/too few/);
  assert.equal(db.bookings.filter(b=>b.buyer===accounts[0].email).length,1);
});
