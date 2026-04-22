import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from './services/api';

// ── Brand ─────────────────────────────────────────────────────────
const B = {
  navy:'#0F4761', teal:'#156082', orange:'#EA8B00',
  bg:'#f4f6f9', white:'#fff', border:'#e2e8f0',
  dark:'#1a2332', mid:'#4a5568', light:'#718096', lighter:'#a0aec0',
  success:'#276749', danger:'#9B2335', warning:'#7B4E00',
  successBg:'#F0FFF4', dangerBg:'#FFF5F5', warningBg:'#FFFAF0'
};

// ── Workflow valid transitions (Point 6) ──────────────────────────
const VALID_TRANSITIONS = {
  'New':['Open','Assigned','Closed'],
  'Open':['Assigned','Pending','Escalated','Closed'],
  'Assigned':['In Progress','Pending','On Hold','Escalated','Closed'],
  'In Progress':['Pending','On Hold','Escalated','Resolved'],
  'Pending':['In Progress','Escalated','Closed'],
  'On Hold':['In Progress','Escalated'],
  'Escalated':['In Progress','Resolved'],
  'Resolved':['Closed','Reopened'],
  'Closed':['Reopened'],
  'Reopened':['Open','Assigned']
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
  Reopened:{bg:'#FAECE7',c:'#712B13',dot:'#D85A30'}
};
const PRI_CFG = {
  Low:{bg:'#F7FAFC',c:'#4A5568',bd:'#CBD5E0'},
  Medium:{bg:'#FFFAF0',c:'#7B4E00',bd:'#F6E05E'},
  High:{bg:'#FFF5F5',c:'#9B2335',bd:'#FEB2B2'},
  Urgent:{bg:'#E53E3E',c:'#fff',bd:'#C53030'}
};

const ROLES=['admin','supervisor','agent','customer'];
const PRIORITIES=['Low','Medium','High','Urgent'];
const CHANNELS=['Web Portal','Email','API','Phone','Chat'];
const SLA_TIERS=['Standard','Premium','Enterprise','Custom'];
const RETENTION_OPTIONS=[30,60,90,180,365];
const ALL_PERMS=[
  {key:'raise_tickets',label:'Raise tickets'},
  {key:'view_all_tickets',label:'View all tickets'},
  {key:'change_status',label:'Change ticket status'},
  {key:'assign_tickets',label:'Assign tickets'},
  {key:'internal_notes',label:'Add internal notes'},
  {key:'manage_users',label:'Manage users'},
  {key:'manage_customers',label:'Manage customers'},
  {key:'configure_sla',label:'Configure SLA'},
  {key:'admin_panel',label:'Access admin panel'},
  {key:'export_tickets',label:'Export tickets'},
  {key:'kb_articles',label:'Create KB articles'},
  {key:'trigger_csat',label:'Trigger CSAT survey'},
  {key:'manage_attachments',label:'Manage attachments'},
  {key:'configure_retention',label:'Configure retention (admin only)'}
];

// ── Utils ─────────────────────────────────────────────────────────
const fmtDT=d=>d?new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const fmtD=d=>d?new Date(d).toLocaleDateString('en-GB'):'—';
const ago=d=>{if(!d)return'—';const m=Math.floor((Date.now()-new Date(d))/60000);if(m<1)return'just now';if(m<60)return`${m}m ago`;if(m<1440)return`${Math.floor(m/60)}h ago`;return`${Math.floor(m/1440)}d ago`;};
const slaColor=pct=>pct>=100?'#9B2335':pct>=90?'#E53E3E':pct>=70?'#D69E2E':'#38A169';
const slaBg=pct=>pct>=100?'#FFF5F5':pct>=90?'#FFF5F5':pct>=70?'#FFFAF0':'#F0FFF4';
const fmt={mins:m=>{if(!m||m<=0)return'0m';const h=Math.floor(m/60);const mn=Math.round(m%60);if(h>24)return`${Math.floor(h/24)}d ${h%24}h`;return h>0?`${h}h ${mn}m`:`${mn}m`;},pct:v=>`${Math.round(Number(v)||0)}%`};
const fileIcon=t=>{if(!t)return'📎';if(t.includes('pdf'))return'📄';if(t.includes('image'))return'🖼';if(t.includes('word')||t.includes('document'))return'📝';if(t.includes('sheet')||t.includes('excel'))return'📊';if(t.includes('presentation')||t.includes('powerpoint'))return'📑';return'📎';};

