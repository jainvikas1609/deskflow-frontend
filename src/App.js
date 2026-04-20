import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from './services/api';

// ── Brand & Config ────────────────────────────────────────────────
const B = {
  navy:'#0F4761', teal:'#156082', orange:'#EA8B00',
  bg:'#f4f6f9', white:'#fff', border:'#e2e8f0',
  dark:'#1a2332', mid:'#4a5568', light:'#718096', lighter:'#a0aec0'
};
const STATUS_CFG = {
  New:{bg:'#EBF8FF',c:'#1a6b8a',dot:'#3182CE'},
  Open:{bg:'#EDF2F7',c:'#4A5568',dot:'#718096'},
  Assigned:{bg:'#E6FFFA',c:'#1D6B5E',dot:'#38B2AC'},
  'In Progress':{bg:'#FAF5FF',c:'#553C9A',dot:'#805AD5'},
  Pending:{bg:'#FFFAF0',c:'#7B4E00',dot:'#D69E2E'},
  'On Hold':{bg:'#F7FAFC',c:'#4A5568',dot:'#A0AEC0'},
  Resolved:{bg:'#F0FFF4',c:'#276749',dot:'#48BB78'},
  Closed:{bg:'#F7FAFC',c:'#718096',dot:'#CBD5E0'},
  Escalated:{bg:'#FFF5F5',c:'#9B2335',dot:'#FC8181'},
};
const PRI_CFG = {
  Low:{bg:'#F7FAFC',c:'#4A5568',bd:'#CBD5E0'},
  Medium:{bg:'#FFFAF0',c:'#7B4E00',bd:'#F6E05E'},
  High:{bg:'#FFF5F5',c:'#9B2335',bd:'#FEB2B2'},
  Urgent:{bg:'#E53E3E',c:'#fff',bd:'#C53030'},
};
const ROLES = ['admin','supervisor','agent','customer'];
const STATUSES = ['New','Open','Assigned','In Progress','Pending','On Hold','Resolved','Closed','Escalated'];
const PRIORITIES = ['Low','Medium','High','Urgent'];
const CHANNELS = ['Web Portal','Email','API','Phone','Chat'];
const DEFAULT_CATS = ['Network Outage','EKAM Platform','Billing & Accounts','Hardware & Equipment','SLA Breach','Access & Authentication','Configuration','Performance Issue','General Enquiry'];

// ── Utilities ─────────────────────────────────────────────────────
const fmtDT = d => d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
const fmtD  = d => d ? new Date(d).toLocaleDateString('en-GB') : '—';
const ago = d => {
  if (!d) return '—';
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if (m<1) return 'just now';
  if (m<60) return `${m}m ago`;
  if (m<1440) return `${Math.floor(m/60)}h ago`;
  return `${Math.floor(m/1440)}d ago`;
};
const slaColor = pct => pct>=90 ? '#E53E3E' : pct>=70 ? '#D69E2E' : '#38A169';

// ── Base UI Components ────────────────────────────────────────────
const StatusBadge = ({v}) => {
  const c=STATUS_CFG[v]||STATUS_CFG.Open;
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:c.bg,color:c.c}}>
    <span style={{width:6,height:6,borderRadius:'50%',background:c.dot,flexShrink:0}}/>{v||'—'}
  </span>;
};
const PriBadge = ({v}) => {
  const c=PRI_CFG[v]||PRI_CFG.Medium;
  return <span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:c.bg,color:c.c,border:`1px solid ${c.bd}`}}>{v||'—'}</span>;
};
const Avatar = ({name,size=30}) => {
  const initials = name?name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2):'?';
  const cols=[B.navy,B.teal,B.orange,'#553C9A','#276749','#9B2335'];
  return <div style={{width:size,height:size,borderRadius:'50%',background:cols[(name?.charCodeAt(0)||0)%cols.length],
    display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:size*.35,fontWeight:700,flexShrink:0}}>{initials}</div>;
};
const Inp = ({style,...p}) => <input style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'8px 12px',fontSize:13,fontFamily:'inherit',background:B.white,width:'100%',boxSizing:'border-box',outline:'none',...style}} {...p}/>;
const Sel = ({style,...p}) => <select style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'7px 10px',fontSize:13,fontFamily:'inherit',background:B.white,cursor:'pointer',...style}} {...p}/>;
const Btn = ({variant='secondary',style,...p}) => <button style={{
  border:variant==='primary'?'none':`1px solid ${B.border}`,
  background:variant==='primary'?B.navy:variant==='danger'?'#FFF5F5':B.white,
  color:variant==='primary'?'#fff':variant==='danger'?'#9B2335':B.mid,
  padding:'8px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:variant==='primary'?600:400,fontFamily:'inherit',...style}} {...p}/>;
const Card = ({style,...p}) => <div style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:10,padding:16,...style}} {...p}/>;
const Modal = ({onClose,title,children,width=480}) => (
  <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(15,71,97,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
    <div style={{background:B.white,borderRadius:14,padding:28,width,maxWidth:'95vw',boxShadow:'0 20px 60px rgba(0,0,0,.25)',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
        <div style={{width:4,height:22,background:B.orange,borderRadius:2,marginRight:12}}/>
        <div style={{fontSize:15,fontWeight:700,color:B.navy,flex:1}}>{title}</div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:B.light}}>×</button>
      </div>
      {children}
    </div>
  </div>
);
const FG = ({label,children}) => <div style={{display:'flex',flexDirection:'column',gap:5}}>
  <label style={{fontSize:12,fontWeight:600,color:B.mid}}>{label}</label>
  {children}
</div>;
const MetricCard = ({label,value,color,sub,onClick}) => (
  <div onClick={onClick} style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:10,padding:'16px 18px',cursor:onClick?'pointer':'default',borderTop:`3px solid ${color||B.navy}`}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.1)';}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';}}>
    <div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:'.5px'}}>{label}</div>
    <div style={{fontSize:26,fontWeight:700,color:color||B.dark}}>{value??'—'}</div>
    {sub&&<div style={{fontSize:11,color:B.light,marginTop:3}}>{sub}</div>}
  </div>
);

