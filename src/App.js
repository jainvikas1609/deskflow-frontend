import React, { useState, useEffect, useCallback } from 'react';
import api from './services/api';

const STATUS_BG = {
  New:'#E6F1FB', Open:'#F1EFE8', Assigned:'#E1F5EE', 'In Progress':'#EEEDFE',
  Pending:'#FAEEDA', 'On Hold':'#F1EFE8', Resolved:'#EAF3DE',
  Closed:'#F1EFE8', Escalated:'#FCEBEB'
};
const PRI_BG  = { Low:'#F1EFE8', Medium:'#FAEEDA', High:'#FCEBEB', Urgent:'#F7C1C1' };
const PRI_TXT = { Low:'#5F5E5A', Medium:'#854F0B', High:'#A32D2D', Urgent:'#501313' };

const css = {
  app:   { fontFamily:'system-ui,sans-serif', fontSize:14, color:'#1a1a1a', height:'100vh', display:'flex', flexDirection:'column' },
  hdr:   { height:52, background:'#fff', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0 },
  logo:  { fontWeight:600, fontSize:15, letterSpacing:'-.3px' },
  body:  { display:'flex', flex:1, overflow:'hidden' },
  nav:   { width:196, background:'#fff', borderRight:'1px solid #eee', padding:10, display:'flex', flexDirection:'column', gap:2, flexShrink:0 },
  main:  { flex:1, overflow:'auto', padding:20, background:'#f8f8f6' },
  ni:    (a) => ({ padding:'7px 10px', borderRadius:8, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:8,
           color: a?'#111':'#666', fontWeight: a?500:400, background: a?'#f0f0ee':'transparent' }),
  card:  { background:'#fff', border:'1px solid #eee', borderRadius:12, padding:16, marginBottom:16 },
  title: { fontSize:18, fontWeight:500, marginBottom:16 },
  mc:    { background:'#f5f5f3', borderRadius:8, padding:14 },
  grid3: { display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12, marginBottom:20 },
  grid2: { display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12 },
  btn:   { border:'1px solid #ddd', background:'#fff', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'inherit' },
  btnP:  { border:'none', background:'#111', color:'#fff', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'inherit' },
  inp:   { border:'1px solid #ddd', borderRadius:8, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box', fontFamily:'inherit' },
  sel:   { border:'1px solid #ddd', borderRadius:8, padding:'6px 10px', fontSize:13, cursor:'pointer', background:'#fff', fontFamily:'inherit' },
  th:    { textAlign:'left', padding:'6px 10px', color:'#999', fontWeight:400, borderBottom:'1px solid #eee', fontSize:12, whiteSpace:'nowrap' },
  td:    { padding:'9px 10px', borderBottom:'1px solid #f2f2f2', verticalAlign:'middle', fontSize:13 },
  over:  { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,.3)', zIndex:100, display:'flex', justifyContent:'flex-end' },
  pnl:   { width:520, height:'100%', background:'#fff', borderLeft:'1px solid #eee', overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14 },
  modal: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' },
  mbox:  { background:'#fff', border:'1px solid #ddd', borderRadius:12, padding:24, width:460, maxWidth:'92vw', display:'flex', flexDirection:'column', gap:14 },
  login: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f8f6' },
  lbox:  { background:'#fff', border:'1px solid #eee', borderRadius:16, padding:36, width:360, display:'flex', flexDirection:'column', gap:16 },
  badge: (bg,c) => ({ display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:500, background:bg, color:c }),
  fgrp:  { display:'flex', flexDirection:'column', gap:5 },
  lbl:   { fontSize:12, color:'#777' }
};

const StatusBadge = ({v}) => <span style={css.badge(STATUS_BG[v]||'#eee','#333')}>{v||'—'}</span>;
const PriBadge    = ({v}) => <span style={css.badge(PRI_BG[v]||'#eee', PRI_TXT[v]||'#333')}>{v||'—'}</span>;
const fmtDate     = d => d ? new Date(d).toLocaleDateString() : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString()     : '—';

// ── Login ─────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail]     = useState('admin@deskflow.com');
  const [password, setPassword] = useState('password');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch(err) {
      setError(err.response?.data?.error || 'Login failed — check your credentials');
    } finally { setLoading(false); }
  }

  return (
    <div style={css.login}>
      <div style={css.lbox}>
        <div style={{fontWeight:600,fontSize:22}}>DeskFlow</div>
        {error && <div style={{color:'#c0392b',fontSize:13,background:'#fdf0f0',padding:'8px 12px',borderRadius:8}}>{error}</div>}
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={css.fgrp}><label style={css.lbl}>Email</label>
            <input style={css.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus/></div>
          <div style={css.fgrp}><label style={css.lbl}>Password</label>
            <input style={css.inp} type="password" value={password} onChange={e=>setPassword(e.target.value)}/></div>
          <button style={css.btnP} disabled={loading}>{loading?'Signing in…':'Sign in'}</button>
        </form>
        <div style={{fontSize:12,color:'#aaa',textAlign:'center'}}>Default login: admin@deskflow.com / password</div>
      </div>
    </div>
  );
}

