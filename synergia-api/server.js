// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // parse JSON bodies

// In-memory storage
let events = [
  // sample event
  {
    id: 1,
    title: "Synergia Tech Talk",
    description: "A tech talk on fullstack development",
    date: "2025-12-10",
    capacity: 100,
    location: "Main Auditorium"
  }
];
let bookings = [
  // sample booking
  {
    id: 1,
    eventId: 1,
    name: "Alice Kumar",
    email: "alice@example.com",
    phone: "9876543210",
    seats: 1,
    createdAt: new Date().toISOString()
  }
];

// helper to get next id
const nextId = (arr) => (arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1);

/* -----------------------
   Events endpoints
   ----------------------- */

/**
 * GET /events
 * Get all events
 */
app.get('/events', (req, res) => {
  res.json(events);
});

/**
 * POST /events/add
 * Create a new event
 * Body: { title, description, date, capacity, location }
 */
app.post('/events/add', (req, res) => {
  const { title, description, date, capacity, location } = req.body;
  if (!title || !date || !capacity) {
    return res.status(400).json({ error: 'title, date and capacity are required' });
  }
  const event = {
    id: nextId(events),
    title,
    description: description || '',
    date,
    capacity: Number(capacity),
    location: location || ''
  };
  events.push(event);
  res.status(201).json(event);
});

/**
 * GET /event/:id
 * Get event by ID
 */
app.get('/event/:id', (req, res) => {
  const id = Number(req.params.id);
  const ev = events.find(e => e.id === id);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  res.json(ev);
});

/**
 * PUT /event/:id
 * Update event details
 * Body may contain any event fields to update
 */
app.put('/event/:id', (req, res) => {
  const id = Number(req.params.id);
  const evIndex = events.findIndex(e => e.id === id);
  if (evIndex === -1) return res.status(404).json({ error: 'Event not found' });

  const update = req.body;
  // Basic allowed updates
  const allowed = ['title','description','date','capacity','location'];
  allowed.forEach(k => {
    if (update[k] !== undefined) {
      events[evIndex][k] = k === 'capacity' ? Number(update[k]) : update[k];
    }
  });
  res.json(events[evIndex]);
});

/**
 * DELETE /event/:id
 * Cancel an event (remove from array)
 * Also optionally removes bookings for that event
 */
app.delete('/event/:id', (req, res) => {
  const id = Number(req.params.id);
  const evIndex = events.findIndex(e => e.id === id);
  if (evIndex === -1) return res.status(404).json({ error: 'Event not found' });

  // remove event
  const [deletedEvent] = events.splice(evIndex, 1);

  // remove associated bookings
  bookings = bookings.filter(b => b.eventId !== id);
  res.json({ message: 'Event cancelled', event: deletedEvent });
});

/* -----------------------
   Bookings endpoints (under /api/bookings)
   ----------------------- */

/**
 * GET /api/bookings
 * Get all bookings
 */
app.get('/api/bookings', (req, res) => {
  res.json(bookings);
});

/**
 * POST /api/bookings
 * Create a new booking
 * Body: { eventId, name, email, phone, seats }
 */
app.post('/api/bookings', (req, res) => {
  const { eventId, name, email, phone, seats } = req.body;
  if (!eventId || !name || !email || !seats) {
    return res.status(400).json({ error: 'eventId, name, email and seats are required' });
  }

  const ev = events.find(e => e.id === Number(eventId));
  if (!ev) return res.status(404).json({ error: 'Event not found' });

  
  const seatsRequested = Number(seats);
  const seatsBooked = bookings
    .filter(b => b.eventId === Number(eventId))
    .reduce((s, b) => s + Number(b.seats), 0);
  if (seatsBooked + seatsRequested > ev.capacity) {
    return res.status(400).json({ error: 'Not enough seats available' });
  }
  const booking = {
    id: nextId(bookings),
    eventId: Number(eventId),
    name,
    email,
    phone: phone || '',
    seats: seatsRequested,
    createdAt: new Date().toISOString()
  };
  bookings.push(booking);
  res.status(201).json(booking);
});
app.get('/api/bookings/:id', (req, res) => {
  const id = Number(req.params.id);
  const b = bookings.find(x => x.id === id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  res.json(b);
});


app.put('/api/bookings/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });

  const update = req.body;
  if (update.seats !== undefined) {
    const ev = events.find(e => e.id === bookings[idx].eventId);
    if (!ev) return res.status(500).json({ error: 'Associated event missing' });
    const currentSeats = bookings[idx].seats;
    const newSeats = Number(update.seats);

    const seatsOther = bookings
      .filter(b => b.eventId === bookings[idx].eventId && b.id !== id)
      .reduce((s, b) => s + Number(b.seats), 0);

    if (seatsOther + newSeats > ev.capacity) {
      return res.status(400).json({ error: 'Not enough seats available for this update' });
    }
    bookings[idx].seats = newSeats;
  }

  // update other fields
  ['name','email','phone'].forEach(k => {
    if (update[k] !== undefined) bookings[idx][k] = update[k];
  });

  res.json(bookings[idx]);
});

/**
 * DELETE /api/bookings/:id
 * Cancel a booking
 */
app.delete('/api/bookings/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });
  const [deleted] = bookings.splice(idx, 1);
  res.json({ message: 'Booking cancelled', booking: deleted });
});

/* -----------------------
   Start server
   ----------------------- */
app.listen(PORT, () => {
  console.log(`Synergia API running on http://localhost:${PORT}`);
});