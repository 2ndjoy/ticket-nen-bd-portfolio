import React,{useCallback,useEffect,useState} from 'react';
import { Routes, Route, Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, MapPin, Search, Ticket } from 'lucide-react';
import Dashboards from './Dashboards';
import { request,dateLabel,amount } from './api';
import logo from '../images/AppLogo2.png';
import ticketArt from '../images/7.png';
import './portal.css';

const roles = [
  ['Buyer','buyer@demo.ticketnen.example','BrowseTickets27!'],
  ['Organiser','organiser@demo.ticketnen.example','HostEvents27!'],
  ['Admin','admin@demo.ticketnen.example','ReviewEvents27!']
];
function Login({onLogin}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const nav=useNavigate(),loc=useLocation();
  async function submit(e) {
    e.preventDefault(); setBusy(true);setError('');
    try {
      const {account}=await request('/login','POST',{email,password}); onLogin(account);
      nav(account.role==='buyer' && loc.state?.eventId?'/events/'+encodeURIComponent(loc.state.eventId):'/dashboard',{replace:true});
    } catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <main className="page login-grid"><section className="login-intro"><Ticket size={36}/><h1>Choose your seat.</h1><p>Explore the demo as a ticket buyer, event organiser or administrator. Choose a role to fill in its login details.</p>
    <div className="role-buttons">{roles.map(([name,mail,pass])=><button type="button" className={email===mail?'selected':''} key={mail} onClick={()=>{setEmail(mail);setPassword(pass);setError('');}}>{name}<ArrowUpRight size={16}/></button>)}</div></section>
    <form className="login-form" onSubmit={submit}><h2>Demo sign-in</h2><label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
    <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
    {error&&<p role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></main>;
}
function useProgramme(version) {
  const [state,setState]=useState({events:[],loading:true});
  useEffect(()=>{let active=true; setState({events:[],loading:true});request('/events').then(events=>{if(active)setState({events,loading:false});}).catch(e=>{if(active)setState({events:[],loading:false,error:e.message});});return()=>{active=false;};},[version]);
  return state;
}
function Programme({version,home=false}) {
  const {events,loading,error}=useProgramme(version);
  const [search,setSearch]=useState(''),[cat,setCat]=useState('All events');
  const visible=events.filter(e=>(cat==='All events'||e.category===cat)&&[e.title,e.location,e.host].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <main className="page"><>{home && <section className="home-cover"><div><small>Bangladesh · Portfolio demo</small><h1>Find your next ticket.</h1><p>Explore sample concerts, workshops and festivals from Dhaka to Sylhet.</p></div><img src={ticketArt} alt="" /></section>}</><div className="programme-title">{home?<h2>Event programme</h2>:<h1>Event programme</h1>}<label className="search"><Search size={18}/><input aria-label="Search events or cities" placeholder="Search events or cities" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
    <div className="filters">{['All events',...new Set(events.map(e=>e.category))].map(c=><button key={c} aria-pressed={cat===c} onClick={()=>setCat(c)}>{c}</button>)}</div>
    {error?<p role="alert">{error}</p>:loading?<p>Loading events…</p>:!visible.length?<p>No events match this search.</p>:
      <div className="event-grid">{visible.map(e=><Link key={e.id} className="event-card" to={'/events/'+e.id}><img alt="" src={e.image}/><div><small>{dateLabel(e.startsAt)} · {e.location}</small><h2>{e.title}</h2><p>{e.host}</p><strong>{amount(e.price)} <ArrowUpRight size={16}/></strong></div></Link>)}</div>}
  </main>;
}
function EventPage({version,account,refresh}) {
  const {id}=useParams(),nav=useNavigate();
  const {events,loading,error}=useProgramme(version);
  const [qty,setQty]=useState(1),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false);
  const event=events.find(e=>e.id===id);
  async function book(e) {
    e.preventDefault(); if(!account){nav('/login',{state:{eventId:id}});return;}
    setBusy(true);setFeedback('');
    try { await request('/reservations','POST',{eventId:id,quantity:Number(qty)});refresh();nav('/my-bookings'); }
    catch(err){setFeedback(err.message);}finally{setBusy(false);}
  }
  if (loading || error || !event) return <main className="page"><p>{loading?'Loading event…':error||'This event is no longer available.'}</p><Link to="/events">All events</Link></main>;
  return <main className="page"><Link className="back" to="/events">← Event programme</Link><article className="detail"><img src={event.image} alt=""/><div><small>{event.category} · {event.host}</small><h1>{event.title}</h1><p>{event.description}</p>
    <p className="meta"><CalendarDays size={17}/>{dateLabel(event.startsAt)} · {event.time} Bangladesh time</p><p className="meta"><MapPin size={17}/>{event.location}</p>
    <form onSubmit={book} className="reserve"><div><strong>{amount(event.price)}</strong><small>{event.remaining} available</small></div><label>Tickets<input type="number" min="1" max={Math.min(6,event.remaining)} step="1" value={qty} onChange={e=>setQty(e.target.value)} required/></label>
    <button className="primary" disabled={busy||event.remaining<1||Boolean(account&&account.role!=='buyer')}>{event.remaining<1?'Sold out':account&&account.role!=='buyer'?'Buyer login required':account?'Reserve demo ticket':'Sign in to reserve'}</button></form>
    {feedback&&<p role="alert">{feedback} <Link to="/my-bookings">Open wallet</Link></p>}<p className="note">Fictional event. No payment is collected.</p></div></article></main>;
}
export default function Portal() {
  const [account,setAccount]=useState(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[version,setVersion]=useState(0);
  const nav=useNavigate(); const refresh=useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>{request('/session').then(d=>setAccount(d.account)).catch(e=>setError(e.message)).finally(()=>setReady(true));},[]);
  async function logout() {try{await request('/logout','POST',{});setAccount(null);refresh();nav('/login');}catch(e){setError(e.message);}}
  const signedIn=a=>{setAccount(a);setError('');refresh();};
  const desk=!ready?<main className="page">Loading session…</main>:account?<Dashboards key={account.role} account={account}/>:<Navigate to="/login" replace/>;
  return <div className="tnb"><nav className="site-nav"><Link className="brand" to="/"><img src={logo} alt="Ticket Nen BD"/></Link><div><Link to="/events">Events</Link><Link to="/dashboard">Dashboard</Link>{account?<button onClick={logout}>Sign out</button>:<Link className="primary" to="/login">Demo sign-in</Link>}</div></nav>
   {error&&<div className="page" role="alert">{error}</div>}
   <Routes><Route path="/" element={<Programme version={version} home/>}/><Route path="/home" element={<Navigate to="/" replace/>}/><Route path="/events" element={<Programme version={version}/>}/><Route path="/events/:id" element={<EventPage account={account} version={version} refresh={refresh}/>}/><Route path="/payment/:id" element={<EventPage account={account} version={version} refresh={refresh}/>}/>
   <Route path="/login" element={<Login onLogin={signedIn}/>}/><Route path="/loginOrg" element={<Navigate to="/login" replace/>}/><Route path="/register" element={<Navigate to="/login" replace/>}/>
   {['/dashboard','/my-profile','/my-bookings','/organizer/*','/admin/*'].map(url=><Route key={url} path={url} element={desk}/>)}
   <Route path="/aboutus" element={<main className="page"><h1>About Ticket Nen BD</h1><p>I built Ticket Nen BD as a computer science capstone. This edition lets you follow an event through three roles, from an organiser’s first draft to a buyer’s QR ticket.</p><p>The React interface and Express API share a MongoDB catalogue of fictional events in Bangladesh.</p><Link to="/login">Try a demo role</Link></main>}/>
   <Route path="/terms" element={<main className="page"><h1>Using the demo</h1><p>The catalogue is fictional. Reservations and QR codes are samples. Changes belong to your browser session and expire after about a day.</p><Link to="/events">Browse events</Link></main>}/>
   <Route path="*" element={<main className="page"><h1>Page unavailable</h1><Link to="/events">Explore events</Link></main>}/></Routes>
   <footer className="site-foot"><strong>Ticket Nen BD</strong><Link to="/aboutus">About the project</Link><Link to="/events">Programme</Link></footer></div>;
}
