import { useCallback, useEffect, useState } from 'react'
import { Code2, Database, ExternalLink, Server, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { Card, EmptyState, LoadError, Loading, PageHeader, StatusPill } from '../components/ui'

const explanations=[
  {name:'FCFS',domain:'CPU / Disk',text:'Dispatches ready processes or disk cylinder requests in arrival order. Deterministic and starvation-free, though short work can queue behind long bursts or distant seeks.'},
  {name:'SJF',domain:'CPU',text:'Selects the shortest CPU burst among processes that have already arrived. Non-preemptive, breaking equal-burst ties by arrival time and input order.'},
  {name:'Round Robin',domain:'CPU',text:'Preempts running work after a fixed integer quantum. Arrivals landing on or before the slice boundary enter the ready deque ahead of the preempted process.'},
  {name:'FIFO',domain:'Memory',text:'Evicts whichever resident page entered memory earliest, tracking residency order rather than recent access.'},
  {name:'LRU',domain:'Memory',text:'Evicts the resident page whose most recent reference is oldest, approximating temporal locality.'},
  {name:'Optimal',domain:'Memory',text:'Looks ahead in the reference trace to evict the page needed farthest in the future (or never referenced again). Offline lower-bound benchmark, not an online OS policy.'},
  {name:"Banker's safety",domain:'Deadlock',text:'Computes Need = Maximum - Allocation and checks whether every process can finish using Available plus released allocations. An unsafe snapshot signals deadlock risk, not an active deadlock.'},
  {name:'SSTF',domain:'Disk',text:'Moves the disk arm to the pending request with minimum cylinder distance from the current head, breaking ties by input index.'},
  {name:'SCAN',domain:'Disk',text:'Sweeps across pending requests all the way to physical cylinder 0 or cylinders - 1 on every non-empty queue, counting the boundary trip before reversing.'},
]

export default function AboutPage(){
  const [health,setHealth]=useState<'checking'|'online'|'offline'>('checking')
  const [catalog,setCatalog]=useState<Array<{category:string;name:string;label:string}>>([])
  const [catalogLoading,setCatalogLoading]=useState(true)
  const [catalogError,setCatalogError]=useState('')
  const loadCatalog=useCallback(()=>{
    setCatalogLoading(true)
    setCatalogError('')
    api<{algorithms:Array<{category:string;name:string;label:string}>}>('/algorithms')
      .then(data=>setCatalog(data.algorithms))
      .catch(error=>setCatalogError(error instanceof Error?error.message:'Could not load algorithm definitions.'))
      .finally(()=>setCatalogLoading(false))
  },[])
  useEffect(()=>{api('/health').then(()=>setHealth('online')).catch(()=>setHealth('offline'));void loadCatalog()},[loadCatalog])
  return <><PageHeader eyebrow="SYSTEM / DOCUMENTATION" title="About KernelScope" description="Local operating-system resource simulator pairing the Python os_sim package with SQLite persistence and browser trace views."/>
    <div className="about-hero"><div className="about-emblem"><Code2 size={25}/></div><div><div className="eyebrow">PROJECT OVERVIEW</div><h2>Shared Python engine across CLI and browser workflows</h2><p>Both <code>run.sh</code> and the FastAPI backend execute the same functions in <code>os_sim/</code>. Submitting a workload from the browser validates the payload in Pydantic, stores the input snapshot and computed trace in SQLite, and renders charts directly from that saved record.</p></div></div>
    <div className="about-grid"><Card><div className="panel-heading"><div><div className="eyebrow">APPLICATION STACK</div><h2>Local architecture</h2></div><Server size={18} className="muted-icon"/></div><div className="stack-list"><div><b>Frontend</b><span>React · TypeScript · Vite · Tailwind · React Router · Recharts · Lucide</span></div><div><b>Backend</b><span>FastAPI · Pydantic · SQLAlchemy · Alembic · Uvicorn</span></div><div><b>Data</b><span>SQLite by default; overridable through DATABASE_URL in .env</span></div><div><b>Simulation core</b><span>Standard-library Python modules in os_sim/ with zero client-side reimplementation</span></div></div></Card><Card><div className="panel-heading"><div><div className="eyebrow">SERVICE STATUS</div><h2>Connected components</h2></div><Database size={18} className="muted-icon"/></div><div className="service-status"><div><span>FastAPI backend</span><StatusPill status={health==='online'?'online':health==='offline'?'offline':'checking'}/></div><div><span>Persistent database</span><span className="service-value">Local SQLAlchemy store</span></div><div><span>OpenAPI reference</span><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">Open /docs <ExternalLink size={13}/></a></div></div></Card></div>
    <Card className="gap-top"><div className="panel-heading"><div><div className="eyebrow">ALGORITHM CATALOG</div><h2>Policies available to compare</h2></div>{!catalogLoading&&!catalogError&&<span className="count-chip">{catalog.length} registered</span>}</div>{catalogLoading?<Loading label="Loading algorithm definitions from API"/>:catalogError?<LoadError message={catalogError} onRetry={loadCatalog} retryLabel="Retry loading algorithm catalog"/>:catalog.length?<div className="algorithm-catalog">{catalog.map(item=><div className="catalog-row" key={`${item.category}-${item.name}`}><span className="catalog-code">{item.name}</span><span className="category-tag">{item.category}</span><span>{item.label}</span></div>)}</div>:<EmptyState title="No algorithms registered" detail="The API returned an empty algorithm catalog."/>}</Card>
    <Card className="gap-top"><div className="panel-heading"><div><div className="eyebrow">MODEL ASSUMPTIONS</div><h2>How to interpret results</h2></div><ShieldCheck size={18} className="muted-icon"/></div><div className="explanation-grid">{explanations.map(item=><div className="explanation-item" key={item.name}><div><b>{item.name}</b><span>{item.domain}</span></div><p>{item.text}</p></div>)}</div><div className="info-callout gap-top">CPU scheduling models one core with integer bursts and zero context-switch overhead. Disk scheduling counts cylinder travel rather than rotational delay or SSD flash latency. Optimal paging requires future reference knowledge, and Banker's safety checks a static allocation snapshot.</div></Card>
    <div className="about-grid gap-top"><Card><div className="eyebrow">COMMAND-LINE WORKFLOW</div><h2>Run the Bash and Python CLI</h2><pre className="code-block">{`./run.sh --mode demo --dataset samples/baseline.json --output outputs\npython3 -m unittest discover -s tests -v`}</pre></Card><Card><div className="eyebrow">WEB WORKBENCH WORKFLOW</div><h2>Start FastAPI and Vite locally</h2><pre className="code-block">{`./start_web.sh\n# UI:       http://localhost:5173\n# API docs: http://localhost:8000/docs`}</pre><span className="service-value">Full setup, test commands, and phase checklists live in README.md at the repository root.</span></Card></div>
  </>
}
