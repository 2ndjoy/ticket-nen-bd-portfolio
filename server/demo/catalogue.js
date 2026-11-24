const { randomUUID } = require('node:crypto');

const accounts = [
  { role: 'buyer', name: 'Nila Rahman', email: 'buyer@demo.ticketnen.example', password: 'BrowseTickets27!' },
  { role: 'organiser', name: 'Arif Hasan', email: 'organiser@demo.ticketnen.example', password: 'HostEvents27!' },
  { role: 'admin', name: 'Maya Karim', email: 'admin@demo.ticketnen.example', password: 'ReviewEvents27!' },
];

const programme = [
  ['dhaka-acoustic', 'Dhaka After Hours', 'Concert', 'Dhaka North', 'An unplugged evening of Bengali folk and acoustic sessions.', '18:30', 450, 120, 'Bengal Sessions', 'music', 14],
  ['sylhet-photo', 'Frames of Sylhet', 'Workshop', 'Sylhet', 'A guided street-photography walk followed by a print critique.', '07:00', 300, 24, 'Bengal Sessions', 'photo', 22],
  ['chattogram-food', 'Chattogram Food Stories', 'Festival', 'Chattogram', 'Explore coastal cooking through tastings and short talks.', '12:00', 350, 90, 'Coastal Collective', 'food', 31],
  ['dhaka-cloud', 'Dhaka Cloud Studio', 'Meetup', 'Dhaka South', 'An afternoon of cloud deployment demos from local developers.', '15:00', 150, 60, 'Bengal Sessions', 'tech', 40],
  ['rajshahi-print', 'Rajshahi Printmakers', 'Workshop', 'Rajshahi', 'Design and hand-print a two-colour festival poster.', '10:00', 550, 32, 'Padma Arts', 'art', 48],
  ['khulna-jazz', 'Riverside Jazz Social', 'Concert', 'Khulna', 'A small-ensemble jazz programme beside the Rupsha River.', '17:30', 400, 80, 'Coastal Collective', 'jazz', 56],
];
const organiserName = 'Bengal Sessions';