// ── Ticket Detail Side Panel ──────────────────────────────────────
function TicketDetail({ id, onClose, agents }) {
  const [ticket, setTicket] = useState(null);
  const [reply, setReply]   = useState('');
  const [rtype, setRtype]   = useState('public');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setTicket(data.data);
    } catch { onClose(); }
  }, [id, onClose]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(status) {
    await api.post(`/tickets/${id}/status`, { status });
    load();
  }
  async function reassign(agent_id) {
    await api.post(`/tickets/${id}/assign`, { agent_id });
    load();
  }
  async function sendReply() {
    if (!reply.trim()) return;
    await api.post(`/tickets/${id}/comments`, { content: reply, type: rtype });
    setReply(''); load();
  }

  return (
    <div style={css.over} onClick={onClose}>
      <div style={css.pnl} onClick={e=>e.stopPropagation()}>
        {!ticket ? <div style={{color:'#aaa',padding:20}}>Loading…</div> : <>
          <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>{ticket.ticket_number} · {ticket.channel}</div>
              <div style={{fontSize:16,fontWeight:500,lineHeight:1.4}}>{ticket.subject}</div>
            </div>
            <button style={css.btn} onClick={onClose}>✕</button>
          </div>

          <div style={css.grid2}>
            {[['Customer',ticket.customer_name||'—'],['Category',ticket.category||'—'],
              ['Created',fmtDate(ticket.created_at)],['Updated',fmtDate(ticket.updated_at)]].map(([l,v])=>(
              <div key={l} style={{background:'#f8f8f6',borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'#aaa',marginBottom:3}}>{l}</div>
                <div style={{fontSize:13,fontWeight:500}}>{v}</div>
              </div>
            ))}
            <div style={{background:'#f8f8f6',borderRadius:8,padding:'10px 12px'}}>
              <div style={{fontSize:11,color:'#aaa',marginBottom:5}}>Status</div>
              <select style={{...css.sel,padding:'3px 6px',fontSize:12}} value={ticket.status} onChange={e=>changeStatus(e.target.value)}>
                {['New','Open','Assigned','In Progress','Pending','On Hold','Resolved','Closed','Escalated'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{background:'#f8f8f6',borderRadius:8,padding:'10px 12px'}}>
              <div style={{fontSize:11,color:'#aaa',marginBottom:5}}>Agent</div>
              <select style={{...css.sel,padding:'3px 6px',fontSize:12}} value={ticket.agent_id||''} onChange={e=>reassign(e.target.value)}>
                <option value=''>Unassigned</option>
                {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {ticket.description && (
            <div style={{fontSize:13,color:'#555',background:'#f8f8f6',padding:'10px 12px',borderRadius:8,lineHeight:1.6}}>{ticket.description}</div>
          )}

          <div style={{fontWeight:500,fontSize:13}}>Conversation thread</div>
          {(ticket.thread||[]).length === 0 && <div style={{fontSize:13,color:'#aaa'}}>No messages yet.</div>}
          {(ticket.thread||[]).map(m=>(
            <div key={m.id} style={{padding:'10px 12px',borderRadius:8,fontSize:13,lineHeight:1.6,
              background:m.type==='internal'?'#FAEEDA':'#f5f5f5',
              borderLeft:m.type==='internal'?'3px solid #EF9F27':'none'}}>
              <div style={{display:'flex',gap:8,marginBottom:5,alignItems:'center'}}>
                <span style={{fontWeight:500,fontSize:12}}>{m.author_name||'System'}</span>
                {m.type==='internal'&&<span style={{fontSize:10,background:'#EF9F27',color:'#fff',padding:'1px 6px',borderRadius:10}}>Internal note</span>}
                <span style={{fontSize:11,color:'#bbb',marginLeft:'auto'}}>{fmtDateTime(m.created_at)}</span>
              </div>
              {m.content}
            </div>
          ))}

          <div style={{border:'1px solid #eee',borderRadius:10,overflow:'hidden'}}>
            <div style={{display:'flex',borderBottom:'1px solid #eee'}}>
              {['public','internal'].map(t=>(
                <div key={t} onClick={()=>setRtype(t)} style={{padding:'8px 14px',fontSize:12,cursor:'pointer',
                  color:rtype===t?'#111':'#999',borderBottom:rtype===t?'2px solid #111':'2px solid transparent'}}>
                  {t==='public'?'Public reply':'Internal note'}
                </div>
              ))}
            </div>
            <textarea value={reply} onChange={e=>setReply(e.target.value)}
              placeholder={rtype==='internal'?'Write an internal note…':'Write a reply to the customer…'}
              style={{width:'100%',border:'none',padding:'10px 12px',fontSize:13,resize:'vertical',minHeight:80,
                outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
            <div style={{display:'flex',justifyContent:'flex-end',padding:'6px 10px',borderTop:'1px solid #eee'}}>
              <button style={css.btnP} onClick={sendReply}>Send</button>
            </div>
          </div>

          <div style={{fontWeight:500,fontSize:13}}>Audit trail</div>
          {(ticket.history||[]).map(h=>(
            <div key={h.id} style={{display:'flex',gap:8,fontSize:12,color:'#777',alignItems:'flex-start'}}>
              <div style={{width:6,height:6,borderRadius:3,background:'#ccc',marginTop:5,flexShrink:0}}/>
              <span style={{color:'#bbb',minWidth:130,flexShrink:0}}>{fmtDateTime(h.changed_at)}</span>
              <span>{h.actor_name||'System'} — {h.field_changed}: {h.old_value||'—'} → {h.new_value}</span>
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

// ── Create Ticket Modal ───────────────────────────────────────────
function CreateModal({ onClose, onCreated, agents }) {
  const [f, setF] = useState({ subject:'', description:'', priority:'Medium', category:'Technical', channel:'Web form', agent_id:'' });
  const set = k => e => setF(prev=>({...prev,[k]:e.target.value}));
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!f.subject.trim()) return;
    setSaving(true);
    try { await api.post('/tickets', f); onCreated(); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div style={css.modal} onClick={onClose}>
      <div style={css.mbox} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:500}}>New ticket</div>
        <div style={css.fgrp}><label style={css.lbl}>Subject *</label>
          <input style={css.inp} value={f.subject} onChange={set('subject')} placeholder="Brief description of the issue" autoFocus/></div>
        <div style={css.grid2}>
          <div style={css.fgrp}><label style={css.lbl}>Priority</label>
            <select style={css.sel} value={f.priority} onChange={set('priority')}>
              {['Low','Medium','High','Urgent'].map(p=><option key={p}>{p}</option>)}
            </select></div>
          <div style={css.fgrp}><label style={css.lbl}>Category</label>
            <select style={css.sel} value={f.category} onChange={set('category')}>
              {['Technical','Billing','Access','General'].map(c=><option key={c}>{c}</option>)}
            </select></div>
        </div>
        <div style={css.fgrp}><label style={css.lbl}>Assign to (optional)</label>
          <select style={css.sel} value={f.agent_id} onChange={set('agent_id')}>
            <option value=''>Unassigned</option>
            {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select></div>
        <div style={css.fgrp}><label style={css.lbl}>Description</label>
          <textarea style={{...css.inp,minHeight:90,resize:'vertical'}} value={f.description} onChange={set('description')} placeholder="Full details of the issue…"/></div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button style={css.btn} onClick={onClose}>Cancel</button>
          <button style={css.btnP} onClick={submit} disabled={saving}>{saving?'Creating…':'Create ticket'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App Shell ────────────────────────────────────────────────
export default function App() {
  const [user, setUser]       = useState(null);
  const [page, setPage]       = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents]   = useState([]);
  const [detail, setDetail]   = useState(null);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({ status:'', priority:'', q:'' });

  // Restore session from localStorage
  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (tok) {
      try {
        const payload = JSON.parse(atob(tok.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) setUser(payload);
        else localStorage.removeItem('token');
      } catch { localStorage.removeItem('token'); }
    }
  }, []);

  const loadTickets = useCallback(async () => {
    const params = {};
    if (filters.status)   params.status   = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.q)        params.q        = filters.q;
    try {
      const { data } = await api.get('/tickets', { params });
      setTickets(data.data || []);
    } catch {}
  }, [filters]);

  const loadAgents = useCallback(async () => {
    try {
      const { data } = await api.get('/users/agents');
      setAgents(data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (user) { loadTickets(); loadAgents(); }
  }, [user, loadTickets, loadAgents]);

  function signOut() {
    localStorage.removeItem('token');
    setUser(null); setTickets([]); setAgents([]);
  }

  if (!user) return <Login onLogin={u => setUser(u)} />;

  const open     = tickets.filter(t => !['Resolved','Closed'].includes(t.status)).length;
  const urgent   = tickets.filter(t => t.priority==='Urgent' && !['Resolved','Closed'].includes(t.status)).length;
  const resolved = tickets.filter(t => t.status==='Resolved').length;

  const NavItem = ({ id, label }) => (
    <div style={css.ni(page===id)} onClick={()=>setPage(id)}>{label}</div>
  );

  const TicketTable = ({ rows }) => (
    <div style={{...css.card,padding:0,overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>
          <th style={{...css.th,paddingLeft:16}}>ID</th>
          <th style={css.th}>Subject</th>
          <th style={css.th}>Priority</th>
          <th style={css.th}>Status</th>
          <th style={css.th}>Agent</th>
          <th style={css.th}>Updated</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} style={{...css.td,textAlign:'center',color:'#aaa',padding:28}}>No tickets found</td></tr>
          )}
          {rows.map(t=>(
            <tr key={t.id} onClick={()=>setDetail(t.id)}
                style={{cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background='#fafaf8'}
                onMouseLeave={e=>e.currentTarget.style.background=''}>
              <td style={{...css.td,paddingLeft:16,color:'#aaa',fontSize:12}}>{t.ticket_number}</td>
              <td style={{...css.td,maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject}</td>
              <td style={css.td}><PriBadge v={t.priority}/></td>
              <td style={css.td}><StatusBadge v={t.status}/></td>
              <td style={{...css.td,fontSize:12}}>{t.agent_name||'—'}</td>
              <td style={{...css.td,fontSize:12,color:'#bbb'}}>{fmtDate(t.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={css.app}>
      {/* Header */}
      <div style={css.hdr}>
        <div style={css.logo}>DeskFlow</div>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <button style={css.btnP} onClick={()=>setCreating(true)}>+ New ticket</button>
          <span style={{fontSize:13,color:'#888'}}>{user.name}</span>
          <button style={css.btn} onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div style={css.body}>
        {/* Sidebar */}
        <nav style={css.nav}>
          <NavItem id="dashboard" label="Dashboard"/>
          <NavItem id="tickets"   label={`All tickets (${tickets.length})`}/>
          <NavItem id="mine"      label="My tickets"/>
        </nav>

        {/* Main content */}
        <main style={css.main}>

          {/* Dashboard */}
          {page==='dashboard' && <>
            <div style={css.title}>Dashboard</div>
            <div style={css.grid3}>
              <div style={{...css.mc,cursor:'pointer'}} onClick={()=>setPage('tickets')}>
                <div style={{fontSize:12,color:'#888',marginBottom:4}}>Open tickets</div>
                <div style={{fontSize:24,fontWeight:500}}>{open}</div>
              </div>
              <div style={css.mc}>
                <div style={{fontSize:12,color:'#888',marginBottom:4}}>Urgent</div>
                <div style={{fontSize:24,fontWeight:500,color:'#c0392b'}}>{urgent}</div>
              </div>
              <div style={css.mc}>
                <div style={{fontSize:12,color:'#888',marginBottom:4}}>Resolved</div>
                <div style={{fontSize:24,fontWeight:500,color:'#27500A'}}>{resolved}</div>
              </div>
            </div>
            <div style={css.card}>
              <div style={{fontWeight:500,marginBottom:12}}>Recent tickets</div>
              <TicketTable rows={tickets.slice(0,8)}/>
            </div>
          </>}

          {/* All tickets */}
          {page==='tickets' && <>
            <div style={css.title}>All tickets</div>
            <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
              <input style={{...css.sel,width:180}} placeholder="Search by subject…"
                value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))}/>
              <select style={css.sel} value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
                <option value=''>All statuses</option>
                {['New','Open','Assigned','In Progress','Pending','On Hold','Resolved','Closed','Escalated'].map(s=><option key={s}>{s}</option>)}
              </select>
              <select style={css.sel} value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}>
                <option value=''>All priorities</option>
                {['Low','Medium','High','Urgent'].map(p=><option key={p}>{p}</option>)}
              </select>
              <button style={css.btn} onClick={()=>setFilters({status:'',priority:'',q:''})}>Clear</button>
            </div>
            <TicketTable rows={tickets}/>
          </>}

          {/* My tickets */}
          {page==='mine' && <>
            <div style={css.title}>My tickets</div>
            <TicketTable rows={tickets.filter(t=>t.agent_id===user.id)}/>
          </>}

        </main>
      </div>

      {detail   && <TicketDetail id={detail} agents={agents} onClose={()=>{setDetail(null);loadTickets();}}/>}
      {creating && <CreateModal agents={agents} onClose={()=>setCreating(false)} onCreated={()=>{loadTickets();}}/>}
    </div>
  );
}
