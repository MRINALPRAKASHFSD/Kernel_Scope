import { useCallback, useEffect, useState } from 'react'
import { Activity, ArrowRight, Download, ExternalLink, Play, RefreshCw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, downloadUrl } from '../lib/api'
import type { SimulationRun } from '../lib/types'
import { useToast } from '../components/Toast'
import { Button, Card, EmptyState, ErrorNotice, LoadError, Loading, PageHeader, StatusPill, TableFrame } from '../components/ui'

function summary(run:SimulationRun){
  const result=run.result??{}
  if(run.category==='cpu')return (result.algorithms??[]).map((x:any)=>`${x.algorithm}: wait ${x.average_waiting}`).join(' · ')
  if(run.category==='memory')return (result.algorithms??[]).map((x:any)=>`${x.algorithm}: ${x.faults} faults`).join(' · ')
  if(run.category==='storage')return (result.algorithms??[]).map((x:any)=>`${x.algorithm}: ${x.total_head_movement} cyl`).join(' · ')
  if(run.category==='deadlock')return result.safe?`SAFE · ${(result.safe_sequence??[]).join(' → ')}`:`UNSAFE · ${(result.unfinished??[]).join(', ')}`
  return `CPU ${result.scheduling?.[1]?.average_waiting??'-'} avg wait · disk ${result.storage?.[2]?.total_head_movement??'-'} movement`
}

export default function HistoryPage(){
  const toast=useToast()
  const [items,setItems]=useState<SimulationRun[]>([])
  const [selected,setSelected]=useState<SimulationRun|null>(null)
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [error,setError]=useState('')
  const [pending,setPending]=useState<number|null>(null)
  const reload=useCallback(()=>{setLoading(true);setLoadError('');setItems([]);api<{items:SimulationRun[]}>('/simulations?limit=200').then(data=>setItems(data.items)).catch(e=>setLoadError(e instanceof Error?e.message:'Could not load simulation history.')).finally(()=>setLoading(false))},[])
  useEffect(()=>{reload()},[reload])
  const details=async(id:number)=>{setError('');try{const row=await api<SimulationRun>(`/simulations/${id}`);setSelected(row)}catch(e){setError(e instanceof Error?e.message:'Could not load run details.')}}
  const remove=async(run:SimulationRun)=>{if(!window.confirm(`Delete simulation run #${run.id}?`))return;try{await api(`/simulations/${run.id}`,{method:'DELETE'});setItems(rows=>rows.filter(item=>item.id!==run.id));if(selected?.id===run.id)setSelected(null);toast('Simulation record deleted.')}catch(e){setError(e instanceof Error?e.message:'Run could not be deleted.')}}
  const rerun=async(run:SimulationRun)=>{setPending(run.id);setError('');try{const category=run.category==='storage'?'disk':run.category;const body=run.category==='integrated'?{dataset:run.input_snapshot.dataset,dataset_id:run.dataset_id}:{...run.input_snapshot,dataset_id:run.dataset_id??undefined};const created=await api<SimulationRun>(`/simulations/${category}`,{method:'POST',body:JSON.stringify(body)});setItems(rows=>[created,...rows]);toast(`Run #${run.id} replayed as run #${created.id}.`)}catch(e){setError(e instanceof Error?e.message:'Historical input could not be replayed.')}finally{setPending(null)}}
  if(loading)return <><PageHeader title="Simulation history" description="SQLite run log with saved input snapshots and replay actions."/><Loading/></>
  if(loadError)return <><PageHeader title="Simulation history" description="SQLite run log with saved input snapshots and replay actions."/><LoadError message={loadError} onRetry={reload} retryLabel="Retry loading history"/></>
  return <><PageHeader eyebrow="WORKSPACE / HISTORY" title="Simulation history" description="Browse recorded runs, inspect raw input/output JSON, replay past snapshots, and export reports." action={<Button variant="secondary" onClick={reload}><RefreshCw size={16}/> Refresh</Button>}/>
    {error&&<div className="gap-bottom"><ErrorNotice>{error}</ErrorNotice></div>}
    <Card><div className="panel-heading"><div><div className="eyebrow">SQLITE RECORDS</div><h2>Executed simulations</h2></div><span className="count-chip">{items.length} runs</span></div>
      {items.length?<TableFrame minWidth={920}><caption>Saved simulation runs, newest records first</caption><thead><tr><th>Run</th><th>Domain</th><th>Configuration</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{items.map(run=><tr key={run.id}><td className="strong-cell">#{run.id}</td><td><span className="category-tag">{run.category}</span></td><td className="history-summary">{summary(run)}</td><td><StatusPill status={run.status}/></td><td>{new Date(run.created_at).toLocaleString()}</td><td><div className="inline-actions"><button className="text-action" onClick={()=>void details(run.id)}>Details</button><button className="icon-button" title="Replay input" aria-label={`Replay run ${run.id}`} onClick={()=>void rerun(run)} disabled={pending===run.id}>{pending===run.id?<span className="button-spinner small-spinner"/>:<Play size={14}/>}</button><a className="icon-button" title="Export JSON" aria-label={`Export run ${run.id}`} href={downloadUrl(`/reports/${run.id}/export?format=json`)}><Download size={14}/></a><button className="icon-button danger-icon" title="Delete run" aria-label={`Delete run ${run.id}`} onClick={()=>void remove(run)}><Trash2 size={14}/></button></div></td></tr>)}</tbody></TableFrame>:<EmptyState title="No simulation records" detail="Run a simulator to create persistent history."/>}
    </Card>
    {selected&&<Card className="details-panel"><div className="panel-heading"><div><div className="eyebrow">RUN #{selected.id} · {selected.category.toUpperCase()}</div><h2>Stored result</h2></div><div className="button-row"><Link to="/reports" className="button button-secondary"><ExternalLink size={15}/> Open reports</Link><button className="icon-button" aria-label="Close run details" onClick={()=>setSelected(null)}>×</button></div></div><div className="details-metadata"><span><small>Status</small><StatusPill status={selected.status}/></span><span><small>Dataset</small>{selected.dataset_id??'Unsaved snapshot'}</span><span><small>Created</small>{new Date(selected.created_at).toLocaleString()}</span><span><small>Selected</small>{selected.selected_algorithm}</span></div><div className="snapshot-grid"><div><div className="subheading">Input snapshot</div><pre className="code-block">{JSON.stringify(selected.input_snapshot,null,2)}</pre></div><div><div className="subheading">Measured result</div>{selected.result?<pre className="code-block result-json">{JSON.stringify(selected.result,null,2)}</pre>:<div className="notice notice-error">{selected.error_message??'This run did not complete.'}</div>}</div></div></Card>}
  </>
}