function makeSeason(now = new Date()) {
  const events = programme.map(([id,title,category,location,description,time,price,capacity,host,theme,offset]) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + offset);
    const startsAt = new Date(date.toISOString().slice(0,10) + 'T' + time + ':00+06:00').toISOString();
    return { id, title, category, location, description, time, startsAt, price, capacity, host, theme, image:'/programme/'+theme+'.jpg', status: 'Published' };
  });
  const bookings = events.map((event, i) => ({
    id: 'TNB-SAMPLE-' + (i+1), eventId: event.id, buyer: i === 0 ? accounts[0].email : 'guest-' + i,
    quantity: i === 0 ? 2 : i+1, unitPrice: event.price, bookedAt: now.toISOString(),
  }));
  return { events, bookings };
}
function inventory(event, bookings) {
  return bookings.filter(b => b.eventId === event.id).reduce((n,b) => n+b.quantity, 0);
}
function availableEvents(state, now = new Date()) {
  return state.events.filter(e => e.status === 'Published' && Date.parse(e.startsAt) > +now)
    .map(e => ({ ...e, remaining: e.capacity - inventory(e,state.bookings) }));
}
function problem(status, message) {
  return Object.assign(new Error(message), { status });
}
function reserve(state, role, id, quantity, now = new Date()) {
  if (role !== 'buyer') throw problem(403,'Sign in as the demo buyer to reserve tickets.');
  const event = availableEvents(state,now).find(e => e.id === id);
  if (!event) throw problem(409,'Reservations are closed for this event.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 6) throw problem(400,'Choose between one and six tickets.');
  const buyer = accounts[0].email;
  if (state.bookings.some(b => b.buyer === buyer && b.eventId === id)) throw problem(409,'You already have a ticket for this event.');
  if (quantity > event.remaining) throw problem(409,'There are too few tickets left.');
  const booking = { id: 'TNB-' + randomUUID(), eventId: id, buyer, quantity, unitPrice: event.price, bookedAt: now.toISOString() };
  state.bookings.push(booking);
  return booking;
}
function managedEvent(state, role, id) {
  if (!['organiser','admin'].includes(role)) throw problem(403,'This account cannot manage events.');
  const event = state.events.find(e => e.id === id && e.status !== 'Deleted');
  if (!event) throw problem(404,'Event not found.');
  if (role === 'organiser' && event.host !== organiserName) throw problem(403,'This event belongs to another organiser.');
  return event;
}
function deleteEvent(state, role, id) {
  const event = managedEvent(state, role, id);
  if (state.bookings.some(booking => booking.eventId === id)) {
    event.status = 'Deleted';
  } else {
    state.events = state.events.filter(item => item.id !== id);
  }
  return { id };
}
function editEvent(state, role, id, change) {
  const event = managedEvent(state, role, id);
  if (role === 'organiser') {
    if (typeof change.title !== 'string' || !change.title.trim() || change.title.trim().length > 80) throw problem(400,'Enter an event title of up to 80 characters.');
    if (!Number.isInteger(change.capacity) || change.capacity < Math.max(1,inventory(event,state.bookings)) || change.capacity > 10000) throw problem(400,'Capacity must cover the reserved tickets and stay under 10,001.');
    event.title = change.title.trim();
    event.capacity = change.capacity;
  } else {
    if (!['Published','Draft'].includes(change.status)) throw problem(400,'Choose Published or Draft.');
    event.status = change.status;
  }
  return event;
}
function addEvent(state, role, input, now = new Date()) {
  if (role !== 'organiser') throw problem(403, 'Only the organiser can create an event.');
  if (state.events.length >= 30) throw problem(409, 'This demo session has reached its event limit.');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const location = typeof input.location === 'string' ? input.location.trim() : '';
  const dateTime = typeof input.localStart === 'string' ? input.localStart : '';
  const starts = Date.parse(dateTime + ':00+06:00');
  if (!title || title.length > 80 || !location || location.length > 80) throw problem(400, 'Enter a title and city, each up to 80 characters.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTime) || !Number.isFinite(starts) || starts <= +now) throw problem(400, 'Select a future date and time in Bangladesh.');
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 10000 || !Number.isInteger(input.price) || input.price < 0 || input.price > 100000) throw problem(400, 'Check the ticket price and capacity.');
  const event = { id: randomUUID(), title, location, host:organiserName, startsAt:new Date(starts).toISOString(), time:dateTime.slice(-5),
    description:'A community event hosted by Bengal Sessions.', category:'Meetup', image:'/programme/tech.jpg',theme:'tech',status:'Draft',price:input.price,capacity:input.capacity };
  state.events.push(event);
  return event;
}
function dashboard(state, role) {
  const events = state.events.filter(e =>
    (role === 'buyer' || e.status !== 'Deleted') && (role !== 'organiser' || e.host === organiserName));
  const ids = new Set(events.map(e => e.id));
  const bookings = state.bookings.filter(b => ids.has(b.eventId) && (role !== 'buyer' || b.buyer === accounts[0].email));
  const rows = events.map(e => {
    const sold = inventory(e, state.bookings);
    return {...e, sold, remaining:e.capacity-sold};
  });
  const activeIds = new Set(events.filter(e => e.status !== 'Deleted').map(e => e.id));
  const activeBookings = bookings.filter(b => activeIds.has(b.eventId));
  return {
    events: role === 'buyer' ? rows.filter(e=>bookings.some(b=>b.eventId===e.id)) : rows, bookings: bookings.map(({buyer,...booking}) => booking),
    tickets: activeBookings.reduce((n,b) => n+b.quantity,0),
    value: activeBookings.reduce((n,b) => n+b.quantity*b.unitPrice,0),
  };
}
module.exports = { accounts, makeSeason, availableEvents, reserve, editEvent, addEvent, deleteEvent, dashboard, problem };
