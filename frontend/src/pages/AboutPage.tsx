import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Code2, Database, ExternalLink, Server, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { Card, EmptyState, LoadError, Loading, PageHeader, StatusPill } from '../components/ui'

const explanations=[
  {name:'FCFS',domain:'CPU / Disk',text:'Serves work in its arrival order. Simple and reproducible, though later requests can wait behind long work.'},
  {name:'SJF',domain:'CPU',text:'Chooses the shortest burst among processes already ready. This implementation is non-preemptive and uses stable tie-breaking.'},
  {name:'Round Robin',domain:'CPU',text:'Shares CPU time in fixed quanta. Newly arrived work joins the queue before the just-run process re-enters.'},
  {name:'FIFO',domain:'Memory',text:'Replaces the resident page that entered memory first.'},
  {name:'LRU',domain:'Memory',text:'Replaces the page with the oldest recent reference.'},
  {name:'Optimal',domain:'Memory',text:'Uses future references to select a theoretical lower-fault bound; it is not an online policy.'},
  {name:"Banker's safety",domain:'Deadlock',text:'Computes Need and releases allocations in a safe completion order when one exists. Unsafe is not proof of current deadlock.'},
  {name:'SSTF',domain:'Disk',text:'Serves the request nearest to the current head, resolving equal distances by input order.'},
  {name:'SCAN',domain:'Disk',text:'Sweeps to the selected physical endpoint for each nonempty queue. Endpoint travel counts toward movement before reversing to remaining requests.'},
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
  return <><PageHeader eyebrow="SYSTEM / DOCUMENTATION" title="About OS Resource Lab" description="A local academic platform connecting validated operating-system simulations with persistent results and analytics."/>
    <div className="about-hero"><div className="about-emblem"><Code2 size={25}/></div><div><div className="eyebrow">PROJECT OVERVIEW</div><h2>One simulation engine, multiple ways to learn.</h2><p>The web API and the original command-line interface both use the Python functions in <code>os_sim/</code>. The browser submits real inputs, the backend records a reproducible snapshot in SQLite, and the returned trace drives the visualizations.</p></div></div>
    <div className="about-grid"><Card><div className="panel-heading"><div><div className="eyebrow">APPLICATION STACK</div><h2>Local architecture</h2></div><Server size={18} className="muted-icon"/></div><div className="stack-list"><div><b>Frontend</b><span>React · TypeScript · Vite · Tailwind · React Router · Recharts · Lucide</span></div><div><b>Backend</b><span>FastAPI · Pydantic · SQLAlchemy · Alembic · Uvicorn</span></div><div><b>Data</b><span>SQLite locally; configured through DATABASE_URL for later database support</span></div><div><b>Simulation core</b><span>Existing Python algorithms in os_sim; no JavaScript calculation copies</span></div></div></Card><Card><div className="panel-heading"><div><div className="eyebrow">SERVICE STATUS</div><h2>Connected components</h2></div><Database size={18} className="muted-icon"/></div><div className="service-status"><div><span>FastAPI backend</span><StatusPill status={health==='online'?'online':health==='offline'?'offline':'checking'}/></div><div><span>Persistent database</span><span className="service-value">Local SQLAlchemy store</span></div><div><span>OpenAPI reference</span><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">Open /docs <ExternalLink size={13}/></a></div></div></Card></div>
    <Card className="gap-top"><div className="panel-heading"><div><div className="eyebrow">ALGORITHM CATALOG</div><h2>Policies available to compare</h2></div>{!catalogLoading&&!catalogError&&<span className="count-chip">{catalog.length} registered</span>}</div>{catalogLoading?<Loading label="Loading algorithm definitions from API"/>:catalogError?<LoadError message={catalogError} onRetry={loadCatalog} retryLabel="Retry loading algorithm catalog"/>:catalog.length?<div className="algorithm-catalog">{catalog.map(item=><div className="catalog-row" key={`${item.category}-${item.name}`}><span className="catalog-code">{item.name}</span><span className="category-tag">{item.category}</span><span>{item.label}</span></div>)}</div>:<EmptyState title="No algorithms registered" detail="The API returned an empty algorithm catalog."/>}</Card>
    <Card className="gap-top"><div className="panel-heading"><div><div className="eyebrow">MODEL ASSUMPTIONS</div><h2>How to interpret results</h2></div><ShieldCheck size={18} className="muted-icon"/></div><div className="explanation-grid">{explanations.map(item=><div className="explanation-item" key={item.name}><div><b>{item.name}</b><span>{item.domain}</span></div><p>{item.text}</p></div>)}</div><div className="info-callout gap-top">CPU uses a single core with no context-switch costs. Disk movement is measured in cylinders, not physical access time. Page Optimal assumes future knowledge. Banker analyzes a static resource snapshot. These limitations are part of the model.</div></Card>
    <div className="about-grid gap-top"><Card><div className="eyebrow">REPRODUCE THE ORIGINAL CLI</div><h2>Keep the Bash workflow</h2><pre className="code-block">{`./run.sh --mode demo --dataset samples/baseline.json --output outputs\npython3 -m unittest discover -s tests -v`}</pre></Card><Card><div className="eyebrow">REPRODUCE THE WEB WORKFLOW</div><h2>Start the integrated app</h2><pre className="code-block">{`./start_web.sh\n# UI:       http://localhost:5173\n# API docs: http://localhost:8000/docs`}</pre><span className="service-value">Setup and assessment details are in README.md in the project root.</span></Card></div>
  </>
}