// ── Bar Chart ─────────────────────────────────────────────────────
const BarChart = ({data,color,height=80}) => {
  const max=Math.max(...(data||[]).map(d=>Number(d.count||d.v||0)),1);
  return <div style={{display:'flex',alignItems:'flex-end',gap:6,height,padding:'4px 0 0'}}>
    {(data||[]).map((d,i)=>{
      const v=Number(d.count||d.v||0);
      return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
        <div style={{fontSize:10,color:B.light}}>{v||''}</div>
        <div style={{width:'100%',height:Math.max((v/max)*(height-20),3),background:color||B.navy,borderRadius:'3px 3px 0 0',opacity:.85}}/>
        <div style={{fontSize:10,color:B.light,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%',textAlign:'center'}}>{d.label||d.l||d.status||d.priority||d.category||''}</div>
      </div>;
    })}
  </div>;
};

// ── SLA Bar ───────────────────────────────────────────────────────
const SLABar = ({pct}) => {
  const p=Math.min(Number(pct)||0,100);
  const col=slaColor(p);
  return <div style={{display:'flex',alignItems:'center',gap:6}}>
    <div style={{width:60,height:5,background:'#EDF2F7',borderRadius:3,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${p}%`,background:col,borderRadius:3}}/>
    </div>
    <span style={{fontSize:11,color:col,fontWeight:600}}>{Math.round(p)}%</span>
  </div>;
};

// ── Login ─────────────────────────────────────────────────────────
function Login({onLogin}) {
  const [e,setE]=useState('admin@ekiva.co.uk');
  const [p,setP]=useState('password');
  const [err,setErr]=useState('');
  const [load,setLoad]=useState(false);
  async function submit(ev) {
    ev.preventDefault(); setLoad(true); setErr('');
    try {
      const {data}=await api.post('/auth/login',{email:e,password:p});
      localStorage.setItem('token',data.token); onLogin(data.user);
    } catch(er){setErr(er.response?.data?.error||'Login failed');} finally{setLoad(false);}
  }
  return (
    <div style={{minHeight:'100vh',background:`linear-gradient(135deg,${B.navy} 0%,${B.teal} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:B.white,borderRadius:16,padding:40,width:380,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:28,fontWeight:800,color:B.navy}}>Ekiva<span style={{color:B.orange}}>Care</span></div>
          <div style={{fontSize:13,color:B.light,marginTop:4}}>Support Management Platform</div>
        </div>
        {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9B2335',marginBottom:16}}>{err}</div>}
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
          <FG label="Email address"><Inp type="email" value={e} onChange={ev=>setE(ev.target.value)} autoFocus/></FG>
          <FG label="Password"><Inp type="password" value={p} onChange={ev=>setP(ev.target.value)}/></FG>
          <Btn variant="primary" style={{padding:12,fontSize:14}}>{load?'Signing in…':'Sign in →'}</Btn>
        </form>
        <div style={{marginTop:20,background:B.bg,borderRadius:8,padding:'10px 14px',fontSize:12,color:B.light,textAlign:'center'}}>
          admin@ekiva.co.uk / password
        </div>
      </div>
    </div>
  );
}

// ── Ticket Detail Panel ───────────────────────────────────────────
function TicketDetail({id,onClose,agents,categories,customers}) {
  const [ticket,setTicket]=useState(null);
  const [reply,setReply]=useState('');
  const [rtype,setRtype]=useState('public');
  const [sending,setSending]=useState(false);
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState({});

  const load=useCallback(async()=>{
    try{const{data}=await api.get(`/tickets/${id}`);setTicket(data.data);setEditForm(data.data);}
    catch{onClose();}
  },[id,onClose]);
  useEffect(()=>{load();},[load]);

  async function changeStatus(status){await api.post(`/tickets/${id}/status`,{status});load();}
  async function reassign(agent_id){await api.post(`/tickets/${id}/assign`,{agent_id});load();}
  async function saveEdit(){
    await api.put(`/tickets/${id}`,{priority:editForm.priority,category:editForm.category,customer_org_id:editForm.customer_org_id});
    setEditing(false); load();
  }
  async function sendReply(){
    if(!reply.trim())return; setSending(true);
    try{await api.post(`/tickets/${id}/comments`,{content:reply,type:rtype});setReply('');load();}
    finally{setSending(false);}
  }

  const ss={border:`1px solid ${B.border}`,borderRadius:6,padding:'5px 8px',fontSize:12,background:B.white,fontFamily:'inherit',cursor:'pointer'};

  return (
    <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(15,71,97,.4)',zIndex:100,display:'flex',justifyContent:'flex-end'}} onClick={onClose}>
      <div style={{width:580,height:'100%',background:B.white,overflowY:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{background:B.navy,padding:'16px 20px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginBottom:4}}>{ticket?.ticket_number} · {ticket?.channel}</div>
              <div style={{fontSize:15,fontWeight:600,color:'#fff',lineHeight:1.4}}>{ticket?.subject||'Loading…'}</div>
            </div>
            <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
          {ticket&&<div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            <StatusBadge v={ticket.status}/><PriBadge v={ticket.priority}/>
            {ticket.category&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:11,background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.9)'}}>{ticket.category}</span>}
          </div>}
        </div>

        {!ticket
          ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:B.light}}>Loading…</div>
          : <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>

            {/* Meta */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[['Customer',ticket.customer_name||'—'],['Organisation',ticket.customer_org||'—'],
                ['Created',fmtDT(ticket.created_at)],['Updated',ago(ticket.updated_at)]].map(([l,v])=>(
                <div key={l} style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}>
                  <div style={{fontSize:11,color:B.light,marginBottom:3,fontWeight:500}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600,color:B.dark}}>{v}</div>
                </div>
              ))}
              <div style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}>
                <div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500}}>Status</div>
                <select style={ss} value={ticket.status} onChange={e=>changeStatus(e.target.value)}>
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}>
                <div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500}}>Agent</div>
                <select style={ss} value={ticket.agent_id||''} onChange={e=>reassign(e.target.value)}>
                  <option value=''>Unassigned</option>
                  {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            {/* SLA */}
            {ticket.resolution_mins&&(()=>{
              const pct=Math.min((Number(ticket.age_mins||0)/ticket.resolution_mins)*100,100);
              const remaining=Math.max(ticket.resolution_mins-Number(ticket.age_mins||0),0);
              const remH=Math.floor(remaining/60); const remM=Math.round(remaining%60);
              return <div style={{background:B.bg,borderRadius:8,padding:'10px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:600,color:B.mid}}>SLA Resolution</span>
                  <span style={{fontSize:12,color:slaColor(pct),fontWeight:600}}>
                    {pct>=100?'BREACHED':`${remH}h ${remM}m remaining`}
                  </span>
                </div>
                <div style={{height:6,background:'#EDF2F7',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:slaColor(pct),borderRadius:3,transition:'width .3s'}}/>
                </div>
              </div>;
            })()}

            {/* Edit fields */}
            {editing ? (
              <div style={{background:B.bg,borderRadius:8,padding:14,display:'flex',flexDirection:'column',gap:10}}>
                <FG label="Priority"><Sel value={editForm.priority} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))}>
                  {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                </Sel></FG>
                <FG label="Category"><Sel value={editForm.category||''} onChange={e=>setEditForm(f=>({...f,category:e.target.value}))}>
                  {categories.map(c=><option key={c}>{c}</option>)}
                </Sel></FG>
                <FG label="Customer organisation"><Sel value={editForm.customer_org_id||''} onChange={e=>setEditForm(f=>({...f,customer_org_id:e.target.value}))}>
                  <option value=''>None</option>
                  {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </Sel></FG>
                <div style={{display:'flex',gap:8}}>
                  <Btn variant="primary" onClick={saveEdit} style={{flex:1}}>Save changes</Btn>
                  <Btn onClick={()=>setEditing(false)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <button onClick={()=>setEditing(true)} style={{background:'none',border:`1px dashed ${B.border}`,borderRadius:8,padding:'8px',fontSize:12,color:B.light,cursor:'pointer'}}>
                Edit priority / category / customer →
              </button>
            )}

            {ticket.description&&<div style={{background:B.bg,borderRadius:8,padding:'12px 14px',fontSize:13,color:B.mid,lineHeight:1.7,borderLeft:`3px solid ${B.teal}`}}>{ticket.description}</div>}

            {/* Thread */}
            <div style={{fontSize:13,fontWeight:700,color:B.navy}}>Conversation ({(ticket.thread||[]).length})</div>
            {(ticket.thread||[]).length===0&&<div style={{fontSize:13,color:B.light,textAlign:'center',padding:16}}>No messages yet</div>}
            {(ticket.thread||[]).map(m=>(
              <div key={m.id} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <Avatar name={m.author_name||'System'} size={32}/>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:600,color:B.dark}}>{m.author_name||'System'}</span>
                    {m.type==='internal'&&<span style={{fontSize:10,background:B.orange,color:'#fff',padding:'1px 7px',borderRadius:10,fontWeight:600}}>Internal</span>}
                    <span style={{fontSize:11,color:B.light,marginLeft:'auto'}}>{fmtDT(m.created_at)}</span>
                  </div>
                  <div style={{background:m.type==='internal'?'#FFFAF0':B.bg,border:`1px solid ${m.type==='internal'?'#F6E05E':B.border}`,borderRadius:8,padding:'10px 14px',fontSize:13,color:B.mid,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{m.content}</div>
                </div>
              </div>
            ))}

            {/* Reply box */}
            <div style={{border:`1px solid ${B.border}`,borderRadius:10,overflow:'hidden'}}>
              <div style={{display:'flex',background:B.bg,borderBottom:`1px solid ${B.border}`}}>
                {['public','internal'].map(t=>(
                  <div key={t} onClick={()=>setRtype(t)} style={{padding:'9px 16px',fontSize:12,fontWeight:600,cursor:'pointer',color:rtype===t?B.navy:B.light,borderBottom:rtype===t?`2px solid ${B.orange}`:'2px solid transparent',background:rtype===t?B.white:'transparent'}}>
                    {t==='public'?'Public Reply':'Internal Note'}
                  </div>
                ))}
              </div>
              <textarea value={reply} onChange={e=>setReply(e.target.value)}
                placeholder={rtype==='internal'?'Internal note — not visible to customer…':'Reply to customer…'}
                style={{width:'100%',border:'none',padding:'12px 14px',fontSize:13,resize:'vertical',minHeight:90,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
              <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 12px',borderTop:`1px solid ${B.border}`,background:B.bg}}>
                <Btn variant="primary" onClick={sendReply} disabled={sending||!reply.trim()} style={{opacity:reply.trim()?1:.5}}>
                  {sending?'Sending…':rtype==='internal'?'Add Note':'Send Reply'}
                </Btn>
              </div>
            </div>

            {/* Audit trail */}
            <div style={{fontSize:13,fontWeight:700,color:B.navy}}>Audit trail</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {(ticket.history||[]).map((h,i)=>(
                <div key={i} style={{display:'flex',gap:8,fontSize:12,alignItems:'flex-start'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:B.teal,marginTop:4,flexShrink:0}}/>
                  <span style={{color:B.light,minWidth:120,flexShrink:0}}>{fmtDT(h.changed_at)}</span>
                  <span style={{color:B.mid}}><strong>{h.actor_name||'System'}</strong> — {h.field_changed}: {h.old_value||'—'} → <strong>{h.new_value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        }
      </div>
    </div>
  );
}

// ── Create Ticket Modal ───────────────────────────────────────────
function CreateModal({onClose,onCreated,agents,categories,customers}) {
  const [f,setF]=useState({subject:'',description:'',priority:'Medium',category:categories[0]||'Network Outage',channel:'Web Portal',agent_id:'',customer_org_id:''});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState('');
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit() {
    if(!f.subject.trim()){setErr('Subject is required');return;}
    setSaving(true);
    try{await api.post('/tickets',f);onCreated();onClose();}
    catch(e){setErr(e.response?.data?.error||'Failed');}
    finally{setSaving(false);}
  }
  return (
    <Modal onClose={onClose} title="Raise New Ticket" width={520}>
      {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#9B2335',marginBottom:14}}>{err}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Subject *"><Inp value={f.subject} onChange={set('subject')} placeholder="Brief description of the issue" autoFocus/></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Priority"><Sel value={f.priority} onChange={set('priority')}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></FG>
          <FG label="Category"><Sel value={f.category} onChange={set('category')}>{categories.map(c=><option key={c}>{c}</option>)}</Sel></FG>
          <FG label="Channel"><Sel value={f.channel} onChange={set('channel')}>{CHANNELS.map(c=><option key={c}>{c}</option>)}</Sel></FG>
          <FG label="Customer"><Sel value={f.customer_org_id} onChange={set('customer_org_id')}>
            <option value=''>Select customer…</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel></FG>
        </div>
        <FG label="Assign to agent"><Sel value={f.agent_id} onChange={set('agent_id')} style={{width:'100%'}}>
          <option value=''>Unassigned</option>
          {agents.map(a=><option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
        </Sel></FG>
        <FG label="Description"><textarea value={f.description} onChange={set('description')} placeholder="Full details — site name, equipment, error messages…" style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',minHeight:90,resize:'vertical',width:'100%',boxSizing:'border-box',outline:'none'}}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Creating…':'Create Ticket'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── User Management Modal ─────────────────────────────────────────
function UserModal({user,onClose,onSaved}) {
  const isNew=!user?.id;
  const [f,setF]=useState({name:user?.name||'',email:user?.email||'',role:user?.role||'agent',password:'',active:user?.active!==false});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState('');
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit() {
    if(!f.name||!f.email){setErr('Name and email required');return;}
    if(isNew&&!f.password){setErr('Password required for new user');return;}
    setSaving(true);
    try {
      if(isNew) await api.post('/users',f);
      else await api.put(`/users/${user.id}`,f);
      onSaved();onClose();
    } catch(e){setErr(e.response?.data?.error||'Failed');}
    finally{setSaving(false);}
  }
  return (
    <Modal onClose={onClose} title={isNew?'Create User':'Edit User'} width={440}>
      {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#9B2335',marginBottom:14}}>{err}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Full name"><Inp value={f.name} onChange={set('name')} autoFocus/></FG>
        <FG label="Email address"><Inp type="email" value={f.email} onChange={set('email')}/></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Role"><Sel value={f.role} onChange={set('role')}>{ROLES.map(r=><option key={r}>{r}</option>)}</Sel></FG>
          <FG label="Status"><Sel value={f.active?'active':'inactive'} onChange={e=>setF(p=>({...p,active:e.target.value==='active'}))}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </Sel></FG>
        </div>
        <FG label={isNew?'Password *':'New password (leave blank to keep current)'}><Inp type="password" value={f.password} onChange={set('password')} placeholder={isNew?'Set password…':'Leave blank to keep current'}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Create User':'Save Changes'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Customer Modal ────────────────────────────────────────────────
function CustomerModal({customer,onClose,onSaved}) {
  const isNew=!customer?.id;
  const [f,setF]=useState({name:customer?.name||'',contact_email:customer?.contact_email||'',contact_phone:customer?.contact_phone||'',account_manager:customer?.account_manager||'',sla_tier:customer?.sla_tier||'Standard',address:customer?.address||''});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit() {
    setSaving(true);
    try{if(isNew)await api.post('/customers',f);else await api.put(`/customers/${customer.id}`,f);onSaved();onClose();}
    catch(e){alert(e.response?.data?.error||'Failed');}finally{setSaving(false);}
  }
  return (
    <Modal onClose={onClose} title={isNew?'Add Customer':'Edit Customer'} width={460}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Organisation name *"><Inp value={f.name} onChange={set('name')} autoFocus/></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Contact email"><Inp type="email" value={f.contact_email} onChange={set('contact_email')}/></FG>
          <FG label="Contact phone"><Inp value={f.contact_phone} onChange={set('contact_phone')}/></FG>
          <FG label="Account manager"><Inp value={f.account_manager} onChange={set('account_manager')}/></FG>
          <FG label="SLA tier"><Sel value={f.sla_tier} onChange={set('sla_tier')}>
            {['Standard','Premium','Internal','Custom'].map(t=><option key={t}>{t}</option>)}
          </Sel></FG>
        </div>
        <FG label="Address"><Inp value={f.address} onChange={set('address')}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Add Customer':'Save'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── KB Article Modal ──────────────────────────────────────────────
function KBModal({article,onClose,onSaved,categories}) {
  const isNew=!article?.id;
  const [f,setF]=useState({title:article?.title||'',content:article?.content||'',category:article?.category||categories[0]||'',published:article?.published||false});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit() {
    setSaving(true);
    try{if(isNew)await api.post('/kb',f);else await api.put(`/kb/${article.id}`,f);onSaved();onClose();}
    catch(e){alert(e.response?.data?.error||'Failed');}finally{setSaving(false);}
  }
  return (
    <Modal onClose={onClose} title={isNew?'New Article':'Edit Article'} width={600}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Title *"><Inp value={f.title} onChange={set('title')} autoFocus/></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Category"><Sel value={f.category} onChange={set('category')}>{categories.map(c=><option key={c}>{c}</option>)}</Sel></FG>
          <FG label="Status"><Sel value={f.published?'published':'draft'} onChange={e=>setF(p=>({...p,published:e.target.value==='published'}))}>
            <option value="draft">Draft</option><option value="published">Published</option>
          </Sel></FG>
        </div>
        <FG label="Content *"><textarea value={f.content} onChange={set('content')}
          style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'10px 12px',fontSize:13,fontFamily:'inherit',minHeight:180,resize:'vertical',width:'100%',boxSizing:'border-box',outline:'none'}}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Create Article':'Save'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Ticket Table ──────────────────────────────────────────────────
function TicketTable({rows,onOpen,loading}) {
  return (
    <Card style={{padding:0,overflow:'hidden'}}>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
          <thead>
            <tr style={{background:B.bg}}>
              {['Ticket','Subject','Customer','Category','Priority','Status','Agent','SLA','Updated'].map(h=>(
                <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading&&<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:B.light}}>Loading…</td></tr>}
            {!loading&&rows.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:B.light}}>No tickets found</td></tr>}
            {rows.map(t=>{
              const slaPct=t.resolution_mins?Math.min((Number(t.age_mins||0)/t.resolution_mins)*100,100):null;
              return (
                <tr key={t.id} onClick={()=>onOpen(t.id)} style={{cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'10px 14px',fontSize:12,color:B.teal,fontWeight:600,borderBottom:`1px solid ${B.border}`,whiteSpace:'nowrap'}}>{t.ticket_number}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{t.subject}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <Avatar name={t.customer_org||t.customer_name} size={22}/>
                      <span style={{fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.customer_org||t.customer_name||'—'}</span>
                    </div>
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.category||'—'}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><PriBadge v={t.priority}/></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><StatusBadge v={t.status}/></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                    {t.agent_name?<div style={{display:'flex',alignItems:'center',gap:6}}><Avatar name={t.agent_name} size={22}/><span style={{fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.agent_name}</span></div>
                      :<span style={{fontSize:12,color:B.lighter}}>Unassigned</span>}
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                    {slaPct!==null?<SLABar pct={slaPct}/>:<span style={{fontSize:12,color:B.lighter}}>—</span>}
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.light,whiteSpace:'nowrap'}}>{ago(t.updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);
  const [page,setPage]=useState('dashboard');
  const [tickets,setTickets]=useState([]);
  const [agents,setAgents]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [categories,setCategories]=useState(DEFAULT_CATS);
  const [slaData,setSlaData]=useState([]);
  const [reports,setReports]=useState({});
  const [kbArticles,setKbArticles]=useState([]);
  const [detail,setDetail]=useState(null);
  const [creating,setCreating]=useState(false);
  const [loading,setLoading]=useState(false);
  const [filters,setFilters]=useState({status:'',priority:'',category:'',customer_id:'',q:''});
  // Admin state
  const [allUsers,setAllUsers]=useState([]);
  const [editUser,setEditUser]=useState(null);
  const [editCustomer,setEditCustomer]=useState(null);
  const [editKB,setEditKB]=useState(null);
  const [slaConfig,setSlaConfig]=useState([]);
  const [kbSearch,setKbSearch]=useState('');
  const [helpTab,setHelpTab]=useState('guide');
  const [userModal,setUserModal]=useState(false);

  // Restore session
  useEffect(()=>{
    const tok=localStorage.getItem('token');
    if(tok){try{const p=JSON.parse(atob(tok.split('.')[1]));if(p.exp*1000>Date.now())setUser(p);else localStorage.removeItem('token');}catch{localStorage.removeItem('token');}}
  },[]);

  const loadTickets=useCallback(async()=>{
    setLoading(true);
    try{
      const params={};
      if(filters.status)      params.status=filters.status;
      if(filters.priority)    params.priority=filters.priority;
      if(filters.category)    params.category=filters.category;
      if(filters.customer_id) params.customer_id=filters.customer_id;
      if(filters.q)           params.q=filters.q;
      const{data}=await api.get('/tickets',{params});
      setTickets(data.data||[]);
    }catch{}finally{setLoading(false);}
  },[filters]);

  const loadAll=useCallback(async()=>{
    try{
      const[ag,cu,cats,sl]=await Promise.all([
        api.get('/users/agents'),api.get('/customers'),
        api.get('/admin/categories'),api.get('/sla')
      ]);
      setAgents(ag.data.data||[]);
      setCustomers(cu.data.data||[]);
      setCategories((cats.data.data||[]).map(c=>c.name)||DEFAULT_CATS);
      setSlaConfig(sl.data.data||[]);
    }catch{}
  },[]);

  const loadReports=useCallback(async()=>{
    try{
      const[sum,byS,byP,byC,byD,byA,byCu]=await Promise.all([
        api.get('/reports/summary'),api.get('/reports/by-status'),
        api.get('/reports/by-priority'),api.get('/reports/by-category'),
        api.get('/reports/by-day'),api.get('/reports/by-agent'),
        api.get('/reports/by-customer'),
      ]);
      setReports({
        summary:sum.data.data,byStatus:byS.data.data,byPriority:byP.data.data,
        byCategory:byC.data.data,byDay:byD.data.data,byAgent:byA.data.data,byCustomer:byCu.data.data
      });
    }catch{}
  },[]);

  const loadSLA=useCallback(async()=>{
    try{const{data}=await api.get('/sla/status');setSlaData(data.data||[]);}catch{}
  },[]);

  const loadKB=useCallback(async()=>{
    try{const{data}=await api.get('/kb',{params:kbSearch?{q:kbSearch}:{}});setKbArticles(data.data||[]);}catch{}
  },[kbSearch]);

  const loadUsers=useCallback(async()=>{
    try{const{data}=await api.get('/users');setAllUsers(data.data||[]);}catch{}
  },[]);

  useEffect(()=>{if(user){loadTickets();loadAll();}},[user,loadTickets,loadAll]);
  useEffect(()=>{if(user&&page==='reports')loadReports();},[user,page,loadReports]);
  useEffect(()=>{if(user&&page==='sla')loadSLA();},[user,page,loadSLA]);
  useEffect(()=>{if(user&&page==='kb')loadKB();},[user,page,loadKB,kbSearch]);
  useEffect(()=>{if(user&&(page==='users'||page==='admin'))loadUsers();},[user,page,loadUsers]);

  function signOut(){localStorage.removeItem('token');setUser(null);setTickets([]);}

  if(!user) return <Login onLogin={u=>setUser(u)}/>;

  // Derived
  const active=tickets.filter(t=>!['Resolved','Closed'].includes(t.status));
  const urgent=active.filter(t=>t.priority==='Urgent');
  const escalated=active.filter(t=>t.status==='Escalated');
  const unassigned=active.filter(t=>!t.agent_id);
  const resolved=tickets.filter(t=>t.status==='Resolved');
  const isAdmin=user.role==='admin';
  const isSuperOrAdmin=['admin','supervisor'].includes(user.role);

  const navItems=[
    {id:'dashboard',label:'Dashboard'},
    {id:'tickets',label:'All Tickets',count:active.length},
    {id:'mine',label:'My Tickets',count:active.filter(t=>t.agent_id===user.id).length},
    {id:'sla',label:'SLA Monitor',count:escalated.length,urgent:true},
    {id:'reports',label:'Reports'},
    {id:'kb',label:'Knowledge Base'},
    ...(isSuperOrAdmin?[{id:'customers',label:'Customers'}]:[]),
    ...(isAdmin?[{id:'users',label:'Users'},{id:'admin',label:'Admin'}]:[]),
    {id:'help',label:'Help'},
  ];

  const inpS={border:`1px solid ${B.border}`,borderRadius:8,padding:'7px 12px',fontSize:13,background:B.white,outline:'none',fontFamily:'inherit'};

  async function saveSLA(priority,resp,res){
    try{await api.put(`/sla/${priority}`,{first_response_mins:Number(resp),resolution_mins:Number(res)});
    loadAll();alert(`SLA for ${priority} updated`);}catch(e){alert(e.response?.data?.error||'Failed');}
  }

  return (
    <div style={{fontFamily:'system-ui,sans-serif',fontSize:14,color:B.dark,height:'100vh',display:'flex',flexDirection:'column',background:B.bg}}>

      {/* ── Nav ── */}
      <div style={{height:52,background:B.navy,display:'flex',alignItems:'center',padding:'0 16px',gap:8,flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,.2)',overflowX:'auto'}}>
        <div style={{fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-.5px',flexShrink:0,marginRight:8}}>
          Ekiva<span style={{color:B.orange}}>Care</span>
        </div>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{
            background:page===n.id?'rgba(255,255,255,.18)':'transparent',border:'none',
            color:page===n.id?'#fff':'rgba(255,255,255,.65)',padding:'5px 12px',borderRadius:8,
            cursor:'pointer',fontSize:12,fontWeight:page===n.id?600:400,
            display:'flex',alignItems:'center',gap:5,fontFamily:'inherit',flexShrink:0}}>
            {n.label}
            {!!n.count&&<span style={{background:n.urgent?B.orange:'rgba(255,255,255,.25)',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700}}>{n.count}</span>}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <button onClick={()=>setCreating(true)} style={{background:B.orange,color:'#fff',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ New Ticket</button>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Avatar name={user.name} size={28}/>
            <div style={{display:'none'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{user.name}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.5)',textTransform:'capitalize'}}>{user.role}</div>
            </div>
          </div>
          <button onClick={signOut} style={{background:'rgba(255,255,255,.1)',border:'none',color:'rgba(255,255,255,.7)',padding:'5px 10px',borderRadius:6,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>Sign out</button>
        </div>
      </div>

      <main style={{flex:1,overflow:'auto',padding:20}}>

        {/* ── DASHBOARD ── */}
        {page==='dashboard'&&<>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:B.navy}}>Operations Dashboard</div>
              <div style={{fontSize:12,color:B.light,marginTop:2}}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
            <Btn onClick={loadTickets}>↻ Refresh</Btn>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:12,marginBottom:20}}>
            <MetricCard label="Open" value={active.length} color={B.navy} onClick={()=>setPage('tickets')}/>
            <MetricCard label="Urgent" value={urgent.length} color="#E53E3E" onClick={()=>{setFilters(f=>({...f,priority:'Urgent'}));setPage('tickets');}}/>
            <MetricCard label="Escalated" value={escalated.length} color={B.orange} onClick={()=>setPage('sla')}/>
            <MetricCard label="Unassigned" value={unassigned.length} color="#805AD5"/>
            <MetricCard label="Resolved" value={resolved.length} color="#38A169"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            <Card>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Tickets by status</div>
              <BarChart data={[...new Set(tickets.map(t=>t.status))].map(s=>({label:s,count:tickets.filter(t=>t.status===s).length}))} color={B.teal} height={90}/>
            </Card>
            <Card>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Tickets by priority</div>
              <BarChart data={PRIORITIES.map(p=>({label:p,count:tickets.filter(t=>t.priority===p).length}))} color={B.orange} height={90}/>
            </Card>
          </div>
          <Card>
            <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:B.navy}}>Recent tickets</div>
              <button onClick={()=>setPage('tickets')} style={{marginLeft:'auto',background:'none',border:`1px solid ${B.border}`,padding:'5px 12px',borderRadius:6,cursor:'pointer',fontSize:12,color:B.teal}}>View all →</button>
            </div>
            <TicketTable rows={[...tickets].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,8)} onOpen={setDetail} loading={loading}/>
          </Card>
        </>}

        {/* ── ALL TICKETS ── */}
        {page==='tickets'&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:14}}>All Tickets</div>
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <input style={{...inpS,width:200}} placeholder="Search…" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))}/>
            <select style={inpS} value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
              <option value=''>All statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <select style={inpS} value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}>
              <option value=''>All priorities</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}
            </select>
            <select style={inpS} value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}>
              <option value=''>All categories</option>{categories.map(c=><option key={c}>{c}</option>)}
            </select>
            <select style={inpS} value={filters.customer_id} onChange={e=>setFilters(f=>({...f,customer_id:e.target.value}))}>
              <option value=''>All customers</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Btn onClick={()=>setFilters({status:'',priority:'',category:'',customer_id:'',q:''})}>Clear</Btn>
            <span style={{marginLeft:'auto',fontSize:12,color:B.light}}>{tickets.length} tickets</span>
          </div>
          <TicketTable rows={tickets} onOpen={setDetail} loading={loading}/>
        </>}

        {/* ── MY TICKETS ── */}
        {page==='mine'&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:14}}>My Tickets</div>
          <TicketTable rows={tickets.filter(t=>t.agent_id===user.id)} onOpen={setDetail} loading={loading}/>
        </>}

        {/* ── SLA MONITOR ── */}
        {page==='sla'&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:14}}>SLA Monitor</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
            <MetricCard label="Breached (≥90%)" value={slaData.filter(t=>Number(t.sla_pct)>=90).length} color="#E53E3E"/>
            <MetricCard label="At risk (70-89%)" value={slaData.filter(t=>Number(t.sla_pct)>=70&&Number(t.sla_pct)<90).length} color="#D69E2E"/>
            <MetricCard label="On track (<70%)" value={slaData.filter(t=>Number(t.sla_pct)<70).length} color="#38A169"/>
          </div>
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:B.bg}}>
                  {['Ticket','Subject','Customer','Priority','Agent','SLA Usage','Status'].map(h=>(
                    <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {slaData.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:B.light}}>No active tickets</td></tr>}
                  {slaData.map(t=>(
                    <tr key={t.id} onClick={()=>setDetail(t.id)} style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{padding:'10px 14px',fontSize:12,color:B.teal,fontWeight:600,borderBottom:`1px solid ${B.border}`}}>{t.ticket_number}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{t.subject}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid}}>{t.customer_org||'—'}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><PriBadge v={t.priority}/></td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12}}>{t.agent_name||'Unassigned'}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><SLABar pct={t.sla_pct}/></td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><StatusBadge v={t.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>}

        {/* ── REPORTS ── */}
        {page==='reports'&&<>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:700,color:B.navy}}>Reports & Analytics</div>
            <Btn onClick={loadReports}>↻ Refresh</Btn>
          </div>
          {reports.summary&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:12,marginBottom:20}}>
            <MetricCard label="Total tickets" value={reports.summary.total} color={B.navy}/>
            <MetricCard label="Open" value={reports.summary.open} color={B.teal}/>
            <MetricCard label="Resolved" value={reports.summary.resolved} color="#38A169"/>
            <MetricCard label="Escalated" value={reports.summary.escalated} color={B.orange}/>
            <MetricCard label="Urgent open" value={reports.summary.urgent} color="#E53E3E"/>
          </div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {reports.byDay&&<Card>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Daily volume (last 14 days)</div>
              <BarChart data={(reports.byDay||[]).map(d=>({label:d.day,count:Number(d.count)}))} color={B.teal} height={100}/>
            </Card>}
            {reports.byCategory&&<Card>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By category</div>
              <BarChart data={(reports.byCategory||[]).map(d=>({label:(d.category||'').split(' ')[0],count:Number(d.count)}))} color={B.orange} height={100}/>
            </Card>}
            {reports.byStatus&&<Card>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By status</div>
              <BarChart data={(reports.byStatus||[]).map(d=>({label:d.status,count:Number(d.count)}))} color={B.navy} height={100}/>
            </Card>}
            {reports.byPriority&&<Card>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By priority</div>
              <BarChart data={(reports.byPriority||[]).map(d=>({label:d.priority,count:Number(d.count)}))} color='#805AD5' height={100}/>
            </Card>}
          </div>
          {reports.byAgent&&<Card style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Agent performance</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:B.bg}}>
                {['Agent','Total','Open','Resolved'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}
              </tr></thead>
              <tbody>{(reports.byAgent||[]).map(a=>(
                <tr key={a.id}><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={a.name} size={26}/>{a.name}</div></td>
                <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontWeight:600}}>{a.total}</td>
                <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:'#805AD5',fontWeight:600}}>{a.open}</td>
                <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:'#38A169',fontWeight:600}}>{a.resolved}</td>
                </tr>))}
              </tbody>
            </table>
          </Card>}
          {reports.byCustomer&&<Card>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By customer</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:B.bg}}>
                {['Customer','Total','Open'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}
              </tr></thead>
              <tbody>{(reports.byCustomer||[]).map(c=>(
                <tr key={c.id}><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`}}>{c.name}</td>
                <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontWeight:600}}>{c.total}</td>
                <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:'#805AD5',fontWeight:600}}>{c.open}</td>
                </tr>))}
              </tbody>
            </table>
          </Card>}
        </>}

        {/* ── KNOWLEDGE BASE ── */}
        {page==='kb'&&<>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:700,color:B.navy,flex:1}}>Knowledge Base</div>
            <input style={{...inpS,width:220}} placeholder="Search articles…" value={kbSearch} onChange={e=>setKbSearch(e.target.value)}/>
            {isSuperOrAdmin&&<Btn variant="primary" onClick={()=>setEditKB({})}>+ New Article</Btn>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
            {kbArticles.length===0&&<div style={{color:B.light,fontSize:13,padding:20}}>No articles found</div>}
            {kbArticles.map(a=>(
              <Card key={a.id} style={{cursor:'pointer'}} onClick={()=>setEditKB(a)}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:B.navy,marginBottom:5}}>{a.title}</div>
                    <div style={{fontSize:12,color:B.mid,lineHeight:1.6,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{a.content}</div>
                    <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center'}}>
                      {a.category&&<span style={{fontSize:11,background:'#EBF8FF',color:'#1a6b8a',padding:'2px 8px',borderRadius:10}}>{a.category}</span>}
                      <span style={{fontSize:11,color:B.lighter}}>{a.views} views · {fmtD(a.created_at)}</span>
                      {!a.published&&<span style={{fontSize:11,background:'#FFFAF0',color:'#7B4E00',padding:'2px 8px',borderRadius:10}}>Draft</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>}

        {/* ── CUSTOMERS ── */}
        {page==='customers'&&isSuperOrAdmin&&<>
          <div style={{display:'flex',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:700,color:B.navy,flex:1}}>Customer Accounts</div>
            <Btn variant="primary" onClick={()=>setEditCustomer({})}>+ Add Customer</Btn>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
            {customers.map(c=>(
              <Card key={c.id}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <Avatar name={c.name} size={44}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:B.navy}}>{c.name}</div>
                    <div style={{fontSize:12,color:B.light,marginTop:2}}>{c.contact_email||'—'}</div>
                    <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{fontSize:11,background:'#E6FFFA',color:'#1D6B5E',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{c.sla_tier}</span>
                      <span style={{fontSize:11,color:B.light}}>{c.ticket_count||0} tickets</span>
                      <span style={{fontSize:11,color:B.light}}>AM: {c.account_manager||'—'}</span>
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:10}}>
                      <Btn onClick={()=>setEditCustomer(c)} style={{fontSize:11,padding:'4px 10px'}}>Edit</Btn>
                      <Btn onClick={()=>{setFilters(f=>({...f,customer_id:c.id}));setPage('tickets');}} style={{fontSize:11,padding:'4px 10px',color:B.teal}}>View tickets</Btn>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>}

        {/* ── USERS ── */}
        {page==='users'&&isAdmin&&<>
          <div style={{display:'flex',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:700,color:B.navy,flex:1}}>User Management</div>
            <Btn variant="primary" onClick={()=>setEditUser({})}>+ Create User</Btn>
          </div>
          <Card style={{padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:B.bg}}>
                {['User','Email','Role','Status','Created','Actions'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {allUsers.map(u=>(
                  <tr key={u.id} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={u.name} size={30}/><span style={{fontWeight:500}}>{u.name}</span></div></td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.mid}}>{u.email}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                      <span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:u.role==='admin'?'#FFF5F5':u.role==='supervisor'?'#FAF5FF':'#EBF8FF',color:u.role==='admin'?'#9B2335':u.role==='supervisor'?'#553C9A':'#1a6b8a'}}>{u.role}</span>
                    </td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                      <span style={{fontSize:11,background:u.active?'#F0FFF4':'#FFF5F5',color:u.active?'#276749':'#9B2335',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{u.active?'Active':'Inactive'}</span>
                    </td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.light}}>{fmtD(u.created_at)}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                      <div style={{display:'flex',gap:6}}>
                        <Btn onClick={()=>setEditUser(u)} style={{fontSize:11,padding:'4px 10px'}}>Edit</Btn>
                        {u.id!==user.id&&<Btn variant="danger" onClick={async()=>{if(window.confirm('Deactivate user?')){await api.delete(`/users/${u.id}`);loadUsers();}}} style={{fontSize:11,padding:'4px 10px'}}>Deactivate</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>}

        {/* ── ADMIN ── */}
        {page==='admin'&&isAdmin&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:16}}>Admin Configuration</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {/* SLA Config */}
            <Card>
              <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:14}}>SLA Policies</div>
              <div style={{fontSize:12,color:B.light,marginBottom:12}}>Set response and resolution time limits per priority. Changes take effect immediately.</div>
              {PRIORITIES.map(priority=>{
                const pol=slaConfig.find(s=>s.priority===priority)||{first_response_mins:240,resolution_mins:1440};
                const [resp,setResp]=useState(pol.first_response_mins);
                const [res,setRes]=useState(pol.resolution_mins);
                return (
                  <div key={priority} style={{borderBottom:`1px solid ${B.border}`,paddingBottom:12,marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <PriBadge v={priority}/>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <FG label="First response (mins)"><Inp type="number" defaultValue={pol.first_response_mins} onChange={e=>setResp(e.target.value)}/></FG>
                      <FG label="Resolution (mins)"><Inp type="number" defaultValue={pol.resolution_mins} onChange={e=>setRes(e.target.value)}/></FG>
                    </div>
                    <Btn variant="primary" style={{fontSize:11,padding:'4px 14px'}} onClick={()=>saveSLA(priority,resp,res)}>Save {priority}</Btn>
                  </div>
                );
              })}
            </Card>

            {/* Categories */}
            <Card>
              <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:14}}>Ticket Categories</div>
              <div style={{fontSize:12,color:B.light,marginBottom:12}}>Add or remove categories without touching any code.</div>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
                {categories.map((c,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:B.bg,borderRadius:8}}>
                    <span style={{fontSize:13}}>{c}</span>
                    <button onClick={async()=>{
                      const{data}=await api.get('/admin/categories');
                      const cat=data.data.find(x=>x.name===c);
                      if(cat){await api.delete(`/admin/categories/${cat.id}`);loadAll();}
                    }} style={{background:'none',border:'none',color:B.lighter,cursor:'pointer',fontSize:16}}>×</button>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8}}>
                <Inp id="new-cat" placeholder="New category name…" style={{flex:1}}/>
                <Btn variant="primary" onClick={async()=>{
                  const inp=document.getElementById('new-cat');
                  if(!inp.value.trim())return;
                  await api.post('/admin/categories',{name:inp.value.trim()});
                  inp.value='';loadAll();
                }}>Add</Btn>
              </div>
            </Card>
          </div>
        </>}

        {/* ── HELP ── */}
        {page==='help'&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:16}}>Help & Support Guide</div>
          <div style={{display:'flex',gap:8,marginBottom:16,borderBottom:`1px solid ${B.border}`,paddingBottom:0}}>
            {['guide','workflow','sla-ref','roles','faq'].map(t=>(
              <button key={t} onClick={()=>setHelpTab(t)} style={{
                background:'none',border:'none',padding:'8px 16px',cursor:'pointer',fontSize:13,fontFamily:'inherit',
                color:helpTab===t?B.navy:B.light,fontWeight:helpTab===t?600:400,
                borderBottom:helpTab===t?`2px solid ${B.orange}`:'2px solid transparent'}}>
                {{guide:'User Guide',workflow:'Ticket Workflow',slaref:'SLA Reference','sla-ref':'SLA Reference',roles:'Roles & Access',faq:'FAQ'}[t]||t}
              </button>
            ))}
          </div>

          {helpTab==='guide'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[
              {title:'Raising a new ticket',steps:['Click "+ New Ticket" in the top bar','Fill in the subject with a clear, specific description','Select Priority based on business impact','Choose the correct Category','Select the Customer organisation','Add a Description including site, equipment, and error details','Assign to an agent or leave unassigned for auto-routing','Click Create Ticket — your ticket number is assigned immediately']},
              {title:'Managing tickets',steps:['Click any ticket row to open the detail panel','Change status using the Status dropdown in the panel','Reassign to another agent using the Agent dropdown','Edit priority, category, or customer using the Edit button','Add a public reply to communicate with the customer','Add an internal note for team-only discussions','All changes are logged in the Audit Trail automatically']},
              {title:'SLA monitoring',steps:['Go to SLA Monitor in the navigation','Red SLA bar (≥90%) = breach imminent or breached','Amber SLA bar (70-89%) = at risk — action needed','Green SLA bar (<70%) = on track','SLA timers run from ticket creation time','Resolved or Closed tickets are removed from SLA tracking']},
              {title:'Knowledge base',steps:['Go to Knowledge Base to search articles','Use the search bar to find troubleshooting guides','Click any article to view or edit it','Agents and above can create new articles','Articles in Draft are only visible to agents','Published articles are visible to all users']},
            ].map(s=>(
              <Card key={s.title}>
                <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>{s.title}</div>
                <ol style={{paddingLeft:18,display:'flex',flexDirection:'column',gap:7}}>
                  {s.steps.map((step,i)=><li key={i} style={{fontSize:13,color:B.mid,lineHeight:1.6}}>{step}</li>)}
                </ol>
              </Card>
            ))}
          </div>}

          {helpTab==='workflow'&&<Card>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:14}}>Ticket lifecycle</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                {status:'New',desc:'Ticket just created. No agent assigned yet.',color:'#3182CE'},
                {status:'Open',desc:'Ticket acknowledged, under review.',color:'#718096'},
                {status:'Assigned',desc:'Agent assigned. Work not started.',color:'#38B2AC'},
                {status:'In Progress',desc:'Agent actively working on the issue.',color:'#805AD5'},
                {status:'Pending',desc:'Waiting for customer response or third-party action.',color:'#D69E2E'},
                {status:'On Hold',desc:'Temporarily paused — planned maintenance or awaiting parts.',color:'#A0AEC0'},
                {status:'Escalated',desc:'Requires senior engineer or management involvement.',color:'#FC8181'},
                {status:'Resolved',desc:'Issue fixed. Awaiting customer confirmation.',color:'#48BB78'},
                {status:'Closed',desc:'Confirmed resolved. Ticket archived.',color:'#CBD5E0'},
              ].map(s=>(
                <div key={s.status} style={{display:'flex',gap:14,alignItems:'flex-start',padding:'10px 14px',background:B.bg,borderRadius:8,borderLeft:`4px solid ${s.color}`}}>
                  <StatusBadge v={s.status}/>
                  <div style={{fontSize:13,color:B.mid,lineHeight:1.6}}>{s.desc}</div>
                </div>
              ))}
            </div>
          </Card>}

          {helpTab==='sla-ref'&&<Card>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:14}}>SLA policy reference</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:B.bg}}>
                {['Priority','Use case','First response','Resolution','Examples'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  {p:'Urgent',use:'Complete outage',resp:'1 hour',res:'4 hours',eg:'Site down, all services offline'},
                  {p:'High',use:'Major degradation',resp:'4 hours',res:'24 hours',eg:'50%+ users affected'},
                  {p:'Medium',use:'Partial issue',resp:'8 hours',res:'3 days',eg:'Single service degraded'},
                  {p:'Low',use:'Minor / query',resp:'24 hours',res:'7 days',eg:'Enhancement request'},
                ].map(r=>(
                  <tr key={r.p} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><PriBadge v={r.p}/></td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13}}>{r.use}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.teal,fontWeight:600}}>{r.resp}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.navy,fontWeight:600}}>{r.res}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid}}>{r.eg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>}

          {helpTab==='roles'&&<Card>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:14}}>Role permissions</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:B.bg}}>
                {['Permission','Customer','Agent','Supervisor','Admin'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  ['Raise tickets','✓','✓','✓','✓'],
                  ['View own tickets','✓','✓','✓','✓'],
                  ['View all tickets','✗','✓','✓','✓'],
                  ['Change ticket status','✗','✓','✓','✓'],
                  ['Assign tickets','✗','✓','✓','✓'],
                  ['Add internal notes','✗','✓','✓','✓'],
                  ['Create KB articles','✗','✓','✓','✓'],
                  ['Manage customers','✗','✗','✓','✓'],
                  ['Create users','✗','✗','✗','✓'],
                  ['Configure SLA','✗','✗','✗','✓'],
                  ['Admin panel','✗','✗','✗','✓'],
                ].map(([perm,...vals])=>(
                  <tr key={perm} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13}}>{perm}</td>
                    {vals.map((v,i)=><td key={i} style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontSize:14,color:v==='✓'?'#38A169':'#E53E3E',fontWeight:700}}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>}

          {helpTab==='faq'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {q:'How do I reset a user\'s password?',a:'Go to Users → click Edit on the user → enter a new password in the "New password" field → click Save. The user can log in immediately with the new password.'},
              {q:'How do I add a new customer?',a:'Go to Customers → click "+ Add Customer" → fill in the organisation details including name, contact, account manager, and SLA tier → click Add Customer.'},
              {q:'How do I change SLA timers?',a:'Go to Admin → SLA Policies → enter new values in minutes for first response and resolution → click Save. Changes take effect on new tickets immediately.'},
              {q:'What happens when an SLA is breached?',a:'The SLA bar turns red on the ticket and in the SLA Monitor. The ticket escalation count increases. Agents should prioritise red-bar tickets immediately.'},
              {q:'Can I add new ticket categories?',a:'Yes — go to Admin → Ticket Categories → type the new category name → click Add. It appears immediately in the ticket creation form.'},
              {q:'How does the internal note work?',a:'Internal notes are only visible to agents and supervisors — never to customers. Use them to record investigation steps, handover notes, or team coordination.'},
              {q:'How do I update the tool without downtime?',a:'Push your changes to GitHub. Railway auto-deploys using rolling deployment — the new version starts before the old one stops, so there is zero downtime. Vercel does the same for the frontend.'},
            ].map(({q,a})=>(
              <Card key={q}>
                <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:8}}>{q}</div>
                <div style={{fontSize:13,color:B.mid,lineHeight:1.7}}>{a}</div>
              </Card>
            ))}
          </div>}
        </>}

      </main>

      {/* ── Modals ── */}
      {detail&&<TicketDetail id={detail} agents={agents} categories={categories} customers={customers} onClose={()=>{setDetail(null);loadTickets();}}/>}
      {creating&&<CreateModal agents={agents} categories={categories} customers={customers} onClose={()=>setCreating(false)} onCreated={()=>{loadTickets();}}/>}
      {editUser!==null&&<UserModal user={editUser.id?editUser:null} onClose={()=>setEditUser(null)} onSaved={loadUsers}/>}
      {editCustomer!==null&&<CustomerModal customer={editCustomer.id?editCustomer:null} onClose={()=>setEditCustomer(null)} onSaved={()=>{loadAll();setPage('customers');}}/>}
      {editKB!==null&&<KBModal article={editKB.id?editKB:null} categories={categories} onClose={()=>setEditKB(null)} onSaved={loadKB}/>}
    </div>
  );
}
