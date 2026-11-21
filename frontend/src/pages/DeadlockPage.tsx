import { useEffect, useState } from 'react'
import { CheckCircle2, CirclePlus, Minus, Play, Save, ShieldAlert, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import type { Dataset, SimulationRun } from '../lib/types'
import { useToast } from '../components/Toast'
import { Button, Card, EmptyState, ErrorNotice, PageHeader, TableFrame } from '../components/ui'

type Matrices={available:number[];maximum:number[][];allocation:number[][];declared_totals?:number[]}
const baseline:Matrices={available:[3,3,2],maximum:[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]],allocation:[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]]}
const unsafe:Matrices={available:[0],maximum:[[2],[2]],allocation:[[1],[1]]}

function Matrix({title,rows,columns,onChange}:{title:string;rows:number[][];columns:number;onChange:(r:number,c:number,value:number)=>void}){
  return <div className="matrix-block"><div className="subheading">{title}</div><div className="table-wrap matrix-scroll" role="region" aria-label={title + " matrix"} tabIndex={0}><table className="matrix-table"><caption className="sr-only">{title} by process and resource type</caption><thead><tr><th scope="col">Process</th>{Array.from({length:columns},(_,j)=><th scope="col" key={j}>R{j+1}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}><th scope="row">P{i}</th>{Array.from({length:columns},(_,j)=><td key={j}><input aria-label={`${title} P${i} R${j+1}`} type="number" min="0" value={row[j]??0} onChange={e=>onChange(i,j,Number(e.target.value))}/></td>)}</tr>)}</tbody></table></div></div>
}

function matrixText(rows:number[][]){return rows.map(row=>row.join(', ')).join('\n')}
function parseMatrix(text:string){const lines=text.trim().split(/\n/).filter(Boolean);if(!lines.length)return null;const rows=lines.map(line=>line.split(/[\s,]+/).filter(Boolean));if(rows.some(row=>row.some(value=>!/^\d+$/.test(value))))return null;return rows.map(row=>row.map(Number))}

