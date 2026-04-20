import React, { useState, useEffect, useCallback } from 'react';
import api from './services/api';

// ── Brand ─────────────────────────────────────────────────────────
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
const SLA_TIERS = ['Standard','Premium','Enterprise','Custom'];

const ALL_PERMISSIONS = [
  {key:'raise_tickets',    label:'Raise tickets'},
  {key:'view_all_tickets', label:'View all tickets'},
  {key:'change_status',    label:'Change ticket status'},
  {key:'assign_tickets',   label:'Assign tickets'},
  {key:'internal_notes',   label:'Add internal notes'},
  {key:'manage_users',     label:'Manage users'},
  {key:'manage_customers', label:'Manage customers'},
  {key:'configure_sla',    label:'Configure SLA'},
  {key:'admin_panel',      label:'Access admin panel'},
  {key:'export_tickets',   label:'Export tickets'},
  {key:'kb_articles',      label:'Create KB articles'},
];

// ── Utils ─────────────────────────────────────────────────────────
const fmtDT = d => d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
const fmtD  = d => d ? new Date(d).toLocaleDateString('en-GB') : '—';
const ago = d => {
  if (!d) return '—';
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`;
  if (m<1440) return `${Math.floor(m/60)}h ago`; return `${Math.floor(m/1440)}d ago`;
};
const slaColor = pct => pct>=90?'#E53E3E':pct>=70?'#D69E2E':'#38A169';

// ── Base UI ───────────────────────────────────────────────────────
const StatusBadge = ({v}) => { const c=STATUS_CFG[v]||STATUS_CFG.Open; return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:c.bg,color:c.c}}><span style={{width:6,height:6,borderRadius:'50%',background:c.dot,flexShrink:0}}/>{v||'—'}</span>; };
const PriBadge = ({v}) => { const c=PRI_CFG[v]||PRI_CFG.Medium; return <span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:c.bg,color:c.c,border:`1px solid ${c.bd}`}}>{v||'—'}</span>; };
const Avatar = ({name,size=30}) => { const initials=name?name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2):'?'; const cols=[B.navy,B.teal,B.orange,'#553C9A','#276749','#9B2335']; return <div style={{width:size,height:size,borderRadius:'50%',background:cols[(name?.charCodeAt(0)||0)%cols.length],display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:size*.35,fontWeight:700,flexShrink:0}}>{initials}</div>; };
const Inp = ({style,...p}) => <input style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'8px 12px',fontSize:13,fontFamily:'inherit',background:B.white,width:'100%',boxSizing:'border-box',outline:'none',...style}} {...p}/>;
const Sel = ({style,...p}) => <select style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'7px 10px',fontSize:13,fontFamily:'inherit',background:B.white,cursor:'pointer',...style}} {...p}/>;
const Btn = ({variant='secondary',style,...p}) => <button style={{border:variant==='primary'?'none':variant==='danger'?`1px solid #FEB2B2`:`1px solid ${B.border}`,background:variant==='primary'?B.navy:variant==='danger'?'#FFF5F5':B.white,color:variant==='primary'?'#fff':variant==='danger'?'#9B2335':B.mid,padding:'7px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:variant==='primary'?600:400,fontFamily:'inherit',...style}} {...p}/>;
const Card = ({style,...p}) => <div style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:10,padding:16,...style}} {...p}/>;
const SLABar = ({pct}) => { const p=Math.min(Number(pct)||0,100); const col=slaColor(p); return <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:60,height:5,background:'#EDF2F7',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${p}%`,background:col,borderRadius:3}}/></div><span style={{fontSize:11,color:col,fontWeight:600}}>{Math.round(p)}%</span></div>; };
const BarChart = ({data,color,height=80}) => { const max=Math.max(...(data||[]).map(d=>Number(d.count||d.v||0)),1); return <div style={{display:'flex',alignItems:'flex-end',gap:6,height,padding:'4px 0 0'}}>{(data||[]).map((d,i)=>{const v=Number(d.count||d.v||0);return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}><div style={{fontSize:10,color:B.light}}>{v||''}</div><div style={{width:'100%',height:Math.max((v/max)*(height-20),3),background:color||B.navy,borderRadius:'3px 3px 0 0',opacity:.85}}/><div style={{fontSize:10,color:B.light,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%',textAlign:'center'}}>{d.label||d.l||d.status||d.priority||d.category||''}</div></div>;})}</div>; };
const FG = ({label,children,style}) => <div style={{display:'flex',flexDirection:'column',gap:5,...style}}><label style={{fontSize:12,fontWeight:600,color:B.mid}}>{label}</label>{children}</div>;
const MetricCard = ({label,value,color,sub,onClick}) => <div onClick={onClick} style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:10,padding:'16px 18px',cursor:onClick?'pointer':'default',borderTop:`3px solid ${color||B.navy}`}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.1)';}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';}}><div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:'.5px'}}>{label}</div><div style={{fontSize:26,fontWeight:700,color:color||B.dark}}>{value??'—'}</div>{sub&&<div style={{fontSize:11,color:B.light,marginTop:3}}>{sub}</div>}</div>;

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

// ── Ticket Workflow SVG Diagram ───────────────────────────────────
const WorkflowDiagram = () => (
  <div style={{overflowX:'auto',padding:'8px 0'}}>
    <svg width="100%" viewBox="0 0 700 420" role="img" style={{minWidth:600}}>
      <title>Ticket lifecycle workflow diagram</title>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
      </defs>

      {/* NEW */}
      <rect x="10" y="30" width="90" height="36" rx="8" fill="#EBF8FF" stroke="#3182CE" strokeWidth="1.5"/>
      <text x="55" y="53" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1a6b8a">New</text>

      {/* OPEN */}
      <rect x="160" y="30" width="90" height="36" rx="8" fill="#EDF2F7" stroke="#718096" strokeWidth="1.5"/>
      <text x="205" y="53" textAnchor="middle" fontSize="12" fontWeight="600" fill="#4A5568">Open</text>

      {/* ASSIGNED */}
      <rect x="310" y="30" width="90" height="36" rx="8" fill="#E6FFFA" stroke="#38B2AC" strokeWidth="1.5"/>
      <text x="355" y="53" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1D6B5E">Assigned</text>

      {/* IN PROGRESS */}
      <rect x="460" y="30" width="100" height="36" rx="8" fill="#FAF5FF" stroke="#805AD5" strokeWidth="1.5"/>
      <text x="510" y="53" textAnchor="middle" fontSize="12" fontWeight="600" fill="#553C9A">In Progress</text>

      {/* Arrows row 1 */}
      <line x1="100" y1="48" x2="160" y2="48" stroke="#718096" strokeWidth="1.2" markerEnd="url(#arr)"/>
      <line x1="250" y1="48" x2="310" y2="48" stroke="#718096" strokeWidth="1.2" markerEnd="url(#arr)"/>
      <line x1="400" y1="48" x2="460" y2="48" stroke="#718096" strokeWidth="1.2" markerEnd="url(#arr)"/>

      {/* PENDING */}
      <rect x="160" y="150" width="90" height="36" rx="8" fill="#FFFAF0" stroke="#D69E2E" strokeWidth="1.5"/>
      <text x="205" y="173" textAnchor="middle" fontSize="12" fontWeight="600" fill="#7B4E00">Pending</text>

      {/* ON HOLD */}
      <rect x="310" y="150" width="90" height="36" rx="8" fill="#F7FAFC" stroke="#A0AEC0" strokeWidth="1.5"/>
      <text x="355" y="173" textAnchor="middle" fontSize="12" fontWeight="600" fill="#4A5568">On Hold</text>

      {/* ESCALATED */}
      <rect x="460" y="150" width="100" height="36" rx="8" fill="#FFF5F5" stroke="#FC8181" strokeWidth="1.5"/>
      <text x="510" y="173" textAnchor="middle" fontSize="12" fontWeight="600" fill="#9B2335">Escalated</text>

      {/* In Progress → Pending/OnHold/Escalated */}
      <path d="M510 66 L510 110 L205 110 L205 150" fill="none" stroke="#718096" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arr)"/>
      <path d="M510 66 L510 110 L355 110 L355 150" fill="none" stroke="#718096" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arr)"/>
      <path d="M510 66 L510 150" fill="none" stroke="#FC8181" strokeWidth="1.2" markerEnd="url(#arr)"/>

      {/* RESOLVED */}
      <rect x="285" y="270" width="100" height="36" rx="8" fill="#F0FFF4" stroke="#48BB78" strokeWidth="2"/>
      <text x="335" y="293" textAnchor="middle" fontSize="12" fontWeight="700" fill="#276749">Resolved</text>

      {/* Pending/OnHold/Escalated → Resolved */}
      <path d="M205 186 L205 250 L285 250 L285 288" fill="none" stroke="#48BB78" strokeWidth="1.2" markerEnd="url(#arr)"/>
      <path d="M355 186 L355 250 L335 250 L335 288" fill="none" stroke="#48BB78" strokeWidth="1.2" markerEnd="url(#arr)"/>
      <path d="M510 186 L510 250 L385 250 L385 288" fill="none" stroke="#48BB78" strokeWidth="1.2" markerEnd="url(#arr)"/>
      {/* In Progress → Resolved direct */}
      <path d="M560 66 L590 66 L590 288 L385 288" fill="none" stroke="#48BB78" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arr)"/>

      {/* CLOSED */}
      <rect x="160" y="360" width="90" height="36" rx="8" fill="#F7FAFC" stroke="#CBD5E0" strokeWidth="1.5"/>
      <text x="205" y="383" textAnchor="middle" fontSize="12" fontWeight="600" fill="#718096">Closed</text>

      {/* REOPENED */}
      <rect x="420" y="360" width="100" height="36" rx="8" fill="#FAECE7" stroke="#D85A30" strokeWidth="1.5"/>
      <text x="470" y="383" textAnchor="middle" fontSize="12" fontWeight="600" fill="#712B13">Reopened</text>

      {/* Resolved → Closed / Reopened */}
      <path d="M335 306 L335 340 L205 340 L205 360" fill="none" stroke="#718096" strokeWidth="1.2" markerEnd="url(#arr)"/>
      <path d="M335 306 L335 340 L470 340 L470 360" fill="none" stroke="#D85A30" strokeWidth="1.2" markerEnd="url(#arr)"/>

      {/* Reopened → Open (loop back) */}
      <path d="M420 378 L100 378 L100 66 L160 66" fill="none" stroke="#D85A30" strokeWidth="1" strokeDasharray="5 3" markerEnd="url(#arr)"/>
      <text x="260" y="400" textAnchor="middle" fontSize="10" fill="#D85A30">Re-open → back to Open</text>

      {/* Legend */}
      <line x1="10" y1="415" x2="30" y2="415" stroke="#718096" strokeWidth="1.5"/>
      <text x="35" y="419" fontSize="10" fill="#718096">Normal flow</text>
      <line x1="130" y1="415" x2="150" y2="415" stroke="#718096" strokeWidth="1" strokeDasharray="4 3"/>
      <text x="155" y="419" fontSize="10" fill="#718096">Optional path</text>
      <line x1="260" y1="415" x2="280" y2="415" stroke="#D85A30" strokeWidth="1" strokeDasharray="5 3"/>
      <text x="285" y="419" fontSize="10" fill="#D85A30">Reopen loop</text>
    </svg>
  </div>
);

// ── Login ─────────────────────────────────────────────────────────
function Login({onLogin}) {
  const [e,setE]=useState('');
  const [p,setP]=useState('');
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
          <div style={{fontSize:30,fontWeight:800,color:B.navy,letterSpacing:'-1px'}}>Ticket<span style={{color:B.orange}}>Va</span></div>
          <div style={{fontSize:13,color:B.light,marginTop:4}}>Support Management Platform</div>
        </div>
        {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9B2335',marginBottom:16}}>{err}</div>}
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
          <FG label="Email address"><Inp type="email" value={e} onChange={ev=>setE(ev.target.value)} placeholder="your@email.com" autoFocus/></FG>
          <FG label="Password"><Inp type="password" value={p} onChange={ev=>setP(ev.target.value)} placeholder="Enter your password"/></FG>
          <Btn variant="primary" style={{padding:12,fontSize:14}}>{load?'Signing in…':'Sign in →'}</Btn>
        </form>
        <div style={{marginTop:20,background:B.bg,borderRadius:8,padding:'10px 14px',fontSize:12,color:B.light,textAlign:'center'}}>
          Contact your administrator for login credentials
        </div>
      </div>
    </div>
  );
}

// ── Ticket Detail ─────────────────────────────────────────────────
function TicketDetail({id,onClose,agents,categories,customers}) {
  const [ticket,setTicket]=useState(null);
  const [reply,setReply]=useState('');
  const [rtype,setRtype]=useState('public');
  const [sending,setSending]=useState(false);
  const [editing,setEditing]=useState(false);
  const [ef,setEf]=useState({});
  const load=useCallback(async()=>{try{const{data}=await api.get(`/tickets/${id}`);setTicket(data.data);setEf(data.data);}catch{onClose();}},[id,onClose]);
  useEffect(()=>{load();},[load]);
  async function changeStatus(status){await api.post(`/tickets/${id}/status`,{status});load();}
  async function reassign(agent_id){await api.post(`/tickets/${id}/assign`,{agent_id});load();}
  async function saveEdit(){await api.put(`/tickets/${id}`,{priority:ef.priority,category:ef.category,customer_org_id:ef.customer_org_id});setEditing(false);load();}
  async function sendReply(){if(!reply.trim())return;setSending(true);try{await api.post(`/tickets/${id}/comments`,{content:reply,type:rtype});setReply('');load();}finally{setSending(false);}}
  const ss={border:`1px solid ${B.border}`,borderRadius:6,padding:'5px 8px',fontSize:12,background:B.white,fontFamily:'inherit',cursor:'pointer'};
  return (
    <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(15,71,97,.4)',zIndex:100,display:'flex',justifyContent:'flex-end'}} onClick={onClose}>
      <div style={{width:580,height:'100%',background:B.white,overflowY:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:B.navy,padding:'16px 20px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginBottom:4}}>{ticket?.ticket_number} · {ticket?.channel}</div>
              <div style={{fontSize:15,fontWeight:600,color:'#fff',lineHeight:1.4}}>{ticket?.subject||'Loading…'}</div>
            </div>
            <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
          {ticket&&<div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}><StatusBadge v={ticket.status}/><PriBadge v={ticket.priority}/>{ticket.category&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:11,background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.9)'}}>{ticket.category}</span>}</div>}
        </div>
        {!ticket?<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:B.light}}>Loading…</div>
        :<div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[['Customer',ticket.customer_name||'—'],['Organisation',ticket.customer_org||'—'],['Created',fmtDT(ticket.created_at)],['Updated',ago(ticket.updated_at)]].map(([l,v])=>(
              <div key={l} style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}><div style={{fontSize:11,color:B.light,marginBottom:3,fontWeight:500}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:B.dark}}>{v}</div></div>
            ))}
            <div style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}><div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500}}>Status</div><select style={ss} value={ticket.status} onChange={e=>changeStatus(e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}><div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500}}>Agent</div><select style={ss} value={ticket.agent_id||''} onChange={e=>reassign(e.target.value)}><option value=''>Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          </div>
          {ticket.resolution_mins&&(()=>{const pct=Math.min((Number(ticket.age_mins||0)/ticket.resolution_mins)*100,100);const rem=Math.max(ticket.resolution_mins-Number(ticket.age_mins||0),0);return <div style={{background:B.bg,borderRadius:8,padding:'10px 14px'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:12,fontWeight:600,color:B.mid}}>SLA Resolution</span><span style={{fontSize:12,color:slaColor(pct),fontWeight:600}}>{pct>=100?'BREACHED':`${Math.floor(rem/60)}h ${Math.round(rem%60)}m remaining`}</span></div><div style={{height:6,background:'#EDF2F7',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:slaColor(pct),borderRadius:3}}/></div></div>;})()}
          {editing?<div style={{background:B.bg,borderRadius:8,padding:14,display:'flex',flexDirection:'column',gap:10}}>
            <FG label="Priority"><Sel value={ef.priority} onChange={e=>setEf(f=>({...f,priority:e.target.value}))}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></FG>
            <FG label="Category"><Sel value={ef.category||''} onChange={e=>setEf(f=>({...f,category:e.target.value}))}>{categories.map(c=><option key={c}>{c}</option>)}</Sel></FG>
            <FG label="Customer"><Sel value={ef.customer_org_id||''} onChange={e=>setEf(f=>({...f,customer_org_id:e.target.value}))}><option value=''>None</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
            <div style={{display:'flex',gap:8}}><Btn variant="primary" onClick={saveEdit} style={{flex:1}}>Save</Btn><Btn onClick={()=>setEditing(false)}>Cancel</Btn></div>
          </div>:<button onClick={()=>setEditing(true)} style={{background:'none',border:`1px dashed ${B.border}`,borderRadius:8,padding:'8px',fontSize:12,color:B.light,cursor:'pointer'}}>Edit priority / category / customer →</button>}
          {ticket.description&&<div style={{background:B.bg,borderRadius:8,padding:'12px 14px',fontSize:13,color:B.mid,lineHeight:1.7,borderLeft:`3px solid ${B.teal}`}}>{ticket.description}</div>}
          <div style={{fontSize:13,fontWeight:700,color:B.navy}}>Conversation ({(ticket.thread||[]).length})</div>
          {(ticket.thread||[]).length===0&&<div style={{fontSize:13,color:B.light,textAlign:'center',padding:16}}>No messages yet</div>}
          {(ticket.thread||[]).map(m=>(
            <div key={m.id} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
              <Avatar name={m.author_name||'System'} size={32}/>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:B.dark}}>{m.author_name||'System'}</span>{m.type==='internal'&&<span style={{fontSize:10,background:B.orange,color:'#fff',padding:'1px 7px',borderRadius:10,fontWeight:600}}>Internal</span>}<span style={{fontSize:11,color:B.light,marginLeft:'auto'}}>{fmtDT(m.created_at)}</span></div>
                <div style={{background:m.type==='internal'?'#FFFAF0':B.bg,border:`1px solid ${m.type==='internal'?'#F6E05E':B.border}`,borderRadius:8,padding:'10px 14px',fontSize:13,color:B.mid,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{m.content}</div>
              </div>
            </div>
          ))}
          <div style={{border:`1px solid ${B.border}`,borderRadius:10,overflow:'hidden'}}>
            <div style={{display:'flex',background:B.bg,borderBottom:`1px solid ${B.border}`}}>
              {['public','internal'].map(t=><div key={t} onClick={()=>setRtype(t)} style={{padding:'9px 16px',fontSize:12,fontWeight:600,cursor:'pointer',color:rtype===t?B.navy:B.light,borderBottom:rtype===t?`2px solid ${B.orange}`:'2px solid transparent',background:rtype===t?B.white:'transparent'}}>{t==='public'?'Public Reply':'Internal Note'}</div>)}
            </div>
            <textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder={rtype==='internal'?'Internal note — not visible to customer…':'Reply to customer…'} style={{width:'100%',border:'none',padding:'12px 14px',fontSize:13,resize:'vertical',minHeight:90,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
            <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 12px',borderTop:`1px solid ${B.border}`,background:B.bg}}><Btn variant="primary" onClick={sendReply} disabled={sending||!reply.trim()} style={{opacity:reply.trim()?1:.5}}>{sending?'Sending…':rtype==='internal'?'Add Note':'Send Reply'}</Btn></div>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:B.navy}}>Audit trail</div>
          {(ticket.history||[]).map((h,i)=><div key={i} style={{display:'flex',gap:8,fontSize:12,alignItems:'flex-start'}}><div style={{width:6,height:6,borderRadius:'50%',background:B.teal,marginTop:4,flexShrink:0}}/><span style={{color:B.light,minWidth:120,flexShrink:0}}>{fmtDT(h.changed_at)}</span><span style={{color:B.mid}}><strong>{h.actor_name||'System'}</strong> — {h.field_changed}: {h.old_value||'—'} → <strong>{h.new_value}</strong></span></div>)}
        </div>}
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
  async function submit(){if(!f.subject.trim()){setErr('Subject is required');return;}setSaving(true);try{await api.post('/tickets',f);onCreated();onClose();}catch(e){setErr(e.response?.data?.error||'Failed');}finally{setSaving(false);}}
  return (
    <Modal onClose={onClose} title="Raise New Ticket" width={520}>
      {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#9B2335',marginBottom:14}}>{err}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Subject *"><Inp value={f.subject} onChange={set('subject')} placeholder="Brief description of the issue" autoFocus/></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Priority"><Sel value={f.priority} onChange={set('priority')}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></FG>
          <FG label="Category"><Sel value={f.category} onChange={set('category')}>{categories.map(c=><option key={c}>{c}</option>)}</Sel></FG>
          <FG label="Channel"><Sel value={f.channel} onChange={set('channel')}>{CHANNELS.map(c=><option key={c}>{c}</option>)}</Sel></FG>
          <FG label="Customer organisation"><Sel value={f.customer_org_id} onChange={set('customer_org_id')}><option value=''>Select customer…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
        </div>
        <FG label="Assign to agent"><Sel value={f.agent_id} onChange={set('agent_id')} style={{width:'100%'}}><option value=''>Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}</Sel></FG>
        <FG label="Description"><textarea value={f.description} onChange={set('description')} placeholder="Full details — site, equipment, error messages, impact…" style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',minHeight:90,resize:'vertical',width:'100%',boxSizing:'border-box',outline:'none'}}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Creating…':'Create Ticket'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── User Modal ────────────────────────────────────────────────────
function UserModal({user,onClose,onSaved,customers}) {
  const isNew=!user?.id;
  const [f,setF]=useState({name:user?.name||'',email:user?.email||'',role:user?.role||'agent',password:'',active:user?.active!==false,department:user?.department||'',phone:user?.phone||'',company_name:user?.company_name||'',customer_org_id:user?.customer_org_id||''});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState('');
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit(){
    if(!f.name||!f.email){setErr('Name and email required');return;}
    if(isNew&&!f.password){setErr('Password required for new user');return;}
    setSaving(true);
    try{if(isNew)await api.post('/users',f);else await api.put(`/users/${user.id}`,f);onSaved();onClose();}
    catch(e){setErr(e.response?.data?.error||'Failed');}finally{setSaving(false);}
  }
  return (
    <Modal onClose={onClose} title={isNew?'Create User':'Edit User'} width={500}>
      {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#9B2335',marginBottom:14}}>{err}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Full name *"><Inp value={f.name} onChange={set('name')} autoFocus/></FG>
          <FG label="Email address *"><Inp type="email" value={f.email} onChange={set('email')}/></FG>
          <FG label="Role"><Sel value={f.role} onChange={set('role')}>{ROLES.map(r=><option key={r}>{r}</option>)}</Sel></FG>
          <FG label="Status"><Sel value={f.active?'active':'inactive'} onChange={e=>setF(p=>({...p,active:e.target.value==='active'}))}><option value="active">Active</option><option value="inactive">Inactive</option></Sel></FG>
          <FG label="Department"><Inp value={f.department} onChange={set('department')} placeholder="e.g. IT, Operations"/></FG>
          <FG label="Phone"><Inp value={f.phone} onChange={set('phone')} placeholder="+44 7700 000000"/></FG>
          <FG label="Company name"><Inp value={f.company_name} onChange={set('company_name')} placeholder="Organisation name"/></FG>
          <FG label="Link to customer account"><Sel value={f.customer_org_id} onChange={set('customer_org_id')}><option value=''>None</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
        </div>
        <FG label={isNew?'Password *':'New password (blank = keep current)'}><Inp type="password" value={f.password} onChange={set('password')} placeholder={isNew?'Set password…':'Leave blank to keep current'}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Create User':'Save Changes'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── Customer Modal ────────────────────────────────────────────────
function CustomerModal({customer,onClose,onSaved}) {
  const isNew=!customer?.id;
  const [f,setF]=useState({name:customer?.name||'',contact_email:customer?.contact_email||'',contact_phone:customer?.contact_phone||'',account_manager:customer?.account_manager||'',sla_tier:customer?.sla_tier||'Standard',address:customer?.address||'',industry:customer?.industry||'',website:customer?.website||''});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit(){
    if(!f.name.trim()){alert('Name required');return;}
    setSaving(true);
    try{if(isNew)await api.post('/customers',f);else await api.put(`/customers/${customer.id}`,f);onSaved();onClose();}
    catch(e){alert(e.response?.data?.error||'Failed');}finally{setSaving(false);}
  }
  return (
    <Modal onClose={onClose} title={isNew?'Add Customer':'Edit Customer'} width={480}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Organisation name *"><Inp value={f.name} onChange={set('name')} autoFocus/></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Contact email"><Inp type="email" value={f.contact_email} onChange={set('contact_email')}/></FG>
          <FG label="Contact phone"><Inp value={f.contact_phone} onChange={set('contact_phone')}/></FG>
          <FG label="Account manager"><Inp value={f.account_manager} onChange={set('account_manager')}/></FG>
          <FG label="SLA tier"><Sel value={f.sla_tier} onChange={set('sla_tier')}>{SLA_TIERS.map(t=><option key={t}>{t}</option>)}</Sel></FG>
          <FG label="Industry"><Inp value={f.industry} onChange={set('industry')} placeholder="e.g. Telecom, Finance"/></FG>
          <FG label="Website"><Inp value={f.website} onChange={set('website')} placeholder="https://…"/></FG>
        </div>
        <FG label="Address"><Inp value={f.address} onChange={set('address')}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Add Customer':'Save'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── KB Modal ──────────────────────────────────────────────────────
function KBModal({article,onClose,onSaved,categories}) {
  const isNew=!article?.id;
  const [f,setF]=useState({title:article?.title||'',content:article?.content||'',category:article?.category||categories[0]||'',published:article?.published||false});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit(){setSaving(true);try{if(isNew)await api.post('/kb',f);else await api.put(`/kb/${article.id}`,f);onSaved();onClose();}catch(e){alert(e.response?.data?.error||'Failed');}finally{setSaving(false);}}
  return (
    <Modal onClose={onClose} title={isNew?'New Article':'Edit Article'} width={600}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Title *"><Inp value={f.title} onChange={set('title')} autoFocus/></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Category"><Sel value={f.category} onChange={set('category')}>{categories.map(c=><option key={c}>{c}</option>)}</Sel></FG>
          <FG label="Status"><Sel value={f.published?'published':'draft'} onChange={e=>setF(p=>({...p,published:e.target.value==='published'}))}><option value="draft">Draft</option><option value="published">Published</option></Sel></FG>
        </div>
        <FG label="Content *"><textarea value={f.content} onChange={set('content')} style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'10px 12px',fontSize:13,fontFamily:'inherit',minHeight:180,resize:'vertical',width:'100%',boxSizing:'border-box',outline:'none'}}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Create Article':'Save'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── Customer SLA Modal ────────────────────────────────────────────
function CustomerSLAModal({sla,customers,onClose,onSaved}) {
  const isNew=!sla?.id;
  const [f,setF]=useState({customer_id:sla?.customer_id||'',priority:sla?.priority||'High',first_response_mins:sla?.first_response_mins||240,resolution_mins:sla?.resolution_mins||1440,notes:sla?.notes||''});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit(){if(!f.customer_id){alert('Select a customer');return;}setSaving(true);try{await api.post('/sla/customer',f);onSaved();onClose();}catch(e){alert(e.response?.data?.error||'Failed');}finally{setSaving(false);}}
  return (
    <Modal onClose={onClose} title={isNew?'Add Customer SLA':'Edit Customer SLA'} width={440}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Customer *"><Sel value={f.customer_id} onChange={set('customer_id')}><option value=''>Select customer…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
        <FG label="Priority *"><Sel value={f.priority} onChange={set('priority')}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="First response (mins)"><Inp type="number" value={f.first_response_mins} onChange={set('first_response_mins')}/></FG>
          <FG label="Resolution (mins)"><Inp type="number" value={f.resolution_mins} onChange={set('resolution_mins')}/></FG>
        </div>
        <FG label="Notes / agreement reference"><Inp value={f.notes} onChange={set('notes')} placeholder="e.g. Contract ref, special terms"/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':'Save SLA'}</Btn></div>
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
                <tr key={t.id} onClick={()=>onOpen(t.id)} style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'10px 14px',fontSize:12,color:B.teal,fontWeight:600,borderBottom:`1px solid ${B.border}`,whiteSpace:'nowrap'}}>{t.ticket_number}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{t.subject}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><div style={{display:'flex',alignItems:'center',gap:6}}><Avatar name={t.customer_org||t.customer_name} size={22}/><span style={{fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.customer_org||t.customer_name||'—'}</span></div></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.category||'—'}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><PriBadge v={t.priority}/></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><StatusBadge v={t.status}/></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>{t.agent_name?<div style={{display:'flex',alignItems:'center',gap:6}}><Avatar name={t.agent_name} size={22}/><span style={{fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.agent_name}</span></div>:<span style={{fontSize:12,color:B.lighter}}>Unassigned</span>}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>{slaPct!==null?<SLABar pct={slaPct}/>:<span style={{fontSize:12,color:B.lighter}}>—</span>}</td>
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

// ── Export Helper ─────────────────────────────────────────────────
function ExportModal({customers,onClose}) {
  const [f,setF]=useState({status:'',priority:'',customer_id:'',from:'',to:''});
  const [exporting,setExporting]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function doExport() {
    setExporting(true);
    try {
      const params=new URLSearchParams();
      if(f.status)      params.set('status',f.status);
      if(f.priority)    params.set('priority',f.priority);
      if(f.customer_id) params.set('customer_id',f.customer_id);
      if(f.from)        params.set('from',f.from);
      if(f.to)          params.set('to',f.to);
      const token=localStorage.getItem('token');
      const baseURL=process.env.REACT_APP_API_URL||'http://localhost:3001';
      const response=await fetch(`${baseURL}/reports/export?${params}`,{headers:{Authorization:`Bearer ${token}`}});
      const blob=await response.blob();
      const url=window.URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download=`tickets-export-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch(e){alert('Export failed: '+e.message);} finally{setExporting(false);}
  }
  return (
    <Modal onClose={onClose} title="Export Tickets to CSV" width={440}>
      <div style={{fontSize:13,color:B.mid,marginBottom:16,lineHeight:1.7}}>Filter which tickets to export. Leave all blank to export everything.</div>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Status"><Sel value={f.status} onChange={set('status')}><option value=''>All statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</Sel></FG>
          <FG label="Priority"><Sel value={f.priority} onChange={set('priority')}><option value=''>All priorities</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></FG>
          <FG label="Date from"><Inp type="date" value={f.from} onChange={set('from')}/></FG>
          <FG label="Date to"><Inp type="date" value={f.to} onChange={set('to')}/></FG>
        </div>
        <FG label="Customer"><Sel value={f.customer_id} onChange={set('customer_id')}><option value=''>All customers</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
        <div style={{background:B.bg,borderRadius:8,padding:'10px 14px',fontSize:12,color:B.mid}}>Exports: Ticket number, subject, priority, status, category, channel, customer, agent, created date, updated date, description</div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={doExport} disabled={exporting}>{exporting?'Exporting…':'Download CSV'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]         = useState(null);
  const [page,setPage]         = useState('dashboard');
  const [tickets,setTickets]   = useState([]);
  const [agents,setAgents]     = useState([]);
  const [customers,setCustomers]= useState([]);
  const [categories,setCategories]= useState([]);
  const [slaData,setSlaData]   = useState([]);
  const [customerSLAs,setCustomerSLAs]= useState([]);
  const [globalSLAs,setGlobalSLAs]= useState([]);
  const [reports,setReports]   = useState({});
  const [kbArticles,setKbArticles]= useState([]);
  const [allUsers,setAllUsers] = useState([]);
  const [permissions,setPermissions]= useState([]);
  const [detail,setDetail]     = useState(null);
  const [creating,setCreating] = useState(false);
  const [exporting,setExporting]= useState(false);
  const [loading,setLoading]   = useState(false);
  const [filters,setFilters]   = useState({status:'',priority:'',category:'',customer_id:'',q:''});
  const [editUser,setEditUser] = useState(null);
  const [editCustomer,setEditCustomer]= useState(null);
  const [editKB,setEditKB]     = useState(null);
  const [editCustSLA,setEditCustSLA]= useState(null);
  const [helpTab,setHelpTab]   = useState('guide');
  const [kbSearch,setKbSearch] = useState('');

  useEffect(()=>{
    const tok=localStorage.getItem('token');
    if(tok){try{const p=JSON.parse(atob(tok.split('.')[1]));if(p.exp*1000>Date.now())setUser(p);else localStorage.removeItem('token');}catch{localStorage.removeItem('token');}}
  },[]);

  const loadTickets=useCallback(async()=>{
    setLoading(true);
    try{const params={};if(filters.status)params.status=filters.status;if(filters.priority)params.priority=filters.priority;if(filters.category)params.category=filters.category;if(filters.customer_id)params.customer_id=filters.customer_id;if(filters.q)params.q=filters.q;const{data}=await api.get('/tickets',{params});setTickets(data.data||[]);}
    catch{}finally{setLoading(false);}
  },[filters]);

  const loadAll=useCallback(async()=>{
    try{
      const[ag,cu,cats,sl]=await Promise.all([api.get('/users/agents'),api.get('/customers'),api.get('/admin/categories'),api.get('/sla')]);
      setAgents(ag.data.data||[]);
      setCustomers(cu.data.data||[]);
      setCategories((cats.data.data||[]).map(c=>c.name));
      setGlobalSLAs(sl.data.data||[]);
    }catch{}
  },[]);

  const loadReports=useCallback(async()=>{try{const[sum,byS,byP,byC,byD,byA,byCu]=await Promise.all([api.get('/reports/summary'),api.get('/reports/by-status'),api.get('/reports/by-priority'),api.get('/reports/by-category'),api.get('/reports/by-day'),api.get('/reports/by-agent'),api.get('/reports/by-customer')]);setReports({summary:sum.data.data,byStatus:byS.data.data,byPriority:byP.data.data,byCategory:byC.data.data,byDay:byD.data.data,byAgent:byA.data.data,byCustomer:byCu.data.data});}catch{}},[]);
  const loadSLA=useCallback(async()=>{try{const[st,cs]=await Promise.all([api.get('/sla/status'),api.get('/sla/customer')]);setSlaData(st.data.data||[]);setCustomerSLAs(cs.data.data||[]);}catch{}},[]);
  const loadKB=useCallback(async()=>{try{const{data}=await api.get('/kb',{params:kbSearch?{q:kbSearch}:{}});setKbArticles(data.data||[]);}catch{}},[kbSearch]);
  const loadUsers=useCallback(async()=>{try{const{data}=await api.get('/users');setAllUsers(data.data||[]);}catch{}},[]);
  const loadPerms=useCallback(async()=>{try{const{data}=await api.get('/admin/permissions');setPermissions(data.data||[]);}catch{}},[]);

  useEffect(()=>{if(user){loadTickets();loadAll();}},[user,loadTickets,loadAll]);
  useEffect(()=>{if(user&&page==='reports')loadReports();},[user,page,loadReports]);
  useEffect(()=>{if(user&&page==='sla')loadSLA();},[user,page,loadSLA]);
  useEffect(()=>{if(user&&page==='kb')loadKB();},[user,page,loadKB,kbSearch]);
  useEffect(()=>{if(user&&(page==='users'))loadUsers();},[user,page,loadUsers]);
  useEffect(()=>{if(user&&page==='admin'){loadUsers();loadPerms();}},[user,page,loadUsers,loadPerms]);

  function signOut(){localStorage.removeItem('token');setUser(null);setTickets([]);}

  if(!user) return <Login onLogin={u=>setUser(u)}/>;

  const isAdmin=user.role==='admin';
  const isSuperOrAdmin=['admin','supervisor'].includes(user.role);
  const active=tickets.filter(t=>!['Resolved','Closed'].includes(t.status));
  const urgent=active.filter(t=>t.priority==='Urgent');
  const escalated=active.filter(t=>t.status==='Escalated');
  const unassigned=active.filter(t=>!t.agent_id);
  const resolved=tickets.filter(t=>t.status==='Resolved');

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

  const getPermission=(role,perm)=>{
    const found=permissions.find(p=>p.role===role&&p.permission===perm);
    return found?found.allowed:false;
  };
  const togglePermission=async(role,perm,current)=>{
    await api.put('/admin/permissions',{role,permission:perm,allowed:!current});
    loadPerms();
  };

  async function saveSLAPolicy(priority,resp,res){
    try{await api.put(`/sla/${priority}`,{first_response_mins:Number(resp),resolution_mins:Number(res)});loadAll();alert(`SLA for ${priority} saved`);}catch(e){alert(e.response?.data?.error||'Failed');}
  }

  return (
    <div style={{fontFamily:'system-ui,sans-serif',fontSize:14,color:B.dark,height:'100vh',display:'flex',flexDirection:'column',background:B.bg}}>

      {/* Nav */}
      <div style={{height:52,background:B.navy,display:'flex',alignItems:'center',padding:'0 16px',gap:6,flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,.2)',overflowX:'auto'}}>
        <div style={{fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-0.5px',flexShrink:0,marginRight:10}}>Ticket<span style={{color:B.orange}}>Va</span></div>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{background:page===n.id?'rgba(255,255,255,.18)':'transparent',border:'none',color:page===n.id?'#fff':'rgba(255,255,255,.65)',padding:'5px 12px',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:page===n.id?600:400,display:'flex',alignItems:'center',gap:5,fontFamily:'inherit',flexShrink:0}}>
            {n.label}{!!n.count&&<span style={{background:n.urgent?B.orange:'rgba(255,255,255,.25)',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700}}>{n.count}</span>}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <button onClick={()=>setExporting(true)} style={{background:'rgba(255,255,255,.15)',border:'none',color:'rgba(255,255,255,.8)',padding:'5px 12px',borderRadius:6,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>⬇ Export</button>
          <button onClick={()=>setCreating(true)} style={{background:B.orange,color:'#fff',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ New Ticket</button>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <Avatar name={user.name} size={28}/>
            <div style={{display:'flex',flexDirection:'column'}}>
              <span style={{fontSize:11,fontWeight:600,color:'#fff'}}>{user.name}</span>
              <span style={{fontSize:10,color:'rgba(255,255,255,.5)',textTransform:'capitalize'}}>{user.role}</span>
            </div>
          </div>
          <button onClick={signOut} style={{background:'rgba(255,255,255,.1)',border:'none',color:'rgba(255,255,255,.7)',padding:'5px 10px',borderRadius:6,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>Sign out</button>
        </div>
      </div>

      <main style={{flex:1,overflow:'auto',padding:20}}>

        {/* DASHBOARD */}
        {page==='dashboard'&&<>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <div><div style={{fontSize:20,fontWeight:700,color:B.navy}}>Operations Dashboard</div><div style={{fontSize:12,color:B.light,marginTop:2}}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div>
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
            <Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By status</div><BarChart data={[...new Set(tickets.map(t=>t.status))].map(s=>({label:s,count:tickets.filter(t=>t.status===s).length}))} color={B.teal} height={90}/></Card>
            <Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By priority</div><BarChart data={PRIORITIES.map(p=>({label:p,count:tickets.filter(t=>t.priority===p).length}))} color={B.orange} height={90}/></Card>
          </div>
          <Card>
            <div style={{display:'flex',alignItems:'center',marginBottom:14}}><div style={{fontSize:13,fontWeight:700,color:B.navy}}>Recent tickets</div><button onClick={()=>setPage('tickets')} style={{marginLeft:'auto',background:'none',border:`1px solid ${B.border}`,padding:'5px 12px',borderRadius:6,cursor:'pointer',fontSize:12,color:B.teal}}>View all →</button></div>
            <TicketTable rows={[...tickets].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,8)} onOpen={setDetail} loading={loading}/>
          </Card>
        </>}

        {/* ALL TICKETS */}
        {page==='tickets'&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:14}}>All Tickets</div>
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <input style={{...inpS,width:200}} placeholder="Search…" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))}/>
            <select style={inpS} value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}><option value=''>All statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            <select style={inpS} value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}><option value=''>All priorities</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
            <select style={inpS} value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}><option value=''>All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select>
            <select style={inpS} value={filters.customer_id} onChange={e=>setFilters(f=>({...f,customer_id:e.target.value}))}><option value=''>All customers</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <Btn onClick={()=>setFilters({status:'',priority:'',category:'',customer_id:'',q:''})}>Clear</Btn>
            <span style={{marginLeft:'auto',fontSize:12,color:B.light}}>{tickets.length} tickets</span>
          </div>
          <TicketTable rows={tickets} onOpen={setDetail} loading={loading}/>
        </>}

        {/* MY TICKETS */}
        {page==='mine'&&<><div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:14}}>My Tickets</div><TicketTable rows={tickets.filter(t=>t.agent_id===user.id)} onOpen={setDetail} loading={loading}/></>}

        {/* SLA MONITOR */}
        {page==='sla'&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:14}}>SLA Monitor</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
            <MetricCard label="Breached (≥90%)" value={slaData.filter(t=>Number(t.sla_pct)>=90).length} color="#E53E3E"/>
            <MetricCard label="At risk (70–89%)" value={slaData.filter(t=>Number(t.sla_pct)>=70&&Number(t.sla_pct)<90).length} color="#D69E2E"/>
            <MetricCard label="On track (<70%)" value={slaData.filter(t=>Number(t.sla_pct)<70).length} color="#38A169"/>
          </div>
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:B.bg}}>{['Ticket','Subject','Customer','Priority','Agent','SLA','Status'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}</tr></thead>
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

        {/* REPORTS */}
        {page==='reports'&&<>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:700,color:B.navy}}>Reports & Analytics</div>
            <div style={{display:'flex',gap:8}}><Btn onClick={loadReports}>↻ Refresh</Btn><Btn variant="primary" onClick={()=>setExporting(true)}>⬇ Export CSV</Btn></div>
          </div>
          {reports.summary&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:12,marginBottom:20}}>
            <MetricCard label="Total" value={reports.summary.total} color={B.navy}/>
            <MetricCard label="Open" value={reports.summary.open} color={B.teal}/>
            <MetricCard label="Resolved" value={reports.summary.resolved} color="#38A169"/>
            <MetricCard label="Escalated" value={reports.summary.escalated} color={B.orange}/>
            <MetricCard label="Urgent open" value={reports.summary.urgent} color="#E53E3E"/>
          </div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {reports.byDay&&<Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Daily volume (30 days)</div><BarChart data={(reports.byDay||[]).map(d=>({label:d.day,count:Number(d.count)}))} color={B.teal} height={100}/></Card>}
            {reports.byCategory&&<Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By category</div><BarChart data={(reports.byCategory||[]).map(d=>({label:(d.category||'').split(' ')[0],count:Number(d.count)}))} color={B.orange} height={100}/></Card>}
            {reports.byStatus&&<Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By status</div><BarChart data={(reports.byStatus||[]).map(d=>({label:d.status,count:Number(d.count)}))} color={B.navy} height={100}/></Card>}
            {reports.byPriority&&<Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By priority</div><BarChart data={(reports.byPriority||[]).map(d=>({label:d.priority,count:Number(d.count)}))} color='#805AD5' height={100}/></Card>}
          </div>
          {reports.byAgent&&<Card style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Agent performance</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:B.bg}}>{['Agent','Total','Open','Resolved'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}</tr></thead>
              <tbody>{(reports.byAgent||[]).map(a=><tr key={a.id}><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={a.name} size={26}/>{a.name}</div></td><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontWeight:600}}>{a.total}</td><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:'#805AD5',fontWeight:600}}>{a.open}</td><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:'#38A169',fontWeight:600}}>{a.resolved}</td></tr>)}</tbody>
            </table>
          </Card>}
          {reports.byCustomer&&<Card>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By customer</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:B.bg}}>{['Customer','Total','Open'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}</tr></thead>
              <tbody>{(reports.byCustomer||[]).map(c=><tr key={c.id}><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`}}>{c.name}</td><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontWeight:600}}>{c.total}</td><td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:'#805AD5',fontWeight:600}}>{c.open}</td></tr>)}</tbody>
            </table>
          </Card>}
        </>}

        {/* KNOWLEDGE BASE */}
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
                <div style={{fontSize:14,fontWeight:600,color:B.navy,marginBottom:5}}>{a.title}</div>
                <div style={{fontSize:12,color:B.mid,lineHeight:1.6,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{a.content}</div>
                <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center'}}>
                  {a.category&&<span style={{fontSize:11,background:'#EBF8FF',color:'#1a6b8a',padding:'2px 8px',borderRadius:10}}>{a.category}</span>}
                  <span style={{fontSize:11,color:B.lighter}}>{a.views} views</span>
                  {!a.published&&<span style={{fontSize:11,background:'#FFFAF0',color:'#7B4E00',padding:'2px 8px',borderRadius:10}}>Draft</span>}
                </div>
              </Card>
            ))}
          </div>
        </>}

        {/* CUSTOMERS */}
        {page==='customers'&&isSuperOrAdmin&&<>
          <div style={{display:'flex',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:700,color:B.navy,flex:1}}>Customer Accounts</div>
            <Btn variant="primary" onClick={()=>setEditCustomer({})}>+ Add Customer</Btn>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
            {customers.map(c=>(
              <Card key={c.id}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <Avatar name={c.name} size={44}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:B.navy}}>{c.name}</div>
                    {c.industry&&<div style={{fontSize:11,color:B.light,marginTop:1}}>{c.industry}</div>}
                    <div style={{fontSize:12,color:B.light,marginTop:2}}>{c.contact_email||'—'}</div>
                    <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{fontSize:11,background:'#E6FFFA',color:'#1D6B5E',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{c.sla_tier}</span>
                      <span style={{fontSize:11,color:B.light}}>{c.ticket_count||0} tickets</span>
                      {c.account_manager&&<span style={{fontSize:11,color:B.light}}>AM: {c.account_manager}</span>}
                    </div>
                    <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                      {/* Admin only: edit and delete */}
                      {isAdmin&&<><Btn onClick={()=>setEditCustomer(c)} style={{fontSize:11,padding:'4px 10px'}}>Edit</Btn>
                      <Btn variant="danger" onClick={async()=>{if(window.confirm(`Permanently delete "${c.name}"? This cannot be undone.`)){await api.delete(`/customers/${c.id}`);loadAll();}}} style={{fontSize:11,padding:'4px 10px'}}>Delete</Btn></>}
                      <Btn onClick={()=>{setFilters(f=>({...f,customer_id:c.id}));setPage('tickets');}} style={{fontSize:11,padding:'4px 10px',color:B.teal}}>View tickets</Btn>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>}

        {/* USERS */}
        {page==='users'&&isAdmin&&<>
          <div style={{display:'flex',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:700,color:B.navy,flex:1}}>User Management</div>
            <Btn variant="primary" onClick={()=>setEditUser({})}>+ Create User</Btn>
          </div>
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
                <thead><tr style={{background:B.bg}}>{['User','Email','Company','Dept','Role','Status','Created','Actions'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {allUsers.map(u=>(
                    <tr key={u.id} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={u.name} size={30}/><span style={{fontWeight:500}}>{u.name}</span></div></td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid}}>{u.email}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid}}>{u.company_name||u.customer_org_name||'—'}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid}}>{u.department||'—'}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:u.role==='admin'?'#FFF5F5':u.role==='supervisor'?'#FAF5FF':'#EBF8FF',color:u.role==='admin'?'#9B2335':u.role==='supervisor'?'#553C9A':'#1a6b8a'}}>{u.role}</span></td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><span style={{fontSize:11,background:u.active?'#F0FFF4':'#FFF5F5',color:u.active?'#276749':'#9B2335',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{u.active?'Active':'Inactive'}</span></td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.light}}>{fmtD(u.created_at)}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                        <div style={{display:'flex',gap:5}}>
                          <Btn onClick={()=>setEditUser(u)} style={{fontSize:11,padding:'4px 10px'}}>Edit</Btn>
                          {u.id!==user.id&&<>
                            <Btn onClick={async()=>{await api.patch(`/users/${u.id}/deactivate`);loadUsers();}} style={{fontSize:11,padding:'4px 10px',color:'#D69E2E'}}>Deactivate</Btn>
                            <Btn variant="danger" onClick={async()=>{if(window.confirm(`Permanently delete user "${u.name}"? This cannot be undone.`)){await api.delete(`/users/${u.id}`);loadUsers();}}} style={{fontSize:11,padding:'4px 10px'}}>Delete</Btn>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>}

        {/* ADMIN */}
        {page==='admin'&&isAdmin&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:16}}>Admin Configuration</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {/* Global SLA */}
            <Card>
              <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:6}}>Global SLA Policies</div>
              <div style={{fontSize:12,color:B.light,marginBottom:14}}>Default SLA timers applied to all customers unless a customer-specific SLA overrides them.</div>
              {PRIORITIES.map(priority=>{
                const pol=globalSLAs.find(s=>s.priority===priority)||{first_response_mins:240,resolution_mins:1440};
                let resp=pol.first_response_mins, res=pol.resolution_mins;
                return (
                  <div key={priority} style={{borderBottom:`1px solid ${B.border}`,paddingBottom:12,marginBottom:12}}>
                    <div style={{marginBottom:8}}><PriBadge v={priority}/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <FG label="First response (mins)"><Inp type="number" defaultValue={pol.first_response_mins} onChange={e=>resp=e.target.value}/></FG>
                      <FG label="Resolution (mins)"><Inp type="number" defaultValue={pol.resolution_mins} onChange={e=>res=e.target.value}/></FG>
                    </div>
                    <Btn variant="primary" style={{fontSize:11,padding:'4px 14px'}} onClick={()=>saveSLAPolicy(priority,resp,res)}>Save</Btn>
                  </div>
                );
              })}
            </Card>

            {/* Ticket categories */}
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <Card>
                <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:14}}>Ticket Categories</div>
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
                  {categories.map((c,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:B.bg,borderRadius:8}}>
                      <span style={{fontSize:13}}>{c}</span>
                      <button onClick={async()=>{const{data}=await api.get('/admin/categories');const cat=data.data.find(x=>x.name===c);if(cat){await api.delete(`/admin/categories/${cat.id}`);loadAll();}}} style={{background:'none',border:'none',color:B.lighter,cursor:'pointer',fontSize:18}}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Inp id="new-cat" placeholder="New category name…" style={{flex:1}}/>
                  <Btn variant="primary" onClick={async()=>{const inp=document.getElementById('new-cat');if(!inp.value.trim())return;await api.post('/admin/categories',{name:inp.value.trim()});inp.value='';loadAll();}}>Add</Btn>
                </div>
              </Card>
            </div>
          </div>

          {/* Role permissions */}
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:6}}>Role Permissions</div>
            <div style={{fontSize:12,color:B.light,marginBottom:14}}>Toggle permissions for each role. Changes take effect immediately — no code changes required.</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
                <thead>
                  <tr style={{background:B.bg}}>
                    <th style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>Permission</th>
                    {ROLES.map(r=><th key={r} style={{padding:'9px 14px',textAlign:'center',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{r}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ALL_PERMISSIONS.map(perm=>(
                    <tr key={perm.key} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13}}>{perm.label}</td>
                      {ROLES.map(role=>{
                        const allowed=getPermission(role,perm.key);
                        return (
                          <td key={role} style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,textAlign:'center'}}>
                            <button onClick={()=>togglePermission(role,perm.key,allowed)}
                              style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',
                                background:allowed?'#38A169':'#EDF2F7',position:'relative',transition:'background .2s'}}>
                              <span style={{position:'absolute',top:3,left:allowed?22:3,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>}

        {/* HELP */}
        {page==='help'&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:16}}>Help & Support Guide</div>
          <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:`1px solid ${B.border}`}}>
            {[['guide','User Guide'],['workflow','Ticket Workflow'],['sla-ref','SLA Reference'],['roles','Roles & Access'],['faq','FAQ']].map(([t,l])=>(
              <button key={t} onClick={()=>setHelpTab(t)} style={{background:'none',border:'none',padding:'8px 16px',cursor:'pointer',fontSize:13,fontFamily:'inherit',color:helpTab===t?B.navy:B.light,fontWeight:helpTab===t?600:400,borderBottom:helpTab===t?`2px solid ${B.orange}`:'2px solid transparent'}}>{l}</button>
            ))}
          </div>

          {helpTab==='guide'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[
              {title:'Raising a ticket',steps:['Click "+ New Ticket" in the top bar','Fill in the Subject with a clear description','Select Priority based on business impact','Choose the correct Category','Select the Customer organisation','Add a detailed Description','Assign to an agent or leave for auto-routing','Click Create Ticket']},
              {title:'Managing tickets',steps:['Click any ticket row to open the detail panel','Change status using the Status dropdown','Reassign using the Agent dropdown','Edit priority, category or customer with the Edit button','Add a Public Reply for customer communication','Add an Internal Note for team discussion only','All changes are logged in the Audit Trail']},
              {title:'Exporting tickets',steps:['Click "⬇ Export" in the top navigation bar','Or go to Reports and click "⬇ Export CSV"','Apply filters: status, priority, date range, customer','Click "Download CSV" — file saves to your computer','Open in Excel, Google Sheets, or any spreadsheet tool','Use for reporting, audits, or data analysis']},
              {title:'SLA monitoring',steps:['Go to SLA Monitor in the navigation','Red bar (≥90%) = breach imminent or active','Amber bar (70–89%) = at risk, action needed','Green bar (<70%) = on track','SLA timers run from ticket creation time','Customer-specific SLAs override global defaults']},
            ].map(s=>(
              <Card key={s.title}>
                <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>{s.title}</div>
                <ol style={{paddingLeft:18,display:'flex',flexDirection:'column',gap:7}}>{s.steps.map((step,i)=><li key={i} style={{fontSize:13,color:B.mid,lineHeight:1.6}}>{step}</li>)}</ol>
              </Card>
            ))}
          </div>}

          {helpTab==='workflow'&&<>
            <Card style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:14}}>Ticket lifecycle flow diagram</div>
              <WorkflowDiagram/>
            </Card>
            <Card>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:14}}>Status descriptions</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  {s:'New',d:'Ticket just created. Not yet reviewed by an agent.',c:'#3182CE'},
                  {s:'Open',d:'Ticket acknowledged. Under initial review.',c:'#718096'},
                  {s:'Assigned',d:'Assigned to an agent. Work has not yet started.',c:'#38B2AC'},
                  {s:'In Progress',d:'Agent is actively working on the issue.',c:'#805AD5'},
                  {s:'Pending',d:'Waiting for customer response or third-party action.',c:'#D69E2E'},
                  {s:'On Hold',d:'Temporarily paused — planned maintenance or awaiting parts.',c:'#A0AEC0'},
                  {s:'Escalated',d:'Requires senior or management involvement.',c:'#FC8181'},
                  {s:'Resolved',d:'Issue fixed. Awaiting customer confirmation.',c:'#48BB78'},
                  {s:'Closed',d:'Confirmed resolved and archived.',c:'#CBD5E0'},
                ].map(({s,d,c})=>(
                  <div key={s} style={{display:'flex',gap:14,alignItems:'flex-start',padding:'10px 14px',background:B.bg,borderRadius:8,borderLeft:`4px solid ${c}`}}>
                    <StatusBadge v={s}/><div style={{fontSize:13,color:B.mid,lineHeight:1.6}}>{d}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>}

          {helpTab==='sla-ref'&&<>
            <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:16,fontWeight:700,color:B.navy,flex:1}}>SLA Policies</div>
              {isAdmin&&<Btn variant="primary" onClick={()=>setEditCustSLA({})}>+ Add Customer SLA</Btn>}
            </div>
            <Card style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Global SLA defaults</div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:B.bg}}>{['Priority','First response','Resolution','Use case'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {[
                    {p:'Urgent',resp:'1 hour',res:'4 hours',use:'Complete service outage, all users affected'},
                    {p:'High',resp:'4 hours',res:'24 hours',use:'Major degradation, significant user impact'},
                    {p:'Medium',resp:'8 hours',res:'3 days',use:'Partial issue, some users affected'},
                    {p:'Low',resp:'24 hours',res:'7 days',use:'Minor issue, enhancement request, query'},
                  ].map(r=>(
                    <tr key={r.p} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><PriBadge v={r.p}/></td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.teal,fontWeight:600}}>{r.resp}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.navy,fontWeight:600}}>{r.res}</td>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid}}>{r.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card>
              <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:B.navy,flex:1}}>Customer-specific SLAs</div>
                {isAdmin&&<Btn onClick={()=>setEditCustSLA({})} style={{fontSize:11,padding:'4px 12px'}}>+ Add</Btn>}
              </div>
              {customerSLAs.length===0&&<div style={{fontSize:13,color:B.light,padding:20,textAlign:'center'}}>No customer-specific SLAs defined. Global defaults apply to all customers.</div>}
              {customerSLAs.length>0&&<table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:B.bg}}>{['Customer','Priority','First response','Resolution','Notes',''].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}</tr></thead>
                <tbody>{customerSLAs.map(s=>(
                  <tr key={s.id} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontWeight:500}}>{s.customer_name}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><PriBadge v={s.priority}/></td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.teal,fontWeight:600}}>{Math.floor(s.first_response_mins/60)}h {s.first_response_mins%60>0?`${s.first_response_mins%60}m`:''}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.navy,fontWeight:600}}>{s.resolution_mins>=1440?`${Math.floor(s.resolution_mins/1440)}d`:`${Math.floor(s.resolution_mins/60)}h`}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.light}}>{s.notes||'—'}</td>
                    <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                      {isAdmin&&<Btn variant="danger" onClick={async()=>{if(window.confirm('Delete this SLA?')){await api.delete(`/sla/customer/${s.id}`);loadSLA();}}} style={{fontSize:11,padding:'4px 10px'}}>Delete</Btn>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>}
            </Card>
          </>}

          {helpTab==='roles'&&<>
            <Card style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:8}}>Role permissions matrix</div>
              <div style={{fontSize:12,color:B.light,marginBottom:14}}>This shows the current permissions as configured in Admin → Role Permissions. Admins can modify these live from the Admin panel without touching any code.</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:B.bg}}>
                    <th style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>Permission</th>
                    {ROLES.map(r=><th key={r} style={{padding:'9px 14px',textAlign:'center',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{r}</th>)}
                  </tr></thead>
                  <tbody>
                    {ALL_PERMISSIONS.map(perm=>(
                      <tr key={perm.key} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                        <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13}}>{perm.label}</td>
                        {ROLES.map(role=>{
                          const allowed=getPermission(role,perm.key);
                          return <td key={role} style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,textAlign:'center',fontSize:16,color:allowed?'#38A169':'#E2E8F0',fontWeight:700}}>{allowed?'✓':'—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isAdmin&&<div style={{marginTop:14,padding:'10px 14px',background:B.bg,borderRadius:8,fontSize:12,color:B.mid}}>To modify permissions, go to <button onClick={()=>setPage('admin')} style={{background:'none',border:'none',color:B.teal,cursor:'pointer',fontSize:12,fontFamily:'inherit',textDecoration:'underline'}}>Admin → Role Permissions</button> and toggle any permission on or off.</div>}
            </Card>
          </>}

          {helpTab==='faq'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {q:'How do I export ticket data?',a:'Click "⬇ Export" in the top navigation bar, or go to Reports and click "⬇ Export CSV". Apply filters if needed, then click Download CSV. The file opens in Excel or Google Sheets.'},
              {q:'How do I add a customer-specific SLA?',a:'Go to Help → SLA Reference → click "+ Add Customer SLA". Select the customer, priority level, and set your first response and resolution times in minutes. You can add multiple SLAs for the same customer covering different priority levels.'},
              {q:'How do I reset a user\'s password?',a:'Go to Users → click Edit on the user → enter a new password in the password field → click Save. The user can log in immediately with the new password.'},
              {q:'How do I permanently delete a user?',a:'Go to Users → click Delete next to the user → confirm the prompt. This permanently removes the user. Their past ticket actions remain in the audit trail but the agent field on tickets is cleared.'},
              {q:'How do I modify role permissions?',a:'Go to Admin → Role Permissions. Toggle any permission on or off for any role. Changes take effect immediately with no code changes or redeployment needed.'},
              {q:'How do I add new ticket categories?',a:'Go to Admin → Ticket Categories → type a new category name → click Add. It appears in the ticket creation form immediately.'},
              {q:'What is the difference between Deactivate and Delete for users?',a:'Deactivate prevents login but keeps the user record and their history intact. Useful for temporary suspension. Delete permanently removes the user from the system. Deactivated users can be reactivated by editing them.'},
              {q:'How do I update the tool with zero downtime?',a:'Push code changes to GitHub. Railway (backend) and Vercel (frontend) both use rolling deployments — the new version starts before the old one stops. There is no service interruption during updates.'},
            ].map(({q,a})=>(
              <Card key={q}><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:8}}>{q}</div><div style={{fontSize:13,color:B.mid,lineHeight:1.7}}>{a}</div></Card>
            ))}
          </div>}
        </>}

      </main>

      {/* Modals */}
      {detail&&<TicketDetail id={detail} agents={agents} categories={categories} customers={customers} onClose={()=>{setDetail(null);loadTickets();}}/>}
      {creating&&<CreateModal agents={agents} categories={categories} customers={customers} onClose={()=>setCreating(false)} onCreated={loadTickets}/>}
      {exporting&&<ExportModal customers={customers} onClose={()=>setExporting(false)}/>}
      {editUser!==null&&<UserModal user={editUser.id?editUser:null} customers={customers} onClose={()=>setEditUser(null)} onSaved={loadUsers}/>}
      {editCustomer!==null&&<CustomerModal customer={editCustomer.id?editCustomer:null} onClose={()=>setEditCustomer(null)} onSaved={()=>{loadAll();}}/>}
      {editKB!==null&&<KBModal article={editKB.id?editKB:null} categories={categories} onClose={()=>setEditKB(null)} onSaved={loadKB}/>}
      {editCustSLA!==null&&<CustomerSLAModal sla={editCustSLA.id?editCustSLA:null} customers={customers} onClose={()=>setEditCustSLA(null)} onSaved={loadSLA}/>}
    </div>
  );
}