// ── Base UI ───────────────────────────────────────────────────────
const StatusBadge=({v})=>{const c=STATUS_CFG[v]||STATUS_CFG.Open;return<span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:c.bg,color:c.c}}><span style={{width:6,height:6,borderRadius:'50%',background:c.dot,flexShrink:0}}/>{v||'—'}</span>;};
const PriBadge=({v})=>{const c=PRI_CFG[v]||PRI_CFG.Medium;return<span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:c.bg,color:c.c,border:`1px solid ${c.bd}`}}>{v||'—'}</span>;};
const Avatar=({name,size=30})=>{const initials=name?name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2):'?';const cols=[B.navy,B.teal,B.orange,'#553C9A','#276749','#9B2335'];return<div style={{width:size,height:size,borderRadius:'50%',background:cols[(name?.charCodeAt(0)||0)%cols.length],display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:size*.35,fontWeight:700,flexShrink:0}}>{initials}</div>;};
const Inp=({style,...p})=><input style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'8px 12px',fontSize:13,fontFamily:'inherit',background:B.white,width:'100%',boxSizing:'border-box',outline:'none',...style}}{...p}/>;
const Sel=({style,...p})=><select style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'7px 10px',fontSize:13,fontFamily:'inherit',background:B.white,cursor:'pointer',...style}}{...p}/>;
const Btn=({variant='secondary',style,...p})=><button style={{border:variant==='primary'?'none':variant==='danger'?`1px solid #FEB2B2`:`1px solid ${B.border}`,background:variant==='primary'?B.navy:variant==='danger'?'#FFF5F5':variant==='warning'?B.warningBg:B.white,color:variant==='primary'?'#fff':variant==='danger'?'#9B2335':variant==='warning'?'#7B4E00':B.mid,padding:'7px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:variant==='primary'?600:400,fontFamily:'inherit',...style}}{...p}/>;
const Card=({style,...p})=><div style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:10,padding:16,...style}}{...p}/>;
const FG=({label,children,style})=><div style={{display:'flex',flexDirection:'column',gap:5,...style}}><label style={{fontSize:12,fontWeight:600,color:B.mid}}>{label}</label>{children}</div>;
const SLABar=({pct,showLabel=true})=>{const p=Math.min(Number(pct)||0,100);const col=slaColor(p);return<div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:70,height:6,background:'#EDF2F7',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${p}%`,background:col,borderRadius:3,transition:'width .3s'}}/></div>{showLabel&&<span style={{fontSize:11,color:col,fontWeight:600,minWidth:32}}>{Math.round(p)}%</span>}</div>;};
const MetricCard=({label,value,color,sub,onClick,suffix=''})=><div onClick={onClick} style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:10,padding:'14px 16px',cursor:onClick?'pointer':'default',borderTop:`3px solid ${color||B.navy}`}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.1)';}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';}}><div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:'.5px'}}>{label}</div><div style={{fontSize:24,fontWeight:700,color:color||B.dark}}>{value??'—'}{suffix}</div>{sub&&<div style={{fontSize:11,color:B.light,marginTop:3}}>{sub}</div>}</div>;

const Modal=({onClose,title,children,width=480})=>(
  <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(15,71,97,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
    <div style={{background:B.white,borderRadius:14,padding:28,width,maxWidth:'95vw',boxShadow:'0 20px 60px rgba(0,0,0,.25)',maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
        <div style={{width:4,height:22,background:B.orange,borderRadius:2,marginRight:12}}/>
        <div style={{fontSize:15,fontWeight:700,color:B.navy,flex:1}}>{title}</div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:B.light,lineHeight:1}}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const BarChart=({data,color,height=80})=>{
  const max=Math.max(...(data||[]).map(d=>Number(d.count||d.v||d.total||0)),1);
  return<div style={{display:'flex',alignItems:'flex-end',gap:5,height,padding:'4px 0 0'}}>
    {(data||[]).map((d,i)=>{const v=Number(d.count||d.v||d.total||0);return<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
      <div style={{fontSize:10,color:B.light}}>{v||''}</div>
      <div style={{width:'100%',height:Math.max((v/max)*(height-18),2),background:color||B.navy,borderRadius:'3px 3px 0 0',opacity:.85}}/>
      <div style={{fontSize:10,color:B.light,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%',textAlign:'center'}}>{d.label||d.l||d.status||d.priority||d.category||d.name||''}</div>
    </div>;})}
  </div>;
};

// ── Enterprise Flow Diagram (Point 6) ────────────────────────────
const WorkflowDiagram=()=>(
  <div style={{overflowX:'auto',background:B.bg,borderRadius:10,padding:16}}>
    <svg width="780" height="480" viewBox="0 0 780 480" style={{minWidth:700,display:'block',margin:'0 auto'}}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#64748b"/>
        </marker>
        <marker id="arrowred" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#E53E3E"/>
        </marker>
        <marker id="arrowgreen" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#38A169"/>
        </marker>
      </defs>

      {/* Row 1: New → Open → Assigned → In Progress */}
      {[['New',30,40,'#EBF8FF','#3182CE'],['Open',175,40,'#EDF2F7','#718096'],['Assigned',320,40,'#E6FFFA','#38B2AC'],['In Progress',465,40,'#FAF5FF','#805AD5']].map(([label,x,y,bg,border])=>(
        <g key={label}>
          <rect x={x} y={y} width={110} height={38} rx={8} fill={bg} stroke={border} strokeWidth={2}/>
          <text x={x+55} y={y+24} textAnchor="middle" fontSize={12} fontWeight={600} fill={border}>{label}</text>
        </g>
      ))}
      {/* Row 1 arrows */}
      <line x1={140} y1={59} x2={175} y2={59} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arrowhead)"/>
      <line x1={285} y1={59} x2={320} y2={59} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arrowhead)"/>
      <line x1={430} y1={59} x2={465} y2={59} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arrowhead)"/>

      {/* Row 2: Pending / On Hold / Escalated */}
      {[['Pending',80,160,'#FFFAF0','#D69E2E'],['On Hold',255,160,'#F7FAFC','#A0AEC0'],['Escalated',430,160,'#FFF5F5','#FC8181']].map(([label,x,y,bg,border])=>(
        <g key={label}>
          <rect x={x} y={y} width={110} height={38} rx={8} fill={bg} stroke={border} strokeWidth={2}/>
          <text x={x+55} y={y+24} textAnchor="middle" fontSize={12} fontWeight={600} fill={border}>{label}</text>
        </g>
      ))}

      {/* In Progress → Pending */}
      <path d="M 520 78 Q 520 130 190 130 Q 135 130 135 160" fill="none" stroke="#64748b" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arrowhead)"/>
      {/* In Progress → On Hold */}
      <path d="M 520 78 Q 520 130 310 130 Q 310 160 310 160" fill="none" stroke="#64748b" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arrowhead)"/>
      {/* In Progress → Escalated */}
      <path d="M 575 78 L 575 130 L 485 130 L 485 160" fill="none" stroke="#E53E3E" strokeWidth={1.5} markerEnd="url(#arrowred)"/>
      {/* Pending → In Progress (back) */}
      <path d="M 190 160 Q 190 120 430 120 Q 490 120 490 78" fill="none" stroke="#805AD5" strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#arrowhead)"/>
      {/* On Hold → In Progress */}
      <path d="M 310 160 Q 310 120 490 120" fill="none" stroke="#A0AEC0" strokeWidth={1} strokeDasharray="4,3"/>
      {/* Assigned → Escalated */}
      <path d="M 375 78 Q 375 110 485 110 L 485 160" fill="none" stroke="#E53E3E" strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#arrowred)"/>

      {/* Row 3: Resolved */}
      <rect x={310} y={270} width={120} height={40} rx={8} fill="#F0FFF4" stroke="#48BB78" strokeWidth={2.5}/>
      <text x={370} y={295} textAnchor="middle" fontSize={13} fontWeight={700} fill="#276749">Resolved</text>

      {/* In Progress → Resolved */}
      <line x1={520} y1={78} x2={630} y2={78} stroke="#38A169" strokeWidth={1.5}/>
      <line x1={630} y1={78} x2={630} y2={290} stroke="#38A169" strokeWidth={1.5}/>
      <line x1={630} y1={290} x2={430} y2={290} stroke="#38A169" strokeWidth={1.5} markerEnd="url(#arrowgreen)"/>
      {/* Escalated → Resolved */}
      <path d="M 485 198 L 485 240 L 370 240 L 370 270" fill="none" stroke="#38A169" strokeWidth={1.5} markerEnd="url(#arrowgreen)"/>
      {/* Pending → Closed direct */}
      <path d="M 80 198 L 80 360 L 200 360" fill="none" stroke="#64748b" strokeWidth={1} strokeDasharray="5,3" markerEnd="url(#arrowhead)"/>

      {/* Row 4: Closed / Reopened */}
      <rect x={150} y={340} width={110} height={38} rx={8} fill="#F7FAFC" stroke="#CBD5E0" strokeWidth={2}/>
      <text x={205} y={364} textAnchor="middle" fontSize={12} fontWeight={600} fill="#718096">Closed</text>
      <rect x={430} y={340} width={110} height={38} rx={8} fill="#FAECE7" stroke="#D85A30" strokeWidth={2}/>
      <text x={485} y={364} textAnchor="middle" fontSize={12} fontWeight={600} fill="#712B13">Reopened</text>

      {/* Resolved → Closed */}
      <path d="M 370 310 L 370 330 L 205 330 L 205 340" fill="none" stroke="#718096" strokeWidth={1.5} markerEnd="url(#arrowhead)"/>
      {/* Resolved → Reopened */}
      <path d="M 370 310 L 370 330 L 485 330 L 485 340" fill="none" stroke="#D85A30" strokeWidth={1.5} markerEnd="url(#arrowred)"/>
      {/* Closed → Reopened */}
      <path d="M 260 359 L 430 359" fill="none" stroke="#D85A30" strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#arrowred)"/>
      {/* Reopened → Open */}
      <path d="M 485 340 L 485 310 L 680 310 L 680 50 L 285 50" fill="none" stroke="#D85A30" strokeWidth={1} strokeDasharray="5,3" markerEnd="url(#arrowred)"/>

      {/* New → Assigned direct */}
      <path d="M 85 40 L 85 20 L 375 20 L 375 40" fill="none" stroke="#64748b" strokeWidth={1} strokeDasharray="3,3"/>

      {/* Legend */}
      <rect x={10} y={420} width={760} height={55} rx={6} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1}/>
      <text x={25} y={440} fontSize={11} fontWeight={600} fill={B.mid}>Legend:</text>
      <line x1={80} y1={436} x2={110} y2={436} stroke="#64748b" strokeWidth={2}/>
      <text x={115} y={440} fontSize={10} fill={B.mid}>Normal flow</text>
      <line x1={195} y1={436} x2={225} y2={436} stroke="#64748b" strokeWidth={1.5} strokeDasharray="5,3"/>
      <text x={230} y={440} fontSize={10} fill={B.mid}>Optional path</text>
      <line x1={325} y1={436} x2={355} y2={436} stroke="#38A169" strokeWidth={2}/>
      <text x={360} y={440} fontSize={10} fill={B.mid}>Resolution path</text>
      <line x1={455} y1={436} x2={485} y2={436} stroke="#E53E3E" strokeWidth={2}/>
      <text x={490} y={440} fontSize={10} fill={B.mid}>Escalation / Reopen</text>
      <text x={25} y={465} fontSize={10} fill="#9B2335" fontWeight={600}>Invalid transitions blocked: Open→New, In Progress→Open, Resolved→In Progress, Closed→New (and all other unlisted transitions)</text>
    </svg>
  </div>
);

// ── SLA Stage Timeline (Point 1) ──────────────────────────────────
const SLATimeline=({stageLog,priority})=>{
  if(!stageLog||stageLog.length===0) return<div style={{color:B.light,fontSize:13,textAlign:'center',padding:20}}>No stage data yet</div>;
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {stageLog.map((s,i)=>{
        const dur=Number(s.duration_mins)||0;
        const max=Number(s.configured_max_mins||s.sla_max_mins)||0;
        const pct=max>0?Math.min((dur/max)*100,100):0;
        const isCurrent=!s.exited_at;
        const col=s.breached?'#E53E3E':pct>=70?'#D69E2E':'#38A169';
        return(
          <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:isCurrent?B.navy:s.breached?'#E53E3E':'#38A169',marginTop:4}}/>
              {i<stageLog.length-1&&<div style={{width:1,height:30,background:B.border,marginTop:2}}/>}
            </div>
            <div style={{flex:1,background:B.bg,borderRadius:8,padding:'10px 12px',border:isCurrent?`2px solid ${B.navy}`:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <StatusBadge v={s.stage}/>
                  {isCurrent&&<span style={{fontSize:10,background:B.navy,color:'#fff',padding:'1px 6px',borderRadius:8,fontWeight:600}}>CURRENT</span>}
                  {s.breached&&<span style={{fontSize:10,background:'#FFF5F5',color:'#E53E3E',padding:'1px 6px',borderRadius:8,fontWeight:600,border:'1px solid #FEB2B2'}}>BREACHED</span>}
                </div>
                <div style={{fontSize:12,color:B.light,textAlign:'right'}}>
                  <div style={{fontWeight:600,color:B.dark}}>{fmt.mins(dur)}</div>
                  {max>0&&<div style={{fontSize:10}}>limit: {fmt.mins(max)}</div>}
                </div>
              </div>
              {max>0&&<SLABar pct={pct}/>}
              <div style={{fontSize:11,color:B.lighter,marginTop:4}}>
                {fmtDT(s.entered_at)}{s.exited_at?` → ${fmtDT(s.exited_at)}`:'  → now'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── CSAT Pop-up (Point 3) ─────────────────────────────────────────
const CSATPopup=({survey,onSubmit,onDismiss})=>(
  <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(15,71,97,.7)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div style={{background:B.white,borderRadius:16,padding:36,width:440,maxWidth:'95vw',boxShadow:'0 24px 80px rgba(0,0,0,.35)',textAlign:'center'}}>
      <div style={{fontSize:36,marginBottom:12}}>💬</div>
      <div style={{fontSize:18,fontWeight:700,color:B.navy,marginBottom:8}}>How did we do?</div>
      <div style={{fontSize:13,color:B.mid,marginBottom:6}}>Ticket <strong>{survey.ticket_number}</strong></div>
      <div style={{fontSize:13,color:B.mid,marginBottom:24,lineHeight:1.6}}>{survey.subject}</div>
      <div style={{fontSize:12,color:B.light,marginBottom:16}}>Your feedback helps us improve our service</div>
      <div style={{display:'flex',gap:16,justifyContent:'center',marginBottom:20}}>
        <button onClick={()=>onSubmit(survey.id,10)}
          style={{background:'#F0FFF4',border:'2px solid #48BB78',borderRadius:12,padding:'16px 28px',cursor:'pointer',fontSize:28,transition:'transform .1s'}}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          👍
          <div style={{fontSize:11,color:'#276749',fontWeight:600,marginTop:4}}>Great (10/10)</div>
        </button>
        <button onClick={()=>onSubmit(survey.id,5)}
          style={{background:'#FFF5F5',border:'2px solid #FC8181',borderRadius:12,padding:'16px 28px',cursor:'pointer',fontSize:28,transition:'transform .1s'}}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          👎
          <div style={{fontSize:11,color:'#9B2335',fontWeight:600,marginTop:4}}>Needs work (5/10)</div>
        </button>
      </div>
      <button onClick={()=>onDismiss(survey.id)} style={{background:'none',border:'none',color:B.lighter,fontSize:12,cursor:'pointer',textDecoration:'underline'}}>
        Skip for now
      </button>
    </div>
  </div>
);

// ── Breach Alert Banner (Point 9) ─────────────────────────────────
const BreachBanner=({alerts,onDismiss,onDismissAll,onOpenTicket})=>{
  if(!alerts||alerts.length===0)return null;
  return(
    <div style={{background:'#FFF5F5',borderBottom:'2px solid #E53E3E',padding:'10px 20px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,flex:1,flexWrap:'wrap'}}>
        <span style={{fontSize:16}}>🚨</span>
        <span style={{fontSize:13,fontWeight:700,color:'#9B2335'}}>SLA BREACH ALERT</span>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {alerts.slice(0,3).map(a=>(
            <button key={a.id} onClick={()=>onOpenTicket(a.ticket_id)}
              style={{background:'#E53E3E',color:'#fff',border:'none',borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer',fontWeight:600}}>
              {a.ticket_number} — {a.subject?.slice(0,30)}{a.subject?.length>30?'…':''}
            </button>
          ))}
          {alerts.length>3&&<span style={{fontSize:12,color:'#9B2335',fontWeight:600}}>+{alerts.length-3} more</span>}
        </div>
      </div>
      <div style={{display:'flex',gap:8}}>
        {alerts.slice(0,1).map(a=>(
          <button key={a.id} onClick={()=>onDismiss(a.id)} style={{background:'none',border:'1px solid #E53E3E',color:'#9B2335',borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>Dismiss</button>
        ))}
        <button onClick={onDismissAll} style={{background:'none',border:'1px solid #E53E3E',color:'#9B2335',borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>Dismiss all</button>
      </div>
    </div>
  );
};

// ── Login ─────────────────────────────────────────────────────────
function Login({onLogin}){
  const [e,setE]=useState('');const [p,setP]=useState('');const [err,setErr]=useState('');const [load,setLoad]=useState(false);
  async function submit(ev){
    ev.preventDefault();setLoad(true);setErr('');
    try{const{data}=await api.post('/auth/login',{email:e,password:p});localStorage.setItem('token',data.token);onLogin(data);}
    catch(er){setErr(er.response?.data?.error||'Login failed');}finally{setLoad(false);}
  }
  return(
    <div style={{minHeight:'100vh',background:`linear-gradient(135deg,${B.navy} 0%,${B.teal} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:B.white,borderRadius:16,padding:40,width:400,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:32,fontWeight:800,color:B.navy,letterSpacing:'-1px'}}>Ticket<span style={{color:B.orange}}>Va</span></div>
          <div style={{fontSize:13,color:B.light,marginTop:4}}>Support Management Platform</div>
        </div>
        {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9B2335',marginBottom:16}}>{err}</div>}
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
          <FG label="Email address"><Inp type="email" value={e} onChange={ev=>setE(ev.target.value)} placeholder="your@email.com" autoFocus/></FG>
          <FG label="Password"><Inp type="password" value={p} onChange={ev=>setP(ev.target.value)} placeholder="Enter your password"/></FG>
          <Btn variant="primary" style={{padding:12,fontSize:14,marginTop:4}}>{load?'Signing in…':'Sign in →'}</Btn>
        </form>
        <div style={{marginTop:20,background:B.bg,borderRadius:8,padding:'10px 14px',fontSize:12,color:B.light,textAlign:'center'}}>Contact your administrator for login credentials</div>
      </div>
    </div>
  );
}