export default function DeadlockPage(){
  const toast=useToast()
  const [matrix,setMatrix]=useState<Matrices>(baseline)
  const [totalsEnabled,setTotalsEnabled]=useState(false)
  const [totalsText,setTotalsText]=useState('')
  const [datasetId,setDatasetId]=useState<number|undefined>()
  const [datasets,setDatasets]=useState<Dataset[]>([])
  const [run,setRun]=useState<SimulationRun|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const result=run?.result
  useEffect(()=>{api<{items:Dataset[]}>('/datasets').then(data=>setDatasets(data.items)).catch(()=>undefined)},[])
  const updateCell=(key:'maximum'|'allocation',row:number,column:number,value:number)=>setMatrix(old=>({...old,[key]:old[key].map((values,i)=>i===row?values.map((cell,j)=>j===column?value:cell):values)}))
  const addProcess=()=>setMatrix(old=>({...old,maximum:[...old.maximum,Array(old.available.length).fill(0)],allocation:[...old.allocation,Array(old.available.length).fill(0)]}))
  const removeProcess=()=>setMatrix(old=>old.maximum.length<=1?old:{...old,maximum:old.maximum.slice(0,-1),allocation:old.allocation.slice(0,-1)})
  const addResource=()=>setMatrix(old=>({...old,available:[...old.available,0],maximum:old.maximum.map(row=>[...row,0]),allocation:old.allocation.map(row=>[...row,0])}))
  const removeResource=()=>setMatrix(old=>old.available.length<=1?old:{...old,available:old.available.slice(0,-1),maximum:old.maximum.map(row=>row.slice(0,-1)),allocation:old.allocation.map(row=>row.slice(0,-1))})
  const loadSample=async(which:'Bundled Baseline'|'Bundled Unsafe')=>{try{const data=await api<{items:Dataset[]}>('/datasets');setDatasets(data.items);const item=data.items.find(row=>row.name===which);if(!item)throw new Error('Bundled sample not found.');setMatrix(item.config.deadlock);setDatasetId(item.id);setTotalsEnabled(false);setRun(null);setError('');toast(`${which} Banker data loaded.`)}catch(e){setError(e instanceof Error?e.message:'Could not load sample.')}}
  const validate=()=>{
    const n=matrix.maximum.length,r=matrix.available.length
    if(!n||matrix.allocation.length!==n)return 'Maximum and allocation must have the same nonzero process count.'
    if(matrix.maximum.some(row=>row.length!==r)||matrix.allocation.some(row=>row.length!==r))return 'Every matrix row must match the resource count.'
    if(matrix.available.some(value=>!Number.isInteger(value)||value<0)||matrix.maximum.flat().some(value=>!Number.isInteger(value)||value<0)||matrix.allocation.flat().some(value=>!Number.isInteger(value)||value<0))return 'Resource values must be nonnegative integers.'
    if(matrix.allocation.some((row,i)=>row.some((value,j)=>value>matrix.maximum[i][j])))return 'Allocation cannot exceed a process maximum.'
    if(totalsEnabled){const totals=parseIntegerList(totalsText);if(!totals||totals.length!==r)return `Enter ${r} declared totals.`;const actual=matrix.available.map((value,j)=>value+matrix.allocation.reduce((sum,row)=>sum+row[j],0));if(actual.some((value,j)=>value!==totals[j]))return `Declared totals should be ${actual.join(', ')} for this snapshot.`}
    return ''
  }
  const parseIntegerList=(value:string)=>{const parts=value.split(/[\s,]+/).filter(Boolean);return parts.length&&parts.every(part=>/^\d+$/.test(part))?parts.map(Number):null}
  const execute=async()=>{const issue=validate();if(issue){setError(issue);return}setError('');setBusy(true);try{const request:any={...matrix,dataset_id:datasetId};if(totalsEnabled)request.declared_totals=parseIntegerList(totalsText);const saved=await api<SimulationRun>('/simulations/deadlock',{method:'POST',body:JSON.stringify(request)});setRun(saved);toast(`Banker's check saved as ${saved.result?.safe?'SAFE':'UNSAFE'}.`)}catch(e){setError(e instanceof Error?e.message:'Safety check failed.')}finally{setBusy(false)}}
  const saveDataset=async()=>{const issue=validate();if(issue){setError(issue);return}try{const item=await api<Dataset>('/datasets',{method:'POST',body:JSON.stringify({name:`Banker scenario ${new Date().toLocaleString()}`,description:'Created from the deadlock simulator.',category:'deadlock',config:matrix})});setDatasets(rows=>[item,...rows]);setDatasetId(item.id);toast('Deadlock dataset saved.')}catch(e){setError(e instanceof Error?e.message:'Dataset save failed.')}}
  return <>
    <PageHeader eyebrow="SIMULATION / DEADLOCK" title="Deadlock handling" description="Edit the allocation snapshot and inspect the Need matrix and resource-release sequence." action={<div className="button-row"><Button variant="secondary" onClick={()=>loadSample('Bundled Baseline')}>Load safe sample</Button><Button variant="secondary" onClick={()=>loadSample('Bundled Unsafe')}>Load unsafe sample</Button></div>}/>
    <div className="simulator-grid deadlock-grid"><Card><div className="panel-heading"><div><div className="eyebrow">RESOURCE SNAPSHOT</div><h2>Processes & resources</h2></div><div className="matrix-actions"><button title="Add process" aria-label="Add process" className="icon-button" onClick={addProcess}><CirclePlus size={17}/><small>Process</small></button><button title="Remove process" aria-label="Remove process" className="icon-button" onClick={removeProcess}><Minus size={17}/></button><button title="Add resource" aria-label="Add resource type" className="icon-button" onClick={addResource}><CirclePlus size={17}/><small>Resource</small></button><button title="Remove resource" aria-label="Remove resource type" className="icon-button" onClick={removeResource}><Minus size={17}/></button></div></div>
      <div className="available-row"><strong>Available</strong>{matrix.available.map((value,index)=><label className="vector-cell" key={index}><small>R{index+1}</small><input aria-label={`Available R${index+1}`} type="number" min="0" value={value} onChange={e=>setMatrix(old=>({...old,available:old.available.map((v,i)=>i===index?Number(e.target.value):v)}))}/></label>)}</div>
      <Matrix title="Maximum demand" rows={matrix.maximum} columns={matrix.available.length} onChange={(r,c,v)=>updateCell('maximum',r,c,v)}/><Matrix title="Current allocation" rows={matrix.allocation} columns={matrix.available.length} onChange={(r,c,v)=>updateCell('allocation',r,c,v)}/>
      <label className="toggle-line"><input type="checkbox" checked={totalsEnabled} onChange={e=>setTotalsEnabled(e.target.checked)}/> Validate declared total resources</label>{totalsEnabled&&<label className="field gap-small"><span>Total instances by resource</span><input value={totalsText} onChange={e=>setTotalsText(e.target.value)} placeholder="10, 5, 7"/><small>Must equal available plus currently allocated instances.</small></label>}
      <label className="field gap-top"><span>Dataset association</span><select value={datasetId??''} onChange={e=>setDatasetId(e.target.value?Number(e.target.value):undefined)}><option value="">Unsaved input snapshot</option>{datasets.filter(item=>item.category==='deadlock'||item.category==='integrated').map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {error&&<div className="gap-top"><ErrorNotice>{error}</ErrorNotice></div>}<div className="form-actions"><Button onClick={execute} disabled={busy}>{busy?<span className="button-spinner"/>:<Play size={16}/>} Run safety check</Button><Button variant="secondary" onClick={saveDataset}><Save size={16}/> Save as dataset</Button></div>
    </Card>
    <Card className="result-summary"><div className="panel-heading"><div><div className="eyebrow">BANKER'S SAFETY TEST</div><h2>Safety analysis</h2></div>{result&&<span className={`result-badge ${result.safe?'badge-safe':'badge-unsafe'}`}>{result.safe?<ShieldCheck size={15}/>:<ShieldAlert size={15}/>} {result.safe?'SAFE':'UNSAFE'}</span>}</div>
      {result?<><div className={`safety-banner ${result.safe?'safe-banner':'unsafe-banner'}`}>{result.safe?<CheckCircle2 size={20}/>:<ShieldAlert size={20}/>}<div><strong>{result.safe?'A safe sequence exists.':'No safe completion sequence was found.'}</strong><span>{result.safe?'Each process can finish in the displayed order and release its allocation.':'The snapshot is unsafe; this does not prove a deadlock is currently occurring.'}</span></div></div>
        {result.safe&&<div className="sequence-flow" role="list" aria-label="Safe process completion sequence">{result.safe_sequence.map((pid:string,index:number)=><span className="sequence-node" role="listitem" aria-label={"Step "+(index+1)+": process "+pid} key={pid}><small>STEP {index+1}</small><b>{pid}</b>{index<result.safe_sequence.length-1&&<span className="sequence-arrow" aria-hidden="true">→</span>}</span>)}</div>}
        <div className="subheading gap-top">Need matrix</div><TableFrame minWidth={410}><caption>Remaining resources each process requires by resource type</caption><thead><tr><th>Process</th>{matrix.available.map((_,i)=><th key={i}>R{i+1}</th>)}</tr></thead><tbody>{result.need.map((row:number[],i:number)=><tr key={i}><td className="strong-cell">P{i}</td>{row.map((value:number,j:number)=><td key={j}>{value}</td>)}</tr>)}</tbody></TableFrame>
        {result.trace?.length>0&&<><div className="subheading gap-top">Available resources after each completion</div><TableFrame minWidth={440}><caption>Available resource counts after each safe-sequence completion</caption><thead><tr><th>Completed</th>{matrix.available.map((_,i)=><th key={i}>R{i+1} available</th>)}</tr></thead><tbody>{result.trace.map((item:any,index:number)=><tr key={`${item.completed}-${index}`}><td className="strong-cell">{item.completed}</td>{item.available_after.map((value:number,j:number)=><td key={j}>{value}</td>)}</tr>)}</tbody></TableFrame></>}
        {!result.safe&&<div className="notice notice-error gap-top">Unfinished processes: {(result.unfinished??[]).join(', ')||'none'}</div>}
      </>:<EmptyState title="No safety analysis yet" detail="Run Banker's algorithm to record the Need matrix and resource trace."/>}
    </Card></div>
    <div className="info-callout gap-top"><strong>Model note</strong> The safety algorithm analyzes a static resource snapshot. An unsafe result is not evidence that a deadlock is already happening.</div>
  </>
}
