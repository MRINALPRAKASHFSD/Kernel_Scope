import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Save } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { parseIntegerList } from '../lib/validation'
import type { Dataset, MemoryResult, SimulationRun } from '../lib/types'
import { useToast } from '../components/Toast'
import { AlgorithmChecks, Button, Card, EmptyState, ErrorNotice, Field, Metric, PageHeader, TableFrame } from '../components/ui'

const choices=['FIFO','LRU','OPT']
const sample=[7,0,1,2,0,3,0,4,2,3,0,3,2]

export default function MemoryPage(){
  const toast=useToast()
  const [sequence,setSequence]=useState(sample.join(', '))
  const [frames,setFrames]=useState(3)
  const [algorithms,setAlgorithms]=useState(choices)
  const [datasets,setDatasets]=useState<Dataset[]>([])
  const [datasetId,setDatasetId]=useState<number|undefined>()
  const [run,setRun]=useState<SimulationRun|null>(null)
  const [active,setActive]=useState('FIFO')
  const [step,setStep]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const results=(run?.result?.algorithms??[]) as MemoryResult[]
  const current=results.find(item=>item.algorithm===active)??results[0]
  const trace=current?.trace??[]
  const point=trace[step]
  const previous=trace[step-1]
  const replaced=point&&point.result==='FAULT'&&previous?.frames.length===frames?previous.frames.find(page=>!point.frames.includes(page)):undefined
  const chartData=useMemo(()=>results.map(item=>({algorithm:item.algorithm,faults:item.faults,hits:item.hits})),[results])
  useEffect(()=>{api<{items:Dataset[]}>('/datasets').then(data=>setDatasets(data.items)).catch(()=>undefined)},[])
  useEffect(()=>{setStep(0);setPlaying(false)},[active,run])
  useEffect(()=>{if(!playing)return;const timer=window.setInterval(()=>setStep(index=>{if(index>=trace.length-1){setPlaying(false);return index}return index+1}),800);return()=>window.clearInterval(timer)},[playing,trace.length])
  const loadBaseline=async()=>{try{const data=await api<{items:Dataset[]}>('/datasets');setDatasets(data.items);const item=data.items.find(row=>row.name==='Bundled Baseline');if(!item)throw new Error('Bundled baseline dataset is unavailable.');setSequence(item.config.memory.references.join(', '));setFrames(item.config.memory.frames);setDatasetId(item.id);setError('');toast('Bundled memory reference string loaded.')}catch(e){setError(e instanceof Error?e.message:'Could not load sample.')}}
  const execute=async()=>{const refs=parseIntegerList(sequence);if(!refs){setError('Enter one or more whole-number page references separated by commas or spaces.');return}if(refs.some(page=>page<0)){setError('Page references must be nonnegative.');return}if(!Number.isInteger(frames)||frames<1){setError('Frame count must be a positive integer.');return}if(!algorithms.length){setError('Select at least one replacement policy.');return}setBusy(true);setError('');setPlaying(false);try{const saved=await api<SimulationRun>('/simulations/memory',{method:'POST',body:JSON.stringify({references:refs,frames,algorithms,dataset_id:datasetId})});setRun(saved);setActive(saved.result?.algorithms?.[0]?.algorithm??'FIFO');toast('Memory simulation saved to history.')}catch(e){setError(e instanceof Error?e.message:'Simulation failed.')}finally{setBusy(false)}}
  const saveDataset=async()=>{const refs=parseIntegerList(sequence);if(!refs||refs.some(page=>page<0)||frames<1){setError('Check the reference sequence and frame count before saving.');return}try{const item=await api<Dataset>('/datasets',{method:'POST',body:JSON.stringify({name:`Memory scenario ${new Date().toLocaleString()}`,description:'Created from the memory simulator.',category:'memory',config:{references:refs,frames}})});setDatasets(rows=>[item,...rows]);setDatasetId(item.id);toast('Memory dataset saved.')}catch(e){setError(e instanceof Error?e.message:'Dataset save failed.')}}
  return <>
    <PageHeader eyebrow="SIMULATION / MEMORY" title="Memory management" description="Step through FIFO, LRU, and offline Optimal page replacement traces one reference at a time." action={<Button variant="secondary" onClick={loadBaseline}>Load baseline</Button>}/>
    <div className="simulator-grid">
      <Card><div className="panel-heading"><div><div className="eyebrow">REFERENCE INPUT</div><h2>Page stream</h2></div></div>
        <label className="field"><span>Page-reference sequence</span><textarea rows={3} value={sequence} onChange={e=>setSequence(e.target.value)} placeholder="7, 0, 1, 2, 0, 3"/><small>Separate page numbers with commas or spaces.</small></label>
        <div className="form-row gap-top"><Field label="Frame capacity" type="number" min={1} value={frames} onChange={e=>setFrames(Number(e.target.value))}/><label className="field"><span>Dataset association</span><select value={datasetId??''} onChange={e=>setDatasetId(e.target.value?Number(e.target.value):undefined)}><option value="">Unsaved input snapshot</option>{datasets.filter(item=>item.category==='memory'||item.category==='integrated').map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        <div className="field gap-top"><span>Replacement policies</span><AlgorithmChecks options={choices} selected={algorithms} onChange={setAlgorithms}/></div>
        <div className="info-callout gap-top"><strong>Optimal / OPT</strong> uses future references to select a theoretical minimum-fault benchmark. It is not an online policy.</div>
        {error&&<div className="gap-top"><ErrorNotice>{error}</ErrorNotice></div>}
        <div className="form-actions"><Button onClick={execute} disabled={busy}>{busy?<span className="button-spinner"/>:<Play size={16}/>} Run comparison</Button><Button variant="secondary" onClick={saveDataset}><Save size={16}/> Save as dataset</Button><Button variant="ghost" onClick={()=>{setRun(null);setStep(0);setPlaying(false)}}><RotateCcw size={15}/> Reset trace</Button></div>
      </Card>
      <Card><div className="panel-heading"><div><div className="eyebrow">RECORDED FRAME TRACE</div><h2>Step visualization</h2></div>{current&&<span className={`result-badge ${point?.result==='HIT'?'badge-hit':'badge-fault'}`} aria-live="polite">{point?.result??'READY'}</span>}</div>
        {current?<><div className="algorithm-tabs policy-tabs" aria-label="Memory replacement policy trace">{results.map(item=><button aria-pressed={active===item.algorithm} className={active===item.algorithm?'tab-active':''} key={item.algorithm} onClick={()=>setActive(item.algorithm)}>{item.algorithm}</button>)}</div><p className="selected-policy">Selected policy: <strong>{current.algorithm}</strong> · {current.references} references · {current.frames} frame capacity</p><div className="trace-control"><Button variant="secondary" aria-label="Previous reference" onClick={()=>{setPlaying(false);setStep(i=>Math.max(0,i-1))}} disabled={step===0}><ChevronLeft size={17}/></Button><Button variant="secondary" onClick={()=>setPlaying(value=>!value)}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Pause':'Play'}</Button><Button variant="secondary" aria-label="Next reference" onClick={()=>{setPlaying(false);setStep(i=>Math.min(trace.length-1,i+1))}} disabled={step>=trace.length-1}><ChevronRight size={17}/></Button><span className="trace-position">Reference <b>{point?.step??0}</b> of {trace.length}</span></div>
          <div className="resident-order" role="group" aria-label={`Resident pages in algorithm order, not physical frame positions; ${point?.frames.length??0} of ${current.frames} pages resident`}><div className="resident-order-heading"><strong>Resident-page order</strong><span>{point?.frames.length??0} of {current.frames} pages resident</span></div><div className="frame-display">{point?.frames.map((page,index)=><div className={`frame-cell ${index===point.frames.length-1&&point.result==='FAULT'?'frame-new':''}`} key={`${index}-${page}`}><small>Resident order {index+1}</small><strong>{page}</strong></div>)}</div><p className="resident-order-note">Trace order reflects resident pages in the algorithm state; the API does not assign physical frame positions.</p></div>
          {replaced!==undefined&&<div className="replacement-note">Page <b>{replaced}</b> was evicted to load page <b>{point.page}</b>.</div>}
          <div className="trace-stream"><div className="subheading">Reference stream</div><div className="reference-row">{trace.map((entry,index)=><button className={`reference-chip ${entry.result==='HIT'?'chip-hit':'chip-fault'} ${index===step?'chip-current':''}`} key={`${entry.step}-${entry.page}`} onClick={()=>{setPlaying(false);setStep(index)}} aria-label={`Reference ${entry.step}, page ${entry.page}, ${entry.result}`}><small>{entry.step}</small>{entry.page}<small className="reference-result">{entry.result}</small></button>)}</div></div>
          <div className="mini-metrics trace-metrics"><Metric label="Page faults" value={current.faults}/><Metric label="Page hits" value={current.hits}/><Metric label="Fault rate" value={`${current.fault_rate_percent}%`}/><Metric label="Hit rate" value={`${current.hit_rate_percent}%`}/></div>
        </>:<EmptyState title="No memory trace yet" detail="Run a policy comparison to inspect the real frame states."/>}</Card>
    </div>
    {current&&<Card className="gap-top"><div className="panel-heading"><div><div className="eyebrow">COMPARISON</div><h2>Faults and hits by policy</h2></div></div><div className="chart-area"><ResponsiveContainer width="100%" height={240}><BarChart data={chartData} margin={{top:10,right:18,left:-15,bottom:8}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)"/><XAxis dataKey="algorithm" tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)'}}/><Bar dataKey="faults" fill="var(--series-4)" name="Faults" radius={[5,5,0,0]}/><Bar dataKey="hits" fill="var(--series-1)" name="Hits" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><TableFrame minWidth={580}><caption>Observed hits, faults, and fault rate for the same page-reference sequence</caption><thead><tr><th>Policy</th><th>References</th><th>Hits</th><th>Faults</th><th>Fault rate</th></tr></thead><tbody>{results.map(item=><tr key={item.algorithm}><td className="strong-cell">{item.algorithm}</td><td>{item.references}</td><td>{item.hits}</td><td>{item.faults}</td><td>{item.fault_rate_percent}%</td></tr>)}</tbody></TableFrame></Card>}
  </>
}