// ── Attachment Panel (Point 7) ────────────────────────────────────
function AttachmentPanel({ticketId,attachments,onRefresh,canManage}){
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef();

  async function handleUpload(e){
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>10*1024*1024){alert('File too large (max 10MB)');return;}
    setUploading(true);
    try{
      const reader=new FileReader();
      reader.onload=async ev=>{
        const base64=ev.target.result.split(',')[1];
        await api.post(`/attachments/${ticketId}`,{fileName:file.name,fileType:file.type,fileSize:file.size,fileData:base64});
        onRefresh();
      };
      reader.readAsDataURL(file);
    }catch(err){alert(err.response?.data?.error||'Upload failed');}
    finally{setUploading(false);}
  }

  async function handleDownload(att){
    try{
      const{data}=await api.get(`/attachments/${att.id}/url`);
      window.open(data.url,'_blank');
    }catch{alert('Download failed');}
  }

  async function handleDelete(att){
    if(!window.confirm(`Delete "${att.file_name}"? This cannot be undone.`))return;
    try{await api.delete(`/attachments/${att.id}`);onRefresh();}
    catch(err){alert(err.response?.data?.error||'Delete failed');}
  }

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:700,color:B.navy}}>Attachments ({attachments.length}/5)</div>
        {canManage&&attachments.length<5&&(
          <label style={{background:B.navy,color:'#fff',padding:'5px 12px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer'}}>
            {uploading?'Uploading…':'+ Add file'}
            <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleUpload} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.zip"/>
          </label>
        )}
      </div>
      {attachments.length===0&&<div style={{fontSize:12,color:B.light,padding:'12px 0'}}>No attachments yet. Supported: PDF, Word, Excel, PowerPoint, images (max 10MB, 5 files)</div>}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {attachments.map(a=>(
          <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:B.bg,borderRadius:8,border:`1px solid ${B.border}`}}>
            <span style={{fontSize:20}}>{fileIcon(a.file_type)}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:B.dark,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.file_name}</div>
              <div style={{fontSize:10,color:B.light}}>
                {a.file_size?`${Math.round(a.file_size/1024)}KB · `:''}
                {fmtDT(a.uploaded_at)}
                {a.delete_after&&<span style={{color:B.warning}}> · Deletes {fmtD(a.delete_after)}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>handleDownload(a)} style={{background:B.teal,color:'#fff',border:'none',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer'}}>⬇</button>
              {canManage&&<button onClick={()=>handleDelete(a)} style={{background:'#FFF5F5',color:'#9B2335',border:'1px solid #FEB2B2',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer'}}>✕</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ticket Detail Panel ───────────────────────────────────────────
function TicketDetail({id,onClose,agents,categories,customers,currentUser,onRefreshAll}){
  const [ticket,setTicket]=useState(null);
  const [reply,setReply]=useState('');
  const [rtype,setRtype]=useState('public');
  const [sending,setSending]=useState(false);
  const [editing,setEditing]=useState(false);
  const [ef,setEf]=useState({});
  const [tab,setTab]=useState('thread');
  const [rcaLoading,setRcaLoading]=useState(false);
  const [rca,setRca]=useState(null);
  const [kbConverting,setKbConverting]=useState(false);
  const [statusErr,setStatusErr]=useState('');
  const [validNext,setValidNext]=useState([]);

  const load=useCallback(async()=>{
    try{
      const[td,vt]=await Promise.all([
        api.get(`/tickets/${id}`),
        api.get(`/tickets/${id}/valid-transitions`)
      ]);
      setTicket(td.data.data);
      setEf(td.data.data);
      setValidNext(vt.data.validNext||[]);
    }catch{onClose();}
  },[id,onClose]);

  useEffect(()=>{load();},[load]);

  async function changeStatus(status){
    setStatusErr('');
    try{await api.post(`/tickets/${id}/status`,{status});load();onRefreshAll();}
    catch(err){setStatusErr(err.response?.data?.error||'Transition not allowed');}
  }
  async function reassign(agent_id){await api.post(`/tickets/${id}/assign`,{agent_id});load();}
  async function saveEdit(){await api.put(`/tickets/${id}`,{priority:ef.priority,category:ef.category,customer_org_id:ef.customer_org_id});setEditing(false);load();}
  async function sendReply(){if(!reply.trim())return;setSending(true);try{await api.post(`/tickets/${id}/comments`,{content:reply,type:rtype});setReply('');load();}finally{setSending(false);}}
  async function triggerCSAT(){try{await api.post(`/csat/trigger/${id}`);alert('CSAT survey sent to customer. They will see it on next login.');}catch(err){alert(err.response?.data?.error||'Failed');}}
  async function generateRCA(){setRcaLoading(true);try{const{data}=await api.post(`/ai/rca/${id}`);setRca(data.data.rca);setTab('rca');}catch{alert('RCA generation failed');}finally{setRcaLoading(false);}}
  async function convertToKB(){setKbConverting(true);try{const{data}=await api.post(`/ai/to-kb/${id}`);alert(`KB article created as draft: "${data.data.title}". Go to Knowledge Base to review and publish.`);}catch(err){alert(err.response?.data?.error||'Failed');}finally{setKbConverting(false);}}

  const canManageAtt=['admin','supervisor','agent'].includes(currentUser.role);
  const canTriggerCSAT=['admin','supervisor'].includes(currentUser.role);
  const isResolved=['Resolved','Closed'].includes(ticket?.status);

  return(
    <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(15,71,97,.4)',zIndex:100,display:'flex',justifyContent:'flex-end'}} onClick={onClose}>
      <div style={{width:620,height:'100%',background:B.white,overflowY:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>

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
            {Number(ticket.sla_pct)>=90&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:11,background:'#E53E3E',color:'#fff',fontWeight:700}}>🚨 SLA {Number(ticket.sla_pct)>=100?'BREACHED':Math.round(ticket.sla_pct)+'%'}</span>}
          </div>}
        </div>

        {!ticket?<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:B.light}}>Loading…</div>
        :<div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>

          {/* Meta grid */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[['Customer',ticket.customer_name||'—'],['Organisation',ticket.customer_org||'—'],['Created',fmtDT(ticket.created_at)],['Updated',ago(ticket.updated_at)]].map(([l,v])=>(
              <div key={l} style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}>
                <div style={{fontSize:11,color:B.light,marginBottom:3,fontWeight:500}}>{l}</div>
                <div style={{fontSize:13,fontWeight:600,color:B.dark}}>{v}</div>
              </div>
            ))}

            {/* Status — only show valid next transitions (Point 6) */}
            <div style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}>
              <div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500}}>Status</div>
              <Sel style={{fontSize:12,padding:'4px 8px'}} value="" onChange={e=>{if(e.target.value)changeStatus(e.target.value);}}>
                <option value="" disabled>Change status (now: {ticket.status})</option>
                {validNext.map(s=><option key={s} value={s}>{s}</option>)}
              </Sel>
              {statusErr&&<div style={{fontSize:11,color:'#E53E3E',marginTop:4,background:'#FFF5F5',padding:'4px 8px',borderRadius:5}}>{statusErr}</div>}
            </div>

            <div style={{background:B.bg,borderRadius:8,padding:'9px 12px'}}>
              <div style={{fontSize:11,color:B.light,marginBottom:4,fontWeight:500}}>Agent</div>
              <Sel style={{fontSize:12,padding:'4px 8px'}} value={ticket.agent_id||''} onChange={e=>reassign(e.target.value)}>
                <option value=''>Unassigned</option>
                {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </Sel>
            </div>
          </div>

          {/* Overall SLA meter */}
          {ticket.effective_resolution_mins&&(()=>{
            const pct=Math.min(Number(ticket.sla_pct)||0,100);
            const rem=Math.max(Number(ticket.effective_resolution_mins)-Number(ticket.age_mins||0),0);
            return<div style={{background:slaBg(pct),borderRadius:8,padding:'10px 14px',border:`1px solid ${slaColor(pct)}33`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:slaColor(pct)}}>Overall SLA {pct>=100?'BREACHED':pct>=90?'CRITICAL':pct>=70?'AT RISK':'ON TRACK'}</span>
                <span style={{fontSize:12,fontWeight:600,color:slaColor(pct)}}>{pct>=100?'Breached':`${fmt.mins(rem)} remaining`}</span>
              </div>
              <div style={{height:8,background:'#EDF2F7',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:slaColor(pct),borderRadius:4,transition:'width .3s'}}/>
              </div>
              <div style={{fontSize:11,color:B.light,marginTop:4}}>
                {Math.round(Number(ticket.age_mins)||0)}m elapsed of {ticket.effective_resolution_mins}m SLA
              </div>
            </div>;
          })()}

          {/* Edit section */}
          {editing?<div style={{background:B.bg,borderRadius:8,padding:14,display:'flex',flexDirection:'column',gap:10}}>
            <FG label="Priority"><Sel value={ef.priority} onChange={e=>setEf(f=>({...f,priority:e.target.value}))}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></FG>
            <FG label="Category"><Sel value={ef.category||''} onChange={e=>setEf(f=>({...f,category:e.target.value}))}>{categories.map(c=><option key={c}>{c}</option>)}</Sel></FG>
            <FG label="Customer"><Sel value={ef.customer_org_id||''} onChange={e=>setEf(f=>({...f,customer_org_id:e.target.value}))}><option value=''>None</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
            <div style={{display:'flex',gap:8}}><Btn variant="primary" onClick={saveEdit} style={{flex:1}}>Save</Btn><Btn onClick={()=>setEditing(false)}>Cancel</Btn></div>
          </div>:<button onClick={()=>setEditing(true)} style={{background:'none',border:`1px dashed ${B.border}`,borderRadius:8,padding:8,fontSize:12,color:B.light,cursor:'pointer',textAlign:'left'}}>✏ Edit priority / category / customer</button>}

          {ticket.description&&<div style={{background:B.bg,borderRadius:8,padding:'12px 14px',fontSize:13,color:B.mid,lineHeight:1.7,borderLeft:`3px solid ${B.teal}`}}>{ticket.description}</div>}

          {/* AI Action buttons */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Btn onClick={generateRCA} disabled={rcaLoading} style={{fontSize:11,padding:'5px 12px'}}>
              {rcaLoading?'Analysing…':'🤖 AI Root Cause Analysis'}
            </Btn>
            {isResolved&&<Btn onClick={convertToKB} disabled={kbConverting} style={{fontSize:11,padding:'5px 12px'}}>
              {kbConverting?'Converting…':'📚 Convert to KB Article'}
            </Btn>}
            {canTriggerCSAT&&isResolved&&<Btn onClick={triggerCSAT} style={{fontSize:11,padding:'5px 12px'}}>
              💬 Send CSAT Survey
            </Btn>}
            {ticket.csat&&<span style={{fontSize:11,padding:'5px 12px',background:ticket.csat.score===10?'#F0FFF4':'#FFF5F5',color:ticket.csat.score===10?'#276749':'#9B2335',borderRadius:8,fontWeight:600}}>
              CSAT: {ticket.csat.score===10?'👍 10':'👎 5'}/10
            </span>}
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:0,borderBottom:`1px solid ${B.border}`}}>
            {[['thread','Conversation'],['timeline','SLA Timeline'],['attachments',`Attachments (${ticket.attachments?.length||0})`],['history','Audit Trail'],['rca','RCA']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',padding:'8px 14px',cursor:'pointer',fontSize:12,fontFamily:'inherit',color:tab===t?B.navy:B.light,fontWeight:tab===t?600:400,borderBottom:tab===t?`2px solid ${B.orange}`:'2px solid transparent'}}>{l}</button>
            ))}
          </div>

          {/* Thread */}
          {tab==='thread'&&<>
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
            <div style={{border:`1px solid ${B.border}`,borderRadius:10,overflow:'hidden'}}>
              <div style={{display:'flex',background:B.bg,borderBottom:`1px solid ${B.border}`}}>
                {['public','internal'].map(t=><div key={t} onClick={()=>setRtype(t)} style={{padding:'9px 16px',fontSize:12,fontWeight:600,cursor:'pointer',color:rtype===t?B.navy:B.light,borderBottom:rtype===t?`2px solid ${B.orange}`:'2px solid transparent',background:rtype===t?B.white:'transparent'}}>{t==='public'?'Public Reply':'Internal Note'}</div>)}
              </div>
              <textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder={rtype==='internal'?'Internal note…':'Reply to customer…'} style={{width:'100%',border:'none',padding:'12px 14px',fontSize:13,resize:'vertical',minHeight:80,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
              <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 12px',borderTop:`1px solid ${B.border}`,background:B.bg}}>
                <Btn variant="primary" onClick={sendReply} disabled={sending||!reply.trim()} style={{opacity:reply.trim()?1:.5}}>{sending?'Sending…':rtype==='internal'?'Add Note':'Send Reply'}</Btn>
              </div>
            </div>
          </>}

          {/* SLA Timeline (Point 1) */}
          {tab==='timeline'&&<SLATimeline stageLog={ticket.stageLog} priority={ticket.priority}/>}

          {/* Attachments (Point 7) */}
          {tab==='attachments'&&<AttachmentPanel ticketId={id} attachments={ticket.attachments||[]} onRefresh={load} canManage={canManageAtt}/>}

          {/* Audit Trail */}
          {tab==='history'&&<div style={{display:'flex',flexDirection:'column',gap:6}}>
            {(ticket.history||[]).map((h,i)=>(
              <div key={i} style={{display:'flex',gap:8,fontSize:12,alignItems:'flex-start'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:B.teal,marginTop:4,flexShrink:0}}/>
                <span style={{color:B.light,minWidth:130,flexShrink:0}}>{fmtDT(h.changed_at)}</span>
                <span style={{color:B.mid}}><strong>{h.actor_name||'System'}</strong> — {h.field_changed}: {h.old_value||'—'} → <strong>{h.new_value}</strong></span>
              </div>
            ))}
          </div>}

          {/* RCA Tab (Point 10) */}
          {tab==='rca'&&<div>
            {!rca&&<div style={{textAlign:'center',padding:30}}>
              <div style={{fontSize:13,color:B.light,marginBottom:16}}>AI Root Cause Analysis uses past incident patterns to suggest the most likely cause and resolution path.</div>
              <Btn variant="primary" onClick={generateRCA} disabled={rcaLoading}>{rcaLoading?'Analysing past incidents…':'Generate AI RCA'}</Btn>
            </div>}
            {rca&&<div style={{background:B.bg,borderRadius:8,padding:16,fontSize:13,color:B.mid,lineHeight:1.8,whiteSpace:'pre-wrap'}}>{rca}</div>}
          </div>}

        </div>}
      </div>
    </div>
  );
}

