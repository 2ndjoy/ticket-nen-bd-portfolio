import React,{useCallback,useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, Ticket, ArrowUpRight, Users, Wallet, Pencil, X, Download, Trash2 } from 'lucide-react';
import { request,amount,dateLabel,downloadTicket } from './api';

function Metrics({items}) {
  return <div className="metrics">{items.map(([label,value,Icon])=><div className="metric" key={label}><Icon size={18}/><span>{label}</span><strong>{value}</strong></div>)}</div>;
}
function Buyer({data}) {
  const [open,setOpen]=useState(null);
  const [downloading,setDownloading]=useState(null);
  const [error,setError]=useState('');
  async function download(id) {
    setDownloading(id);
    setError('');
    try { await downloadTicket(id); }
    catch (err) { setError(err.message); }
    finally { setDownloading(null); }
  }
  const ordered=[...data.bookings].sort((a,b)=>b.bookedAt.localeCompare(a.bookedAt));
  return <><Metrics items={ [['All reservations',ordered.length,CalendarDays],['Active tickets',data.tickets,Ticket],['Active reservation value',amount(data.value),Wallet]] }/>
    <div className="section-heading"><h2>My bookings</h2><Link to="/events">Browse events ↗</Link></div>
    {ordered.map(b=>{
      const e=data.events.find(event=>event.id===b.eventId);
      if (!e) return null;
      return <article className="ticket-row" key={b.id}><div className={'stub '+e.theme}><Ticket size={28}/></div>
        {e.status==='Deleted' && <strong className="cancelled-event">Event cancelled</strong>}
        <div className="row-main"><small>{dateLabel(e.startsAt)} · {e.location}</small><h3>{e.title}</h3><p>{b.quantity} × {amount(b.unitPrice)} · Demo reservation</p></div>
        <button className="secondary" aria-expanded={open===b.id} onClick={()=>setOpen(open===b.id?null:b.id)}>{open===b.id?'Close ticket':'View QR ticket'}</button>
        <button className="secondary" disabled={downloading!==null} onClick={()=>download(b.id)}>
          <Download size={16}/>{downloading===b.id?'Downloading…':'Download PDF'}
        </button>
        {open===b.id && <div className="qr"><QRCodeSVG value={b.id} size={118} title="Demo ticket reference"/><div><h3>Reservation reference</h3><code>{b.id}</code><p>This sample ticket does not grant venue entry.</p></div></div>}
      </article>;
    })}
    {error && <p role="alert">{error}</p>}
    {!ordered.length && <p>No reservations yet. Choose an event to reserve a demo ticket.</p>}</>;
}
function EventManager({data,role,reload}) {
  const [edit,setEdit]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const admin=role==='admin';
  const [creating,setCreating]=useState(false);
  async function remove(event) {
    const confirmed = window.confirm('Delete “' + event.title + '”? This removes it from the programme. Existing tickets will show “Event cancelled”.');
    if (!confirmed) return;
    setBusy(true);
    setMessage('');
    try {
      await request('/events/' + encodeURIComponent(event.id), 'DELETE', {});
      if (edit?.id === event.id) setEdit(null);
      await reload();
      setMessage(event.title + ' was deleted.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function create(e) {
    e.preventDefault(); const form=new FormData(e.currentTarget);
    setBusy(true);setMessage('');
    try {
      await request('/events','POST',{title:form.get('title'),location:form.get('location'),localStart:form.get('localStart'),capacity:Number(form.get('capacity')),price:Number(form.get('price'))});
      setCreating(false);await reload();setMessage('Draft created. Switch to the admin role in this browser to publish it.');
    }catch(err){setMessage(err.message);}finally{setBusy(false);}
  }
  async function save(event) {
    event.preventDefault(); setBusy(true);setMessage('');
    try{
      await request('/events/'+edit.id,'PATCH',admin?{status:edit.status}:{title:edit.title,capacity:Number(edit.capacity)});
      setEdit(null); await reload();setMessage('Event updated.');
    }catch(error){setMessage(error.message);}finally{setBusy(false);}
  }
  return <><Metrics items={[[admin?'Events in programme':'My events',data.events.length,CalendarDays],['Tickets reserved',data.tickets,Users],['Reservation value',amount(data.value),Wallet]]}/>
    <div className="section-heading"><h2>{admin?'Event management':'My events'}</h2>{!admin&&<button className="secondary" onClick={()=>{setCreating(!creating);setEdit(null);}}>{creating?'Close form':'Add event'}</button>}</div>
    {creating&&<form className="edit-panel" onSubmit={create}><h3>New event</h3><label>Event title<input name="title" required maxLength="80"/></label><label>City<input name="location" required maxLength="80"/></label><label>Start in Bangladesh time<input type="datetime-local" name="localStart" required/></label><label>Capacity<input type="number" name="capacity" min="1" max="10000" required/></label><label>Ticket price (BDT)<input type="number" name="price" min="0" max="100000" required/></label><button className="primary" disabled={busy}>Save draft</button></form>}
    <div className="table-wrap"><table><thead><tr><th>Event</th><th>{admin?'Organiser':'Reserved / capacity'}</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {data.events.map(e => <tr key={e.id}>
        <td><strong>{e.title}</strong><small>{dateLabel(e.startsAt)} · {e.location}</small></td>
        <td>{admin ? e.host : e.sold + ' / ' + e.capacity}</td>
        <td><span className={'status ' + (e.status === 'Draft' ? 'draft' : '')}>{e.status}</span></td>
        <td><div className="event-actions">
          <button className="text-button" disabled={busy} onClick={()=>{setEdit({...e});setCreating(false);setMessage('');}}>
            <Pencil size={14}/> Edit<span className="sr-only"> {e.title}</span>
          </button>
          <button className="text-button remove-event" disabled={busy} onClick={()=>remove(e)}>
            <Trash2 size={14}/> Delete<span className="sr-only"> {e.title}</span>
          </button>
        </div></td>
      </tr>)}
    </tbody></table></div>
    {edit && <form className="edit-panel" onSubmit={save}><div className="section-heading"><h3>Edit {edit.title}</h3><button type="button" aria-label="Close editor" onClick={()=>setEdit(null)}><X size={18}/></button></div>
      {admin?<label>Visibility<select value={edit.status} onChange={event=>setEdit({...edit,status:event.target.value})}><option>Published</option><option>Draft</option></select></label>:
      <><label>Event title<input required maxLength="80" value={edit.title} onChange={event=>setEdit({...edit,title:event.target.value})}/></label><label>Capacity<input type="number" required min={Math.max(1,edit.sold)} max="10000" value={edit.capacity} onChange={event=>setEdit({...edit,capacity:event.target.value})}/></label></>}
      <button className="primary" disabled={busy}>Save changes</button></form>}
    <p role="status">{message}</p></>;
}

export default function Dashboards({account}) {
  const [data,setData]=useState(null),[error,setError]=useState('');
  const reload=useCallback(async()=>{setData(await request('/dashboard'));},[]);
  useEffect(()=>{let active=true;request('/dashboard').then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[account.role]);
  const titles={buyer:'Ticket wallet',organiser:'Organiser studio',admin:'Admin overview'};
  return <main className="page"><header className={'desk '+account.role}><div><p>{account.name} · {account.role==='organiser'?'Bengal Sessions':account.role}</p><h1>{titles[account.role]}</h1></div><Link to="/events">Event programme <ArrowUpRight size={16}/></Link></header>
    {error?<p role="alert">{error}</p>:!data?<p>Loading dashboard…</p>:account.role==='buyer'?<Buyer data={data}/>:<EventManager data={data} role={account.role} reload={reload}/>}
    <p className="note">Changes in this demo belong to this browser session.</p></main>;
}