// ── Create Ticket Modal ───────────────────────────────────────────
function CreateModal({onClose,onCreated,agents,categories,customers}){
  const [f,setF]=useState({subject:'',description:'',priority:'Medium',category:categories[0]||'Network Outage',channel:'Web Portal',agent_id:'',customer_org_id:''});
  const [saving,setSaving]=useState(false);const [err,setErr]=useState('');
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit(){if(!f.subject.trim()){setErr('Subject is required');return;}setSaving(true);try{await api.post('/tickets',f);onCreated();onClose();}catch(e){setErr(e.response?.data?.error||'Failed');}finally{setSaving(false);}}
  return(
    <Modal onClose={onClose} title="Raise New Ticket" width={520}>
      {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#9B2335',marginBottom:14}}>{err}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <FG label="Subject *"><Inp value={f.subject} onChange={set('subject')} placeholder="Brief description" autoFocus/></FG>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Priority"><Sel value={f.priority} onChange={set('priority')}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></FG>
          <FG label="Category"><Sel value={f.category} onChange={set('category')}>{categories.map(c=><option key={c}>{c}</option>)}</Sel></FG>
          <FG label="Channel"><Sel value={f.channel} onChange={set('channel')}>{CHANNELS.map(c=><option key={c}>{c}</option>)}</Sel></FG>
          <FG label="Customer"><Sel value={f.customer_org_id} onChange={set('customer_org_id')}><option value=''>Select customer…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
        </div>
        <FG label="Assign to agent"><Sel value={f.agent_id} onChange={set('agent_id')} style={{width:'100%'}}><option value=''>Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}</Sel></FG>
        <FG label="Description"><textarea value={f.description} onChange={set('description')} placeholder="Full details — site, equipment, error messages, impact…" style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',minHeight:90,resize:'vertical',width:'100%',boxSizing:'border-box',outline:'none'}}/></FG>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Creating…':'Create Ticket'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── Export Modal ──────────────────────────────────────────────────
function ExportModal({customers,onClose}){
  const [f,setF]=useState({status:'',priority:'',customer_id:'',from:'',to:''});
  const [exp,setExp]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function doExport(){
    setExp(true);
    try{
      const params=new URLSearchParams();
      Object.entries(f).forEach(([k,v])=>{if(v)params.set(k,v);});
      const tok=localStorage.getItem('token');
      const base=process.env.REACT_APP_API_URL||'http://localhost:3001';
      const res=await fetch(`${base}/reports/export?${params}`,{headers:{Authorization:`Bearer ${tok}`}});
      const blob=await res.blob();
      const url=window.URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=`tickets-${new Date().toISOString().slice(0,10)}.csv`;a.click();
      window.URL.revokeObjectURL(url);onClose();
    }catch(e){alert('Export failed');}finally{setExp(false);}
  }
  return(
    <Modal onClose={onClose} title="Export Tickets to CSV" width={440}>
      <div style={{fontSize:13,color:B.mid,marginBottom:16}}>Apply filters to narrow the export. Leave blank to export everything.</div>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FG label="Status"><Sel value={f.status} onChange={set('status')}><option value=''>All</option>{['New','Open','Assigned','In Progress','Pending','On Hold','Resolved','Closed','Escalated'].map(s=><option key={s}>{s}</option>)}</Sel></FG>
          <FG label="Priority"><Sel value={f.priority} onChange={set('priority')}><option value=''>All</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></FG>
          <FG label="From date"><Inp type="date" value={f.from} onChange={set('from')}/></FG>
          <FG label="To date"><Inp type="date" value={f.to} onChange={set('to')}/></FG>
        </div>
        <FG label="Customer"><Sel value={f.customer_id} onChange={set('customer_id')}><option value=''>All customers</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
        <div style={{background:B.bg,borderRadius:8,padding:'10px 14px',fontSize:12,color:B.mid}}>Exports: Ticket No, Subject, Priority, Status, Category, Channel, Customer, Agent, Created, Updated, Resolved, Reopened count, Escalation count, FTR, Description</div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={doExport} disabled={exp}>{exp?'Exporting…':'⬇ Download CSV'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── Ticket Table ──────────────────────────────────────────────────
function TicketTable({rows,onOpen,loading}){
  return(
    <Card style={{padding:0,overflow:'hidden'}}>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead><tr style={{background:B.bg}}>
            {['Ticket','Subject','Customer','Category','Priority','Status','Agent','SLA','Updated'].map(h=>(
              <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading&&<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:B.light}}>Loading…</td></tr>}
            {!loading&&rows.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:B.light}}>No tickets found</td></tr>}
            {rows.map(t=>{
              const pct=Number(t.sla_pct)||0;
              const isBreached=pct>=90;
              return(
                <tr key={t.id} onClick={()=>onOpen(t.id)}
                  style={{cursor:'pointer',background:isBreached?'#FFF5F5':''}}
                  onMouseEnter={e=>e.currentTarget.style.background=isBreached?'#FFE8E8':'#F7FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background=isBreached?'#FFF5F5':''}>
                  <td style={{padding:'10px 14px',fontSize:12,color:B.teal,fontWeight:600,borderBottom:`1px solid ${B.border}`,whiteSpace:'nowrap'}}>
                    {isBreached&&<span style={{color:'#E53E3E',marginRight:4}}>🚨</span>}{t.ticket_number}
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{t.subject}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><Avatar name={t.customer_org||t.customer_name} size={22}/><span style={{fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.customer_org||t.customer_name||'—'}</span></div>
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.category||'—'}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><PriBadge v={t.priority}/></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><StatusBadge v={t.status}/></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                    {t.agent_name?<div style={{display:'flex',alignItems:'center',gap:6}}><Avatar name={t.agent_name} size={22}/><span style={{fontSize:12,color:B.mid,whiteSpace:'nowrap'}}>{t.agent_name}</span></div>
                    :<span style={{fontSize:12,color:B.lighter}}>Unassigned</span>}
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}>
                    {t.sla_pct!=null?<SLABar pct={pct}/>:<span style={{fontSize:12,color:B.lighter}}>—</span>}
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

// ── KPI Dashboard (Point 2) ───────────────────────────────────────
function KPIDashboard(){
  const [kpi,setKpi]=useState(null);
  const [bySev,setBySev]=useState([]);
  const [byAgent,setByAgent]=useState([]);
  const [byDay,setByDay]=useState([]);
  const [stageAnal,setStageAnal]=useState([]);
  const [filters,setFilters]=useState({from:'',to:'',priority:'',agent_id:''});
  const [loading,setLoading]=useState(false);
  const [agents,setAgents]=useState([]);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const params={};
      if(filters.from)params.from=filters.from;if(filters.to)params.to=filters.to;
      if(filters.priority)params.priority=filters.priority;if(filters.agent_id)params.agent_id=filters.agent_id;
      const[k,s,a,d,st]=await Promise.all([
        api.get('/kpi/summary',{params}),
        api.get('/kpi/by-severity',{params}),
        api.get('/kpi/by-agent',{params}),
        api.get('/kpi/by-day',{params}),
        api.get('/kpi/stage-analysis',{params})
      ]);
      setKpi(k.data.data);setBySev(s.data.data||[]);setByAgent(a.data.data||[]);setByDay(d.data.data||[]);setStageAnal(st.data.data||[]);
    }catch{}finally{setLoading(false);}
  },[filters]);

  useEffect(()=>{load();api.get('/users/agents').then(r=>setAgents(r.data.data||[])).catch(()=>{});},[load]);

  function exportKPI(){
    if(!kpi)return;
    const csv=['Metric,Value',`MTTD (mins),${kpi.mttd_mins}`,`MTTR (mins),${kpi.mttr_mins}`,`First Response (mins),${kpi.first_response_mins}`,`FTR %,${kpi.ftr_pct}`,`Escalation Rate %,${kpi.escalation_rate_pct}`,`Repeat Incident %,${kpi.repeat_rate_pct}`,`SLA Breach %,${kpi.breach_rate_pct}`,`Total tickets,${kpi.total}`,`Open,${kpi.open}`,`Resolved,${kpi.resolved}`].join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='kpi-report.csv';a.click();
  }

  const inpS={border:`1px solid ${B.border}`,borderRadius:8,padding:'6px 10px',fontSize:12,background:B.white,fontFamily:'inherit'};

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:20,fontWeight:700,color:B.navy}}>KPI & Performance Dashboard</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <input style={inpS} type="date" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))} title="From date"/>
          <input style={inpS} type="date" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))} title="To date"/>
          <select style={inpS} value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}><option value=''>All priorities</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
          <select style={inpS} value={filters.agent_id} onChange={e=>setFilters(f=>({...f,agent_id:e.target.value}))}><option value=''>All agents</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <Btn onClick={load}>↻ Refresh</Btn>
          <Btn variant="primary" onClick={exportKPI}>⬇ CSV</Btn>
        </div>
      </div>

      {kpi&&<>
        {/* Core KPI metrics */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:20}}>
          <MetricCard label="MTTD" value={fmt.mins(kpi.mttd_mins)} color={B.teal} sub="Mean time to detect"/>
          <MetricCard label="MTTR" value={fmt.mins(kpi.mttr_mins)} color={B.navy} sub="Mean time to resolve"/>
          <MetricCard label="First Response" value={fmt.mins(kpi.first_response_mins)} color='#805AD5' sub="Avg first response time"/>
          <MetricCard label="FTR %" value={kpi.ftr_pct} color={kpi.ftr_pct>=80?'#38A169':'#E53E3E'} suffix="%" sub="First-time resolution"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:20}}>
          <MetricCard label="Escalation Rate" value={kpi.escalation_rate_pct} suffix="%" color={kpi.escalation_rate_pct>20?'#E53E3E':'#D69E2E'} sub="Tickets escalated"/>
          <MetricCard label="Repeat Incident" value={kpi.repeat_rate_pct} suffix="%" color={kpi.repeat_rate_pct>15?'#E53E3E':'#D69E2E'} sub="Tickets reopened"/>
          <MetricCard label="SLA Breach Rate" value={kpi.breach_rate_pct} suffix="%" color={kpi.breach_rate_pct>10?'#E53E3E':'#38A169'} sub="% tickets breached SLA"/>
          <MetricCard label="Total Tickets" value={kpi.total} color={B.orange} sub={`${kpi.open} open · ${kpi.resolved} resolved`}/>
        </div>
      </>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <Card>
          <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Daily volume</div>
          <BarChart data={byDay.map(d=>({label:d.label,count:Number(d.total)}))} color={B.teal} height={100}/>
        </Card>
        <Card>
          <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Tickets by severity</div>
          <BarChart data={bySev.map(d=>({label:d.priority,count:Number(d.total)}))} color={B.orange} height={100}/>
        </Card>
      </div>

      {/* Stage analysis */}
      {stageAnal.length>0&&<Card style={{marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Stage bottleneck analysis</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:B.bg}}>
              {['Stage','Avg time in stage','SLA limit','Breach count','Bottleneck risk'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {stageAnal.map(s=>{
                const risk=s.sla_max_mins?Math.min((Number(s.avg_mins)/Number(s.sla_max_mins))*100,100):0;
                return<tr key={s.stage} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`}}><StatusBadge v={s.stage}/></td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontWeight:600,color:slaColor(risk)}}>{fmt.mins(s.avg_mins)}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.light}}>{s.sla_max_mins?fmt.mins(s.sla_max_mins):'—'}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:Number(s.breaches)>0?'#E53E3E':B.mid,fontWeight:Number(s.breaches)>0?700:400}}>{s.breaches}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`}}><SLABar pct={risk}/></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>}

      {/* Agent performance */}
      {byAgent.length>0&&<Card>
        <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Agent performance matrix</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:B.bg}}>
              {['Agent','Total','Open','Closed','MTTR','FTR %','Escalated'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {byAgent.map(a=>(
                <tr key={a.id} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={a.name} size={26}/>{a.name}</div></td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontWeight:600}}>{a.total}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:'#805AD5',fontWeight:600}}>{a.open}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:'#38A169',fontWeight:600}}>{a.closed}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:B.mid}}>{fmt.mins(a.avg_mttr_mins)}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`}}>
                    <span style={{color:Number(a.ftr_pct)>=80?'#38A169':'#E53E3E',fontWeight:600}}>{a.ftr_pct||0}%</span>
                  </td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,color:Number(a.escalated)>0?'#E53E3E':B.mid,fontWeight:Number(a.escalated)>0?700:400}}>{a.escalated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>}
    </div>
  );
}

// ── CSAT Dashboard (Point 3) ──────────────────────────────────────
function CSATDashboard(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [filters,setFilters]=useState({from:'',to:''});

  const load=useCallback(async()=>{
    setLoading(true);
    try{const params={};if(filters.from)params.from=filters.from;if(filters.to)params.to=filters.to;
      const{data}=await api.get('/csat/dashboard',{params});setData(data.data);}
    catch{}finally{setLoading(false);}
  },[filters]);

  useEffect(()=>{load();},[load]);

  function exportCSAT(){
    if(!data?.recent)return;
    const rows=[['Ticket','Subject','Priority','Customer','Agent','Score','Comment','Date'],
      ...data.recent.map(r=>[r.ticket_number,`"${(r.subject||'').replace(/"/g,'""')}"`,r.priority,r.customer_org||'',r.agent_name||'',r.score===10?'Thumbs Up (10)':'Thumbs Down (5)',`"${(r.comment||'').replace(/"/g,'""')}"`,fmtD(r.responded_at)])
    ].map(r=>r.join(',')).join('\n');
    const blob=new Blob([rows],{type:'text/csv'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='csat-report.csv';a.click();
  }

  const inpS={border:`1px solid ${B.border}`,borderRadius:8,padding:'6px 10px',fontSize:12,background:B.white,fontFamily:'inherit'};

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:20,fontWeight:700,color:B.navy}}>CSAT Dashboard</div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input style={inpS} type="date" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))}/>
          <input style={inpS} type="date" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))}/>
          <Btn onClick={load}>↻ Refresh</Btn>
          <Btn variant="primary" onClick={exportCSAT}>⬇ CSV</Btn>
        </div>
      </div>

      {data?.summary&&<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:20}}>
          <MetricCard label="CSAT Score" value={`${data.summary.csat_pct||0}%`} color={Number(data.summary.csat_pct)>=80?'#38A169':'#E53E3E'} sub={`Avg ${data.summary.avg_score}/10`}/>
          <MetricCard label="Thumbs Up" value={data.summary.thumbs_up} color='#38A169' sub="Satisfied customers"/>
          <MetricCard label="Thumbs Down" value={data.summary.thumbs_down} color='#E53E3E' sub="Unsatisfied customers"/>
          <MetricCard label="Pending surveys" value={data.pending} color={B.orange} sub="Awaiting customer response"/>
        </div>
        {data.byPriority?.length>0&&<Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>CSAT by priority</div>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            {data.byPriority.map(p=>(
              <div key={p.priority} style={{background:B.bg,borderRadius:8,padding:'12px 16px',flex:1,minWidth:120,textAlign:'center'}}>
                <PriBadge v={p.priority}/>
                <div style={{fontSize:22,fontWeight:700,color:Number(p.csat_pct)>=80?'#38A169':'#E53E3E',marginTop:8}}>{p.csat_pct||0}%</div>
                <div style={{fontSize:11,color:B.light}}>{p.count} responses</div>
              </div>
            ))}
          </div>
        </Card>}
      </>}

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Recent responses</div>
        {(!data?.recent||data.recent.length===0)&&<div style={{fontSize:13,color:B.light,textAlign:'center',padding:20}}>No CSAT responses yet. Trigger surveys from resolved tickets.</div>}
        {data?.recent?.map(r=>(
          <div key={r.id} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:`1px solid ${B.border}`,alignItems:'flex-start'}}>
            <div style={{fontSize:24}}>{r.score===10?'👍':'👎'}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4,flexWrap:'wrap'}}>
                <span style={{fontSize:12,fontWeight:600,color:B.teal}}>{r.ticket_number}</span>
                <span style={{fontSize:12,color:B.dark}}>{r.subject}</span>
                <PriBadge v={r.priority}/>
                <span style={{fontSize:11,color:r.score===10?'#276749':'#9B2335',fontWeight:700,background:r.score===10?'#F0FFF4':'#FFF5F5',padding:'1px 8px',borderRadius:10}}>{r.score}/10</span>
              </div>
              <div style={{fontSize:12,color:B.mid}}>{r.customer_org||'—'} · Agent: {r.agent_name||'—'} · {fmtD(r.responded_at)}</div>
              {r.comment&&<div style={{fontSize:12,color:B.mid,marginTop:4,fontStyle:'italic'}}>"{r.comment}"</div>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── AI Tools Page (Point 10) ──────────────────────────────────────
function AIToolsPage(){
  const [tools,setTools]=useState([]);
  const [predictions,setPredictions]=useState([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    api.get('/ai/tools').then(r=>setTools(r.data.data||[])).catch(()=>{});
    loadPredictions();
  },[]);

  async function loadPredictions(){
    setLoading(true);
    try{const{data}=await api.get('/ai/sla-prediction');setPredictions(data.data||[]);}
    catch{}finally{setLoading(false);}
  }

  const riskColor={low:'#38A169',medium:'#D69E2E',high:'#E53E3E',breached:'#9B2335'};
  const riskBg={low:'#F0FFF4',medium:'#FFFAF0',high:'#FFF5F5',breached:'#FFF5F5'};

  return(
    <div>
      <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:16}}>AI Features & Tools</div>

      {/* Predictive SLA (Point 10) */}
      <Card style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:B.navy,flex:1}}>🔮 Predictive SLA Breach Detection</div>
          <Btn onClick={loadPredictions} style={{fontSize:11,padding:'4px 10px'}}>↻ Refresh</Btn>
        </div>
        <div style={{fontSize:12,color:B.light,marginBottom:12}}>AI analysis of all active tickets predicting SLA breach risk before it happens.</div>
        {loading&&<div style={{textAlign:'center',color:B.light,padding:20}}>Analysing tickets…</div>}
        {!loading&&predictions.length===0&&<div style={{textAlign:'center',color:B.light,padding:20}}>No active tickets to analyse</div>}
        {predictions.slice(0,10).map(t=>(
          <div key={t.id} style={{display:'flex',gap:12,padding:'10px 12px',marginBottom:8,borderRadius:8,background:riskBg[t.risk]||B.bg,border:`1px solid ${riskColor[t.risk]||B.border}33`,alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:800,color:riskColor[t.risk]||B.mid,minWidth:80}}>
              {t.risk==='breached'?'🚨':t.risk==='high'?'⚠️':t.risk==='medium'?'🔶':'✅'} {t.risk?.toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:B.teal}}>{t.ticket_number}</div>
              <div style={{fontSize:13,color:B.dark,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject}</div>
              <div style={{fontSize:11,color:B.light}}>{t.customer_org||'—'} · Agent: {t.agent_name||'Unassigned'} · Stage: {t.current_stage||'—'}</div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:700,color:riskColor[t.risk]}}>{t.prediction}</div>
              <SLABar pct={t.sla_pct}/>
            </div>
          </div>
        ))}
      </Card>

      {/* AI Copilot Tools */}
      <Card>
        <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:6}}>🤖 AI Copilot Tools</div>
        <div style={{fontSize:12,color:B.light,marginBottom:16}}>Integrate these AI tools to enhance your support operations. All links open in a new tab. Usage subject to each provider's security and data policies — review before use.</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
          {tools.map(t=>(
            <div key={t.name} style={{border:`1px solid ${B.border}`,borderRadius:10,padding:14,background:B.bg}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontSize:14,fontWeight:700,color:B.navy}}>{t.name}</div>
                <div style={{display:'flex',gap:6}}>
                  <span style={{fontSize:10,background:t.free?'#F0FFF4':'#EBF8FF',color:t.free?'#276749':'#1a6b8a',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{t.free?'Free':'Paid'}</span>
                  <span style={{fontSize:10,background:'#FAF5FF',color:'#553C9A',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{t.type}</span>
                </div>
              </div>
              <div style={{fontSize:12,color:B.mid,lineHeight:1.6,marginBottom:10}}>{t.description}</div>
              <a href={t.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',background:B.navy,color:'#fff',padding:'5px 14px',borderRadius:7,fontSize:12,textDecoration:'none',fontWeight:600}}>Open tool ↗</a>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Help Page with Deployment Guides (Points 4, 5) ────────────────
function HelpPage({currentUser}){
  const [tab,setTab]=useState('guide');
  const [deployTab,setDeployTab]=useState('own');

  const tabs=[['guide','User Guide'],['workflow','Workflow'],['sla-ref','SLA Reference'],['roles','Roles'],['deploy','Deployment & Domain'],['faq','FAQ']];

  return(
    <div>
      <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:16}}>Help & Support Guide</div>
      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:`1px solid ${B.border}`,flexWrap:'wrap'}}>
        {tabs.map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',padding:'8px 16px',cursor:'pointer',fontSize:13,fontFamily:'inherit',color:tab===t?B.navy:B.light,fontWeight:tab===t?600:400,borderBottom:tab===t?`2px solid ${B.orange}`:'2px solid transparent'}}>{l}</button>
        ))}
      </div>

      {tab==='guide'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {[
          {title:'Raising a ticket',steps:['Click "+ New Ticket" in the top bar','Fill in Subject with a clear description','Select Priority based on business impact','Choose correct Category','Select Customer organisation','Add Description with full details','Assign to agent or leave unassigned','Click Create Ticket']},
          {title:'Workflow enforcement',steps:['Each status has defined valid next states only','Invalid transitions are blocked with an error message','Status dropdown only shows permitted next states','Example: "In Progress" cannot go back to "Open"','Escalated tickets can only go to In Progress or Resolved','Reopened tickets restart from Open or Assigned']},
          {title:'SLA stage tracking',steps:['Every status change is timed automatically','Open the ticket → click "SLA Timeline" tab','Each stage shows time spent vs SLA limit','Green = on track, Amber = at risk, Red = breached','Stage breaches are logged in Audit Trail','Overall SLA bar shown in ticket header']},
          {title:'File attachments',steps:['Open a ticket → click "Attachments" tab','Click "+ Add file" to upload','Supported: PDF, Word, Excel, PPT, images (max 10MB)','Maximum 5 files per ticket','Click ⬇ to download any attachment','Files auto-delete based on customer retention policy']},
          {title:'Exporting data',steps:['Click "⬇ Export" in the top navigation bar','Or go to Reports → "⬇ Export CSV"','Apply filters: status, priority, date range, customer','Click "Download CSV" to save','KPI Dashboard also has its own ⬇ CSV button','CSAT Dashboard exports CSAT data separately']},
          {title:'AI features',steps:['Open any ticket → click "🤖 AI Root Cause Analysis"','AI analyses past similar tickets and suggests RCA','For resolved tickets → click "📚 Convert to KB Article"','AI writes a KB draft automatically (review before publish)','Go to AI Features tab for predictive SLA breach view','AI copilot tool links available for external AI assistance']},
        ].map(s=>(
          <Card key={s.title}>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>{s.title}</div>
            <ol style={{paddingLeft:18,display:'flex',flexDirection:'column',gap:6}}>{s.steps.map((step,i)=><li key={i} style={{fontSize:13,color:B.mid,lineHeight:1.6}}>{step}</li>)}</ol>
          </Card>
        ))}
      </div>}

      {tab==='workflow'&&<>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:14}}>Enterprise ticket lifecycle — valid transitions only</div>
          <WorkflowDiagram/>
        </Card>
        <Card>
          <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:14}}>Status definitions</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              {s:'New',d:'Just created. Awaiting first agent review.',c:'#3182CE',valid:['Open','Assigned','Closed']},
              {s:'Open',d:'Acknowledged and under initial review.',c:'#718096',valid:['Assigned','Pending','Escalated','Closed']},
              {s:'Assigned',d:'Agent assigned. Work not yet started.',c:'#38B2AC',valid:['In Progress','Pending','On Hold','Escalated','Closed']},
              {s:'In Progress',d:'Agent actively working on the issue.',c:'#805AD5',valid:['Pending','On Hold','Escalated','Resolved']},
              {s:'Pending',d:'Waiting for customer or third-party action.',c:'#D69E2E',valid:['In Progress','Escalated','Closed']},
              {s:'On Hold',d:'Paused — maintenance window or awaiting parts.',c:'#A0AEC0',valid:['In Progress','Escalated']},
              {s:'Escalated',d:'Senior/management involvement required.',c:'#FC8181',valid:['In Progress','Resolved']},
              {s:'Resolved',d:'Fixed. Awaiting customer confirmation.',c:'#48BB78',valid:['Closed','Reopened']},
              {s:'Closed',d:'Confirmed resolved and archived.',c:'#CBD5E0',valid:['Reopened']},
              {s:'Reopened',d:'Customer reported issue recurred.',c:'#D85A30',valid:['Open','Assigned']},
            ].map(({s,d,c,valid})=>(
              <div key={s} style={{display:'flex',gap:12,padding:'10px 14px',background:B.bg,borderRadius:8,borderLeft:`4px solid ${c}`,alignItems:'flex-start'}}>
                <div style={{minWidth:120,flexShrink:0}}><StatusBadge v={s}/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:B.mid}}>{d}</div>
                  <div style={{fontSize:11,color:B.lighter,marginTop:4}}>→ Can move to: {valid.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </>}

      {tab==='sla-ref'&&<Card>
        <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:14}}>SLA reference table</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:B.bg}}>{['Priority','Use case','First response','Resolution'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}</tr></thead>
          <tbody>
            {[{p:'Urgent',use:'Complete outage, all users affected',resp:'1 hour',res:'4 hours'},{p:'High',use:'Major degradation, significant impact',resp:'4 hours',res:'24 hours'},{p:'Medium',use:'Partial issue, some users affected',resp:'8 hours',res:'3 days'},{p:'Low',use:'Minor issue, query, enhancement',resp:'24 hours',res:'7 days'}].map(r=>(
              <tr key={r.p} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`}}><PriBadge v={r.p}/></td>
                <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13}}>{r.use}</td>
                <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.teal,fontWeight:600}}>{r.resp}</td>
                <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13,color:B.navy,fontWeight:600}}>{r.res}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>}

      {tab==='roles'&&<Card>
        <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:8}}>Role permissions</div>
        <div style={{fontSize:12,color:B.light,marginBottom:14}}>Permissions can be modified live by Admin → Admin panel → Role Permissions section.</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:B.bg}}>
            <th style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>Permission</th>
            {ROLES.map(r=><th key={r} style={{padding:'9px 14px',textAlign:'center',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{r}</th>)}
          </tr></thead>
          <tbody>
            {[['Raise tickets','✓','✓','✓','✓'],['View all tickets','✓','✓','✓','✗'],['Change status','✓','✓','✓','✗'],['Assign tickets','✓','✓','✓','✗'],['Internal notes','✓','✓','✓','✗'],['Manage users','✓','✗','✗','✗'],['Manage customers','✓','✓','✗','✗'],['Configure SLA','✓','✗','✗','✗'],['Admin panel','✓','✗','✗','✗'],['Export tickets','✓','✓','✗','✗'],['Trigger CSAT','✓','✓','✗','✗'],['Manage attachments','✓','✓','✓','✗'],['Configure retention','✓','✗','✗','✗']].map(([perm,...vals])=>(
              <tr key={perm} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                <td style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13}}>{perm}</td>
                {vals.map((v,i)=><td key={i} style={{padding:'9px 14px',borderBottom:`1px solid ${B.border}`,textAlign:'center',fontSize:16,color:v==='✓'?'#38A169':'#CBD5E0',fontWeight:700}}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>}

      {/* Point 4 & 5 — Deployment & Domain Guide */}
      {tab==='deploy'&&<>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          {[['own','Customer Hosts (Self-hosted)'],['custom','Custom Domain Setup']].map(([t,l])=>(
            <button key={t} onClick={()=>setDeployTab(t)} style={{background:deployTab===t?B.navy:B.white,color:deployTab===t?'#fff':B.mid,border:`1px solid ${deployTab===t?B.navy:B.border}`,borderRadius:8,padding:'7px 16px',cursor:'pointer',fontSize:13,fontWeight:deployTab===t?600:400,fontFamily:'inherit'}}>{l}</button>
          ))}
        </div>

        {deployTab==='own'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Card style={{borderLeft:`4px solid ${B.orange}`}}>
            <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:8}}>Point 4 — Customer provides own infrastructure</div>
            <div style={{fontSize:13,color:B.mid,lineHeight:1.7}}>This guide covers deploying TicketVa entirely on infrastructure controlled by the customer — their own database, backend server, and frontend domain.</div>
          </Card>
          {[
            {step:1,title:'Database — Customer provisions PostgreSQL',content:'The customer creates a PostgreSQL database on their preferred provider:\n• AWS RDS PostgreSQL (recommended for enterprise)\n• Azure Database for PostgreSQL\n• Google Cloud SQL\n• Self-hosted PostgreSQL on their server\n\nThey run the schema-v4.sql file against their database. The connection string format is:\npostgresql://username:password@host:5432/dbname\n\nThis replaces the Supabase DATABASE_URL in the backend environment variables.'},
            {step:2,title:'Backend — Deploy on customer server or cloud',content:'The customer deploys the backend (Node.js) on:\n• AWS EC2 / ECS / App Service\n• Azure App Service\n• Google Cloud Run\n• Any Linux server with Node.js 18+\n\nSteps:\n1. Upload the deskflow-backend folder to their server\n2. Run: npm install\n3. Create a .env file with their values:\n   DATABASE_URL=postgresql://...\n   JWT_SECRET=<64-char-random-string>\n   SUPABASE_URL=<if using Supabase storage>\n   SUPABASE_SERVICE_KEY=<if using Supabase storage>\n   FRONTEND_URL=https://their-domain.com\n4. Run: npm start (or use PM2 for production: pm2 start index.js)'},
            {step:3,title:'Frontend — Deploy on customer web hosting',content:'The customer deploys the React frontend on:\n• AWS S3 + CloudFront\n• Azure Static Web Apps\n• Nginx / Apache on their server\n• Netlify / Vercel with their own account\n\nSteps:\n1. In the frontend folder, create .env file:\n   REACT_APP_API_URL=https://their-backend-url.com\n2. Run: npm run build\n3. Upload the contents of the /build folder to their web server or CDN\n4. Configure the web server to redirect all routes to index.html (for React routing)'},
            {step:4,title:'Environment variables required',content:'Backend .env variables:\nDATABASE_URL — PostgreSQL connection string\nJWT_SECRET — Minimum 64 character random string\nFRONTEND_URL — Full URL of the frontend (for CORS)\nSUPABASE_URL — Only if using Supabase for file storage\nSUPABASE_SERVICE_KEY — Only if using Supabase storage\nPORT — Default is 3001\n\nFrontend .env variables:\nREACT_APP_API_URL — Full URL of the backend API'},
            {step:5,title:'Zero-downtime updates (Point 9)',content:'To update the tool without downtime:\n\nBackend: Use PM2 with --update-env flag:\npm2 reload index.js --update-env\nPM2 keeps old process alive until new one is ready.\n\nFrontend: Deploy new build to a staging path, then swap:\n1. Build new version → /var/www/ticketva-new/\n2. Verify it works\n3. Rename: mv /var/www/ticketva /var/www/ticketva-old\n4. Rename: mv /var/www/ticketva-new /var/www/ticketva\nNo downtime — Nginx keeps serving old files until the rename.\n\nDatabase migrations: Always run additive migrations (ALTER TABLE ADD COLUMN IF NOT EXISTS). Never rename or drop columns during live operation.'},
          ].map(({step,title,content})=>(
            <Card key={step}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:B.navy,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>{step}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:10}}>{title}</div>
                  <pre style={{fontSize:12,color:B.mid,lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'inherit',margin:0,background:B.bg,padding:14,borderRadius:8}}>{content}</pre>
                </div>
              </div>
            </Card>
          ))}
        </div>}

        {deployTab==='custom'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Card style={{borderLeft:`4px solid ${B.orange}`}}>
            <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:8}}>Point 5 — Configure a custom domain (e.g. ticketva.com)</div>
            <div style={{fontSize:13,color:B.mid,lineHeight:1.7}}>This guide covers pointing a custom domain like <strong>support.yourdomain.com</strong> to your TicketVa deployment on Vercel and Railway.</div>
          </Card>
          {[
            {step:1,title:'Buy a domain',content:'Purchase your domain from:\n• Cloudflare Registrar (cheapest, ~$9/year)\n• Namecheap (~$10/year)\n• GoDaddy\n• Google Domains\n\nRecommended: Cloudflare — they also provide free DNS management and SSL.'},
            {step:2,title:'Add custom domain to Vercel (frontend)',content:'1. Go to vercel.com → your deskflow-frontend project\n2. Click Settings → Domains\n3. Type your domain: support.yourdomain.com\n4. Click Add\n5. Vercel shows you two DNS records to add:\n   Type: CNAME\n   Name: support\n   Value: cname.vercel-dns.com\n\n6. Add these records in your domain registrar\'s DNS settings\n7. Wait 5-30 minutes for DNS propagation\n8. Vercel automatically provisions a free SSL certificate'},
            {step:3,title:'Add custom domain to Railway (backend)',content:'1. Go to railway.app → your deskflow-backend service\n2. Click Settings → Networking → Custom Domain\n3. Click "Add Custom Domain"\n4. Enter: api.yourdomain.com\n5. Railway shows you a CNAME record:\n   Type: CNAME\n   Name: api\n   Value: <your-railway-service>.up.railway.app\n\n6. Add this in your domain\'s DNS settings\n7. SSL is provisioned automatically'},
            {step:4,title:'Update environment variables',content:'After domains are live, update these:\n\nIn Railway (backend) Variables tab:\n   FRONTEND_URL = https://support.yourdomain.com\n\nIn Vercel (frontend) Environment Variables:\n   REACT_APP_API_URL = https://api.yourdomain.com\n\nThen redeploy both:\n• Railway: redeploys automatically when you save\n• Vercel: go to Deployments → click "Redeploy" on latest'},
            {step:5,title:'Verify everything works',content:'1. Open https://support.yourdomain.com\n2. You should see the TicketVa login screen\n3. Log in — the login call goes to https://api.yourdomain.com\n4. Check browser console (F12) — no CORS errors should appear\n5. Test creating a ticket and adding an attachment\n\nIf you see CORS errors:\n• Check FRONTEND_URL in Railway exactly matches your Vercel domain\n• Ensure both use https:// (not http://)\n• Redeploy Railway after changing FRONTEND_URL'},
          ].map(({step,title,content})=>(
            <Card key={step}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:B.orange,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>{step}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:10}}>{title}</div>
                  <pre style={{fontSize:12,color:B.mid,lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'inherit',margin:0,background:B.bg,padding:14,borderRadius:8}}>{content}</pre>
                </div>
              </div>
            </Card>
          ))}
        </div>}
      </>}

      {tab==='faq'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
        {[
          {q:'Why is my status change being rejected?',a:'TicketVa enforces strict workflow governance. Only valid next states are permitted. For example, a ticket In Progress cannot go back to Open. The status dropdown only shows valid options. If you need to move a ticket to an unusual state, check the Workflow tab for allowed transitions.'},
          {q:'How do I send a CSAT survey to a customer?',a:'Open a Resolved or Closed ticket → click the "💬 Send CSAT Survey" button (visible to admin and supervisor). The customer will see a thumbs up/down pop-up every time they log in until they respond. Thumbs up = 10/10, Thumbs down = 5/10.'},
          {q:'How does attachment auto-deletion work?',a:'When a file is uploaded, its deletion date is set based on the customer organisation\'s retention policy (30, 60, 90, 180, or 365 days). Admin can set this per customer in the Customers section. Deletion is logged in the ticket audit trail with the file name.'},
          {q:'What is FTR % and how is it calculated?',a:'FTR (First-Time Resolution) is the percentage of tickets resolved without being reopened or escalated. It follows industry standard: if a ticket reaches Reopened or Escalated status at any point, it is marked as non-FTR. A healthy FTR is typically 70-85%.'},
          {q:'How does the AI RCA work?',a:'When you click "AI Root Cause Analysis" on a ticket, the system fetches the last 5 resolved tickets in the same category, then sends them along with the current ticket to Claude AI. Claude identifies patterns and suggests the most likely root cause, contributing factors, and resolution steps.'},
          {q:'How do I deploy on customer infrastructure?',a:'Go to Help → Deployment & Domain → "Customer Hosts" tab. This provides a full step-by-step guide for deploying the backend on any Linux server or cloud provider (AWS/Azure/GCP), and the frontend on any web hosting or CDN.'},
        ].map(({q,a})=>(
          <Card key={q}><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:8}}>{q}</div><div style={{fontSize:13,color:B.mid,lineHeight:1.7}}>{a}</div></Card>
        ))}
      </div>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [page,setPage]=useState('dashboard');
  const [tickets,setTickets]=useState([]);
  const [agents,setAgents]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [categories,setCategories]=useState([]);
  const [slaData,setSlaData]=useState([]);
  const [reports,setReports]=useState({});
  const [kbArticles,setKbArticles]=useState([]);
  const [allUsers,setAllUsers]=useState([]);
  const [permissions,setPermissions]=useState([]);
  const [globalSLAs,setGlobalSLAs]=useState([]);
  const [customerSLAs,setCustomerSLAs]=useState([]);
  const [breachAlerts,setBreachAlerts]=useState([]);
  const [csatQueue,setCsatQueue]=useState([]);
  const [currentCsat,setCurrentCsat]=useState(null);
  const [detail,setDetail]=useState(null);
  const [creating,setCreating]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [loading,setLoading]=useState(false);
  const [filters,setFilters]=useState({status:'',priority:'',category:'',customer_id:'',q:''});
  const [editUser,setEditUser]=useState(null);
  const [editCustomer,setEditCustomer]=useState(null);
  const [editKB,setEditKB]=useState(null);
  const [editCustSLA,setEditCustSLA]=useState(null);
  const [kbSearch,setKbSearch]=useState('');
  const [helpTab,setHelpTab]=useState('guide');

  // Restore session
  useEffect(()=>{
    const tok=localStorage.getItem('token');
    if(tok){try{const p=JSON.parse(atob(tok.split('.')[1]));if(p.exp*1000>Date.now())setUser(p);else localStorage.removeItem('token');}catch{localStorage.removeItem('token');}}
  },[]);

  const loadTickets=useCallback(async()=>{
    setLoading(true);
    try{
      const params={};
      if(filters.status)params.status=filters.status;if(filters.priority)params.priority=filters.priority;
      if(filters.category)params.category=filters.category;if(filters.customer_id)params.customer_id=filters.customer_id;
      if(filters.q)params.q=filters.q;
      const{data}=await api.get('/tickets',{params});setTickets(data.data||[]);
    }catch{}finally{setLoading(false);}
  },[filters]);

  const loadAll=useCallback(async()=>{
    try{
      const[ag,cu,cats,sl]=await Promise.all([api.get('/users/agents'),api.get('/customers'),api.get('/admin/categories'),api.get('/sla')]);
      setAgents(ag.data.data||[]);setCustomers(cu.data.data||[]);
      setCategories((cats.data.data||[]).map(c=>c.name));setGlobalSLAs(sl.data.data||[]);
    }catch{}
  },[]);

  const loadBreaches=useCallback(async()=>{
    try{const{data}=await api.get('/notifications/breaches');setBreachAlerts(data.data||[]);}catch{}
  },[]);

  const loadReports=useCallback(async()=>{
    try{
      const[sum,byS,byP,byC,byD,byA,byCu]=await Promise.all([api.get('/reports/summary'),api.get('/reports/by-status'),api.get('/reports/by-priority'),api.get('/reports/by-category'),api.get('/reports/by-day'),api.get('/reports/by-agent'),api.get('/reports/by-customer')]);
      setReports({summary:sum.data.data,byStatus:byS.data.data,byPriority:byP.data.data,byCategory:byC.data.data,byDay:byD.data.data,byAgent:byA.data.data,byCustomer:byCu.data.data});
    }catch{}
  },[]);

  useEffect(()=>{if(user){loadTickets();loadAll();loadBreaches();}}, [user,loadTickets,loadAll,loadBreaches]);
  useEffect(()=>{if(user&&page==='reports')loadReports();},[user,page,loadReports]);
  useEffect(()=>{if(user&&page==='sla')api.get('/sla/status').then(r=>setSlaData(r.data.data||[])).catch(()=>{});},[user,page]);
  useEffect(()=>{if(user&&page==='kb')api.get('/kb',{params:kbSearch?{q:kbSearch}:{}}).then(r=>setKbArticles(r.data.data||[])).catch(()=>{});},[user,page,kbSearch]);
  useEffect(()=>{if(user&&(page==='users'||page==='admin')){api.get('/users').then(r=>setAllUsers(r.data.data||[])).catch(()=>{});api.get('/admin/permissions').then(r=>setPermissions(r.data.data||[])).catch(()=>{});}}, [user,page]);
  useEffect(()=>{if(user&&page==='sla'){api.get('/sla/customer').then(r=>setCustomerSLAs(r.data.data||[])).catch(()=>{});}}, [user,page]);

  // Refresh breaches every 2 minutes
  useEffect(()=>{
    if(!user)return;
    const iv=setInterval(loadBreaches,120000);
    return()=>clearInterval(iv);
  },[user,loadBreaches]);

  function handleLogin(loginData){
    setUser(loginData.user);
    if(loginData.breachAlerts?.length>0) setBreachAlerts(loginData.breachAlerts);
    if(loginData.pendingCsat?.length>0){setCsatQueue(loginData.pendingCsat);setCurrentCsat(loginData.pendingCsat[0]);}
  }

  async function handleCSATSubmit(surveyId,score){
    try{await api.post(`/csat/respond/${surveyId}`,{score});}catch{}
    const remaining=csatQueue.filter(s=>s.id!==surveyId);
    setCsatQueue(remaining);setCurrentCsat(remaining[0]||null);
  }
  async function handleCSATDismiss(surveyId){
    try{await api.post(`/csat/dismiss/${surveyId}`);}catch{}
    const remaining=csatQueue.filter(s=>s.id!==surveyId);
    setCsatQueue(remaining);setCurrentCsat(remaining[0]||null);
  }

  async function dismissBreach(id){await api.post(`/notifications/breaches/${id}/dismiss`);loadBreaches();}
  async function dismissAllBreaches(){await api.post('/notifications/breaches/dismiss-all');loadBreaches();}

  function signOut(){localStorage.removeItem('token');setUser(null);setTickets([]);setBreachAlerts([]);setCsatQueue([]);setCurrentCsat(null);}

  if(!user) return <Login onLogin={handleLogin}/>;

  const isAdmin=user.role==='admin';
  const isSuperOrAdmin=['admin','supervisor'].includes(user.role);
  const active=tickets.filter(t=>!['Resolved','Closed'].includes(t.status));
  const escalated=active.filter(t=>t.status==='Escalated');
  const breachedTickets=tickets.filter(t=>Number(t.sla_pct)>=90&&!['Resolved','Closed'].includes(t.status));

  const navItems=[
    {id:'dashboard',label:'Dashboard'},
    {id:'tickets',label:'All Tickets',count:active.length},
    {id:'mine',label:'My Tickets',count:active.filter(t=>t.agent_id===user.id).length},
    {id:'sla',label:'SLA Monitor',count:escalated.length,urgent:true},
    {id:'kpi',label:'KPI Dashboard'},
    {id:'csat',label:'CSAT'},
    {id:'reports',label:'Reports'},
    {id:'kb',label:'Knowledge Base'},
    {id:'ai',label:'AI Features'},
    ...(isSuperOrAdmin?[{id:'customers',label:'Customers'}]:[]),
    ...(isAdmin?[{id:'users',label:'Users'},{id:'admin',label:'Admin'}]:[]),
    {id:'help',label:'Help'},
  ];

  const inpS={border:`1px solid ${B.border}`,borderRadius:8,padding:'7px 12px',fontSize:13,background:B.white,outline:'none',fontFamily:'inherit'};

  const getPermission=(role,perm)=>{const f=permissions.find(p=>p.role===role&&p.permission===perm);return f?f.allowed:false;};
  const togglePermission=async(role,perm,current)=>{await api.put('/admin/permissions',{role,permission:perm,allowed:!current});api.get('/admin/permissions').then(r=>setPermissions(r.data.data||[])).catch(()=>{});};
  async function saveSLA(priority,resp,res){try{await api.put(`/sla/${priority}`,{first_response_mins:Number(resp),resolution_mins:Number(res)});loadAll();alert(`${priority} SLA saved`);}catch(e){alert(e.response?.data?.error||'Failed');}}

  // ── Render ────────────────────────────────────────────────────────
  return(
    <div style={{fontFamily:'system-ui,sans-serif',fontSize:14,color:B.dark,height:'100vh',display:'flex',flexDirection:'column',background:B.bg}}>

      {/* CSAT popup (Point 3) */}
      {currentCsat&&<CSATPopup survey={currentCsat} onSubmit={handleCSATSubmit} onDismiss={handleCSATDismiss}/>}

      {/* Breach alert banner (Point 9) */}
      <BreachBanner alerts={breachAlerts} onDismiss={dismissBreach} onDismissAll={dismissAllBreaches} onOpenTicket={id=>{setDetail(id);}}/>

      {/* Navigation */}
      <div style={{height:52,background:B.navy,display:'flex',alignItems:'center',padding:'0 16px',gap:4,flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,.2)',overflowX:'auto'}}>
        <div style={{fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-0.5px',flexShrink:0,marginRight:8}}>Ticket<span style={{color:B.orange}}>Va</span></div>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{background:page===n.id?'rgba(255,255,255,.18)':'transparent',border:'none',color:page===n.id?'#fff':'rgba(255,255,255,.65)',padding:'5px 11px',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:page===n.id?600:400,display:'flex',alignItems:'center',gap:5,fontFamily:'inherit',flexShrink:0}}>
            {n.label}{!!n.count&&<span style={{background:n.urgent?B.orange:'rgba(255,255,255,.25)',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700}}>{n.count}</span>}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          {breachedTickets.length>0&&<div style={{background:'#E53E3E',color:'#fff',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>🚨 {breachedTickets.length} breach{breachedTickets.length>1?'es':''}</div>}
          <button onClick={()=>setExporting(true)} style={{background:'rgba(255,255,255,.15)',border:'none',color:'rgba(255,255,255,.8)',padding:'5px 10px',borderRadius:6,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>⬇ Export</button>
          <button onClick={()=>setCreating(true)} style={{background:B.orange,color:'#fff',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ New Ticket</button>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <Avatar name={user.name} size={28}/>
            <div><div style={{fontSize:11,fontWeight:600,color:'#fff'}}>{user.name}</div><div style={{fontSize:10,color:'rgba(255,255,255,.5)',textTransform:'capitalize'}}>{user.role}</div></div>
          </div>
          <button onClick={signOut} style={{background:'rgba(255,255,255,.1)',border:'none',color:'rgba(255,255,255,.7)',padding:'5px 8px',borderRadius:6,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>Sign out</button>
        </div>
      </div>

      <main style={{flex:1,overflow:'auto',padding:20}}>

        {/* DASHBOARD */}
        {page==='dashboard'&&<>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <div><div style={{fontSize:20,fontWeight:700,color:B.navy}}>Operations Dashboard</div><div style={{fontSize:12,color:B.light,marginTop:2}}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div>
            <Btn onClick={()=>{loadTickets();loadBreaches();}}>↻ Refresh</Btn>
          </div>

          {/* Breach warning on dashboard */}
          {breachedTickets.length>0&&<div style={{background:'#FFF5F5',border:'2px solid #E53E3E',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:20}}>🚨</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#9B2335'}}>{breachedTickets.length} ticket{breachedTickets.length>1?'s are':' is'} breaching SLA right now</div>
              <div style={{fontSize:12,color:'#9B2335',marginTop:2}}>{breachedTickets.slice(0,3).map(t=>t.ticket_number).join(', ')}{breachedTickets.length>3?` and ${breachedTickets.length-3} more`:''}</div>
            </div>
            <button onClick={()=>setPage('sla')} style={{marginLeft:'auto',background:'#E53E3E',color:'#fff',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,cursor:'pointer',fontWeight:600}}>View SLA Monitor →</button>
          </div>}

          <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:12,marginBottom:20}}>
            <MetricCard label="Open" value={active.length} color={B.navy} onClick={()=>setPage('tickets')}/>
            <MetricCard label="Urgent" value={active.filter(t=>t.priority==='Urgent').length} color="#E53E3E" onClick={()=>{setFilters(f=>({...f,priority:'Urgent'}));setPage('tickets');}}/>
            <MetricCard label="Escalated" value={escalated.length} color={B.orange} onClick={()=>setPage('sla')}/>
            <MetricCard label="SLA Breached" value={breachedTickets.length} color={breachedTickets.length>0?'#E53E3E':'#38A169'}/>
            <MetricCard label="Resolved" value={tickets.filter(t=>t.status==='Resolved').length} color="#38A169"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            <Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By status</div><BarChart data={[...new Set(tickets.map(t=>t.status))].map(s=>({label:s,count:tickets.filter(t=>t.status===s).length}))} color={B.teal} height={90}/></Card>
            <Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>By priority</div><BarChart data={PRIORITIES.map(p=>({label:p,count:tickets.filter(t=>t.priority===p).length}))} color={B.orange} height={90}/></Card>
          </div>
          <Card>
            <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:B.navy}}>Recent tickets</div>
              <button onClick={()=>setPage('tickets')} style={{marginLeft:'auto',background:'none',border:`1px solid ${B.border}`,padding:'5px 12px',borderRadius:6,cursor:'pointer',fontSize:12,color:B.teal}}>View all →</button>
            </div>
            <TicketTable rows={[...tickets].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,8)} onOpen={setDetail} loading={loading}/>
          </Card>
        </>}

        {/* ALL TICKETS */}
        {page==='tickets'&&<>
          <div style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:14}}>All Tickets</div>
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <input style={{...inpS,width:200}} placeholder="Search…" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))}/>
            <select style={inpS} value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}><option value=''>All statuses</option>{['New','Open','Assigned','In Progress','Pending','On Hold','Resolved','Closed','Escalated','Reopened'].map(s=><option key={s}>{s}</option>)}</select>
            <select style={inpS} value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}><option value=''>All priorities</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
            <select style={inpS} value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}><option value=''>All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select>
            <select style={inpS} value={filters.customer_id} onChange={e=>setFilters(f=>({...f,customer_id:e.target.value}))}><option value=''>All customers</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <Btn onClick={()=>setFilters({status:'',priority:'',category:'',customer_id:'',q:''})}>Clear</Btn>
            <span style={{marginLeft:'auto',fontSize:12,color:B.light}}>{tickets.length} tickets</span>
          </div>
          <TicketTable rows={tickets} onOpen={setDetail} loading={loading}/>
        </>}

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
                <thead><tr style={{background:B.bg}}>{['Ticket','Subject','Customer','Priority','Agent','Overall SLA','Status'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {slaData.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:B.light}}>No active tickets</td></tr>}
                  {slaData.map(t=>(
                    <tr key={t.id} onClick={()=>setDetail(t.id)} style={{cursor:'pointer',background:Number(t.sla_pct)>=90?'#FFF5F5':''}} onMouseEnter={e=>e.currentTarget.style.background=Number(t.sla_pct)>=90?'#FFE8E8':'#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=Number(t.sla_pct)>=90?'#FFF5F5':''}>
                      <td style={{padding:'10px 14px',fontSize:12,color:B.teal,fontWeight:600,borderBottom:`1px solid ${B.border}`}}>{Number(t.sla_pct)>=90&&'🚨 '}{t.ticket_number}</td>
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

        {page==='kpi'&&<KPIDashboard/>}
        {page==='csat'&&<CSATDashboard/>}
        {page==='ai'&&<AIToolsPage/>}

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
            {reports.byDay&&<Card><div style={{fontSize:13,fontWeight:700,color:B.navy,marginBottom:12}}>Daily volume</div><BarChart data={(reports.byDay||[]).map(d=>({label:d.day,count:Number(d.count)}))} color={B.teal} height={100}/></Card>}
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
        </>}

        {/* KB */}
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
                  {a.source_ticket_id&&<span style={{fontSize:11,background:'#FAF5FF',color:'#553C9A',padding:'2px 8px',borderRadius:10}}>AI generated</span>}
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
                    {c.industry&&<div style={{fontSize:11,color:B.light}}>{c.industry}</div>}
                    <div style={{fontSize:12,color:B.light,marginTop:2}}>{c.contact_email||'—'}</div>
                    <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
                      <span style={{fontSize:11,background:'#E6FFFA',color:'#1D6B5E',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{c.sla_tier}</span>
                      <span style={{fontSize:11,color:B.light}}>{c.ticket_count||0} tickets</span>
                      {c.attachment_retention_days&&<span style={{fontSize:10,background:'#EBF8FF',color:'#1a6b8a',padding:'2px 8px',borderRadius:10}}>{c.attachment_retention_days}d retention</span>}
                    </div>
                    <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                      {isAdmin&&<><Btn onClick={()=>setEditCustomer(c)} style={{fontSize:11,padding:'4px 10px'}}>Edit</Btn>
                      <Btn variant="danger" onClick={async()=>{if(window.confirm(`Delete "${c.name}"?`)){await api.delete(`/customers/${c.id}`);loadAll();}}} style={{fontSize:11,padding:'4px 10px'}}>Delete</Btn></>}
                      <Btn onClick={()=>{setFilters(f=>({...f,customer_id:c.id}));setPage('tickets');}} style={{fontSize:11,padding:'4px 10px',color:B.teal}}>Tickets</Btn>
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
                        <div style={{display:'flex',gap:4}}>
                          <Btn onClick={()=>setEditUser(u)} style={{fontSize:11,padding:'4px 8px'}}>Edit</Btn>
                          {u.id!==user.id&&<>
                            <Btn onClick={async()=>{await api.patch(`/users/${u.id}/deactivate`);api.get('/users').then(r=>setAllUsers(r.data.data||[]));}} style={{fontSize:11,padding:'4px 8px',color:'#D69E2E'}}>Deactivate</Btn>
                            <Btn variant="danger" onClick={async()=>{if(window.confirm(`Permanently delete "${u.name}"?`)){await api.delete(`/users/${u.id}`);api.get('/users').then(r=>setAllUsers(r.data.data||[])).catch(()=>{});}}} style={{fontSize:11,padding:'4px 8px'}}>Delete</Btn>
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
            <Card>
              <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:14}}>Global SLA Policies</div>
              {PRIORITIES.map(priority=>{
                const pol=globalSLAs.find(s=>s.priority===priority)||{first_response_mins:240,resolution_mins:1440};
                let resp=pol.first_response_mins,res=pol.resolution_mins;
                return(
                  <div key={priority} style={{borderBottom:`1px solid ${B.border}`,paddingBottom:12,marginBottom:12}}>
                    <div style={{marginBottom:8}}><PriBadge v={priority}/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <FG label="First response (mins)"><Inp type="number" defaultValue={pol.first_response_mins} onChange={e=>resp=e.target.value}/></FG>
                      <FG label="Resolution (mins)"><Inp type="number" defaultValue={pol.resolution_mins} onChange={e=>res=e.target.value}/></FG>
                    </div>
                    <Btn variant="primary" style={{fontSize:11,padding:'4px 14px'}} onClick={()=>saveSLA(priority,resp,res)}>Save</Btn>
                  </div>
                );
              })}
            </Card>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <Card>
                <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:14}}>Ticket Categories</div>
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
                  {categories.map((c,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:B.bg,borderRadius:8}}>
                      <span style={{fontSize:13}}>{c}</span>
                      <button onClick={async()=>{const{data}=await api.get('/admin/categories');const cat=data.data.find(x=>x.name===c);if(cat){await api.delete(`/admin/categories/${cat.id}`);loadAll();}}} style={{background:'none',border:'none',color:B.lighter,cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Inp id="new-cat" placeholder="New category…" style={{flex:1}}/>
                  <Btn variant="primary" onClick={async()=>{const inp=document.getElementById('new-cat');if(!inp?.value.trim())return;await api.post('/admin/categories',{name:inp.value.trim()});inp.value='';loadAll();}}>Add</Btn>
                </div>
              </Card>
              {/* Point 8 — Retention config visible only to admin */}
              <Card style={{border:`1px solid ${B.orange}33`,background:'#FFFAF0'}}>
                <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:6}}>🔒 Attachment Retention Policies</div>
                <div style={{fontSize:12,color:B.mid,marginBottom:12,lineHeight:1.6}}>Set per-customer attachment auto-deletion policy. Files are automatically deleted after the configured period and logged in the ticket audit trail. <strong>Admin only.</strong></div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {customers.map(c=>(
                    <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:B.white,borderRadius:8,border:`1px solid ${B.border}`}}>
                      <div style={{flex:1,fontSize:13,fontWeight:500}}>{c.name}</div>
                      <select value={c.attachment_retention_days||90} onChange={async e=>{await api.put(`/customers/${c.id}`,{attachment_retention_days:Number(e.target.value)});loadAll();}} style={{border:`1px solid ${B.border}`,borderRadius:6,padding:'4px 8px',fontSize:12,background:B.white,fontFamily:'inherit',cursor:'pointer'}}>
                        {RETENTION_OPTIONS.map(d=><option key={d} value={d}>{d} days</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:B.navy,marginBottom:6}}>Role Permissions</div>
            <div style={{fontSize:12,color:B.light,marginBottom:14}}>Toggle permissions live — no code change or redeployment required.</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
                <thead><tr style={{background:B.bg}}>
                  <th style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>Permission</th>
                  {ROLES.map(r=><th key={r} style={{padding:'9px 14px',textAlign:'center',fontSize:11,fontWeight:700,color:B.mid,borderBottom:`1px solid ${B.border}`,textTransform:'uppercase',letterSpacing:'.5px'}}>{r}</th>)}
                </tr></thead>
                <tbody>
                  {ALL_PERMS.map(perm=>(
                    <tr key={perm.key} onMouseEnter={e=>e.currentTarget.style.background='#F7FAFC'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,fontSize:13}}>{perm.label}</td>
                      {ROLES.map(role=>{
                        const allowed=getPermission(role,perm.key);
                        const isRetention=perm.key==='configure_retention';
                        return(
                          <td key={role} style={{padding:'10px 14px',borderBottom:`1px solid ${B.border}`,textAlign:'center'}}>
                            {isRetention&&role!=='admin'
                              ?<span style={{fontSize:14,color:'#CBD5E0'}}>—</span>
                              :<button onClick={()=>togglePermission(role,perm.key,allowed)}
                                style={{width:42,height:22,borderRadius:11,border:'none',cursor:'pointer',background:allowed?'#38A169':'#EDF2F7',position:'relative',transition:'background .2s'}}>
                                <span style={{position:'absolute',top:2,left:allowed?22:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
                              </button>
                            }
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

        {page==='help'&&<HelpPage currentUser={user}/>}

      </main>

      {/* Modals */}
      {detail&&<TicketDetail id={detail} agents={agents} categories={categories} customers={customers} currentUser={user} onClose={()=>{setDetail(null);loadTickets();loadBreaches();}} onRefreshAll={()=>{loadTickets();loadBreaches();}}/>}
      {creating&&<CreateModal agents={agents} categories={categories} customers={customers} onClose={()=>setCreating(false)} onCreated={loadTickets}/>}
      {exporting&&<ExportModal customers={customers} onClose={()=>setExporting(false)}/>}

      {/* User modal */}
      {editUser!==null&&(
        <Modal onClose={()=>setEditUser(null)} title={editUser.id?'Edit User':'Create User'} width={500}>
          <UserForm user={editUser.id?editUser:null} customers={customers} onSaved={()=>{api.get('/users').then(r=>setAllUsers(r.data.data||[])).catch(()=>{});setEditUser(null);}} onClose={()=>setEditUser(null)}/>
        </Modal>
      )}

      {/* Customer modal */}
      {editCustomer!==null&&(
        <Modal onClose={()=>setEditCustomer(null)} title={editCustomer.id?'Edit Customer':'Add Customer'} width={480}>
          <CustomerForm customer={editCustomer.id?editCustomer:null} onSaved={()=>{loadAll();setEditCustomer(null);}} onClose={()=>setEditCustomer(null)}/>
        </Modal>
      )}

      {/* KB modal */}
      {editKB!==null&&(
        <Modal onClose={()=>setEditKB(null)} title={editKB.id?'Edit Article':'New Article'} width={600}>
          <KBForm article={editKB.id?editKB:null} categories={categories} onSaved={()=>{api.get('/kb',{params:kbSearch?{q:kbSearch}:{}}).then(r=>setKbArticles(r.data.data||[])).catch(()=>{});setEditKB(null);}} onClose={()=>setEditKB(null)}/>
        </Modal>
      )}
    </div>
  );
}

// ── Inline Forms ──────────────────────────────────────────────────
function UserForm({user,customers,onSaved,onClose}){
  const bcrypt=null;
  const isNew=!user?.id;
  const [f,setF]=useState({name:user?.name||'',email:user?.email||'',role:user?.role||'agent',password:'',active:user?.active!==false,department:user?.department||'',phone:user?.phone||'',company_name:user?.company_name||'',customer_org_id:user?.customer_org_id||''});
  const [saving,setSaving]=useState(false);const [err,setErr]=useState('');
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit(){if(!f.name||!f.email){setErr('Name and email required');return;}if(isNew&&!f.password){setErr('Password required');return;}setSaving(true);try{if(isNew)await api.post('/users',f);else await api.put(`/users/${user.id}`,f);onSaved();}catch(e){setErr(e.response?.data?.error||'Failed');}finally{setSaving(false);}
  }
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {err&&<div style={{background:'#FFF5F5',border:'1px solid #FEB2B2',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#9B2335'}}>{err}</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <FG label="Full name *"><Inp value={f.name} onChange={set('name')} autoFocus/></FG>
        <FG label="Email *"><Inp type="email" value={f.email} onChange={set('email')}/></FG>
        <FG label="Role"><Sel value={f.role} onChange={set('role')}>{['admin','supervisor','agent','customer'].map(r=><option key={r}>{r}</option>)}</Sel></FG>
        <FG label="Status"><Sel value={f.active?'active':'inactive'} onChange={e=>setF(p=>({...p,active:e.target.value==='active'}))}><option value="active">Active</option><option value="inactive">Inactive</option></Sel></FG>
        <FG label="Department"><Inp value={f.department} onChange={set('department')} placeholder="IT, Operations…"/></FG>
        <FG label="Phone"><Inp value={f.phone} onChange={set('phone')}/></FG>
        <FG label="Company name"><Inp value={f.company_name} onChange={set('company_name')}/></FG>
        <FG label="Link to customer"><Sel value={f.customer_org_id} onChange={set('customer_org_id')}><option value=''>None</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></FG>
      </div>
      <FG label={isNew?'Password *':'New password (blank to keep)'}><Inp type="password" value={f.password} onChange={set('password')} placeholder={isNew?'Set password…':'Leave blank to keep current'}/></FG>
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Create User':'Save Changes'}</Btn></div>
    </div>
  );
}

function CustomerForm({customer,onSaved,onClose}){
  const isNew=!customer?.id;
  const [f,setF]=useState({name:customer?.name||'',contact_email:customer?.contact_email||'',contact_phone:customer?.contact_phone||'',account_manager:customer?.account_manager||'',sla_tier:customer?.sla_tier||'Standard',address:customer?.address||'',industry:customer?.industry||'',website:customer?.website||''});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit(){if(!f.name.trim()){alert('Name required');return;}setSaving(true);try{if(isNew)await api.post('/customers',f);else await api.put(`/customers/${customer.id}`,f);onSaved();}catch(e){alert(e.response?.data?.error||'Failed');}finally{setSaving(false);}
  }
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <FG label="Organisation name *"><Inp value={f.name} onChange={set('name')} autoFocus/></FG>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <FG label="Contact email"><Inp type="email" value={f.contact_email} onChange={set('contact_email')}/></FG>
        <FG label="Contact phone"><Inp value={f.contact_phone} onChange={set('contact_phone')}/></FG>
        <FG label="Account manager"><Inp value={f.account_manager} onChange={set('account_manager')}/></FG>
        <FG label="SLA tier"><Sel value={f.sla_tier} onChange={set('sla_tier')}>{SLA_TIERS.map(t=><option key={t}>{t}</option>)}</Sel></FG>
        <FG label="Industry"><Inp value={f.industry} onChange={set('industry')}/></FG>
        <FG label="Website"><Inp value={f.website} onChange={set('website')}/></FG>
      </div>
      <FG label="Address"><Inp value={f.address} onChange={set('address')}/></FG>
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Add Customer':'Save'}</Btn></div>
    </div>
  );
}

function KBForm({article,categories,onSaved,onClose}){
  const isNew=!article?.id;
  const [f,setF]=useState({title:article?.title||'',content:article?.content||'',category:article?.category||categories[0]||'',published:article?.published||false});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  async function submit(){setSaving(true);try{if(isNew)await api.post('/kb',f);else await api.put(`/kb/${article.id}`,f);onSaved();}catch(e){alert(e.response?.data?.error||'Failed');}finally{setSaving(false);}
  }
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <FG label="Title *"><Inp value={f.title} onChange={set('title')} autoFocus/></FG>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <FG label="Category"><Sel value={f.category} onChange={set('category')}>{categories.map(c=><option key={c}>{c}</option>)}</Sel></FG>
        <FG label="Status"><Sel value={f.published?'published':'draft'} onChange={e=>setF(p=>({...p,published:e.target.value==='published'}))}><option value="draft">Draft</option><option value="published">Published</option></Sel></FG>
      </div>
      <FG label="Content *"><textarea value={f.content} onChange={set('content')} style={{border:`1px solid ${B.border}`,borderRadius:8,padding:'10px 12px',fontSize:13,fontFamily:'inherit',minHeight:180,resize:'vertical',width:'100%',boxSizing:'border-box',outline:'none'}}/></FG>
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={saving}>{saving?'Saving…':isNew?'Create Article':'Save'}</Btn></div>
    </div>
  );
}
