import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, Play, Plus, Save, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { validateProcessRows } from '../lib/validation'
import type { CpuResult, Dataset, Process, SimulationRun } from '../lib/types'
import { useToast } from '../components/Toast'
import { AlgorithmChecks, Button, Card, EmptyState, ErrorNotice, Field, Loading, Metric, PageHeader, TableFrame } from '../components/ui'

const defaults: Process[] = [{pid:'P1',arrival:0,burst:7},{pid:'P2',arrival:2,burst:4},{pid:'P3',arrival:4,burst:1},{pid:'P4',arrival:5,burst:4}]
const algorithms = ['FCFS','SJF','RR']

export default function CpuPage() {
  const toast = useToast()
  const [processes,setProcesses] = useState<Process[]>(defaults)
  const [quantum,setQuantum] = useState(2)
  const [selected,setSelected] = useState(algorithms)
  const [datasetId,setDatasetId] = useState<number|undefined>()
  const [datasets,setDatasets] = useState<Dataset[]>([])
  const [run,setRun] = useState<SimulationRun|null>(null)
  const [active,setActive] = useState('FCFS')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(false)
  const [saving,setSaving] = useState(false)
  const results = (run?.result?.algorithms ?? []) as CpuResult[]
  const current = results.find(result=>result.algorithm===active) ?? results[0]
  useEffect(()=>{api<{items:Dataset[]}>('/datasets').then(data=>setDatasets(data.items)).catch(()=>undefined)},[])
  const chartData = useMemo(()=>results.map(item=>({algorithm:item.algorithm,waiting:item.average_waiting,turnaround:item.average_turnaround})),[results])
  const edit = (index:number,key:keyof Process,value:string) => setProcesses(rows=>rows.map((row,i)=>i===index?{...row,[key]:key==='pid'?value:Number(value)}:row))
  const execute = async () => {
    const issue = validateProcessRows(processes,quantum)
    if (issue) { setError(issue); return }
    if (!selected.length) { setError('Select at least one scheduling algorithm.'); return }
    setError('');setLoading(true)
    try { const saved=await api<SimulationRun>('/simulations/cpu',{method:'POST',body:JSON.stringify({processes,quantum,algorithms:selected,dataset_id:datasetId})});setRun(saved);setActive(saved.result?.algorithms?.[0]?.algorithm ?? 'FCFS');toast('CPU simulation saved to history.') }
    catch(e){setError(e instanceof Error?e.message:'Simulation failed.')} finally{setLoading(false)}
  }
  const loadBaseline = async () => {
    try { const data=await api<{items:Dataset[]}>('/datasets');setDatasets(data.items);const found=data.items.find(item=>item.name==='Bundled Baseline');if(!found)throw new Error('Bundled baseline dataset is unavailable.');setProcesses(found.config.processes);setQuantum(found.config.quantum ?? 2);setDatasetId(found.id);setError('');toast('Bundled baseline loaded.') }
    catch(e){setError(e instanceof Error?e.message:'Could not load baseline.')} 
  }
  const saveDataset = async () => {
    const issue=validateProcessRows(processes,quantum);if(issue){setError(issue);return}
    setSaving(true);setError('')
    try { const item=await api<Dataset>('/datasets',{method:'POST',body:JSON.stringify({name:`CPU scenario ${new Date().toLocaleString()}`,description:'Created from the CPU simulator.',category:'cpu',config:{processes,quantum}})});setDatasets(rows=>[item,...rows]);setDatasetId(item.id);toast('CPU dataset saved.') }
    catch(e){setError(e instanceof Error?e.message:'Dataset save failed.')}finally{setSaving(false)}
  }
  const gantt = useMemo(()=>{
    if(!current?.gantt.length)return []
    const segments:Array<{pid:string;start:number;end:number}> = []
    let cursor=0
    current.gantt.forEach(item=>{if(item.start>cursor)segments.push({pid:'IDLE',start:cursor,end:item.start});segments.push(item);cursor=item.end})
    return segments
  },[current])
  const end = gantt.length ? Math.max(...gantt.map(item=>item.end)) : 1
  return <>
    <PageHeader eyebrow="SIMULATION / CPU" title="CPU scheduling" description="Compare arrival-aware FCFS, non-preemptive SJF, and Round Robin using the Python execution trace." action={<Button variant="secondary" onClick={loadBaseline}><Activity size={16}/> Load baseline</Button>}/>
    <div className="simulator-grid">
      <Card><div className="panel-heading"><div><div className="eyebrow">WORKLOAD INPUT</div><h2>Process queue</h2></div><Button variant="ghost" onClick={()=>setProcesses(rows=>[...rows,{pid:`P${rows.length+1}`,arrival:0,burst:1}])}><Plus size={15}/> Add process</Button></div>
        <TableFrame minWidth={430}><caption>Editable process queue submitted to the CPU scheduler</caption><thead><tr><th>Process ID</th><th>Arrival (time units)</th><th>Burst (time units)</th><th aria-label="Actions"/></tr></thead><tbody>{processes.map((row,index)=><tr key={`${index}-${row.pid}`}><td><input aria-label={`Process ${index+1} ID`} className="table-input id-input" value={row.pid} onChange={e=>edit(index,'pid',e.target.value)}/></td><td><input aria-label={`Process ${index+1} arrival`} className="table-input" type="number" min="0" value={row.arrival} onChange={e=>edit(index,'arrival',e.target.value)}/></td><td><input aria-label={`Process ${index+1} burst`} className="table-input" type="number" min="1" value={row.burst} onChange={e=>edit(index,'burst',e.target.value)}/></td><td><button className="icon-button danger-icon" aria-label={`Remove process ${row.pid}`} onClick={()=>setProcesses(rows=>rows.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></td></tr>)}</tbody></TableFrame>
        <div className="form-row gap-top"><Field label="Round Robin quantum" type="number" min={1} value={quantum} onChange={e=>setQuantum(Number(e.target.value))}/><label className="field dataset-choice"><span>Dataset association</span><select value={datasetId ?? ''} onChange={e=>setDatasetId(e.target.value?Number(e.target.value):undefined)}><option value="">Unsaved input snapshot</option>{datasets.filter(item=>item.category==='cpu'||item.category==='integrated').map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
        <div className="field gap-top"><span>Algorithms to run</span><AlgorithmChecks options={algorithms} selected={selected} onChange={setSelected}/></div>
        {error&&<div className="gap-top"><ErrorNotice>{error}</ErrorNotice></div>}
        <div className="form-actions"><Button onClick={execute} disabled={loading}>{loading?<span className="button-spinner"/>:<Play size={16}/>} Run comparison</Button><Button variant="secondary" onClick={saveDataset} disabled={saving}><Save size={16}/> {saving?'Saving…':'Save as dataset'}</Button><Button variant="ghost" onClick={()=>{setProcesses([]);setRun(null);setError('')}}>Reset</Button></div>
      </Card>
      <Card className="result-summary cpu-results-panel"><div className="panel-heading"><div><div className="eyebrow">MEASURED OUTPUT</div><h2>Scheduling results</h2></div></div>{current?<><div className="algorithm-tabs" aria-label="CPU algorithm result">{results.map(item=><button aria-pressed={active===item.algorithm} className={active===item.algorithm?'tab-active':''} key={item.algorithm} onClick={()=>setActive(item.algorithm)}>{item.algorithm}</button>)}</div><div className="result-chart"><div className="subheading">CPU execution timeline</div><div className="gantt-track" role="group" aria-label="CPU execution order and idle intervals">{gantt.map((item,index)=><div className={`gantt-segment ${item.pid==='IDLE'?'gantt-idle':''}`} key={`${item.pid}-${item.start}-${index}`} title={`${item.pid}: ${item.start}–${item.end}`} style={{left:`${item.start/end*100}%`,width:`${(item.end-item.start)/end*100}%`}}><b>{item.pid}</b><small>{item.start}–{item.end}</small></div>)}</div><div className="gantt-axis"><span>0</span><span>{end} time units</span></div></div><div className="cpu-primary-metrics" aria-label="Primary scheduling results"><Metric label="Average waiting time" value={current.average_waiting} detail="time units"/><Metric label="Average turnaround time" value={current.average_turnaround} detail="time units"/></div><div className="cpu-supporting-metrics" aria-label="Supporting scheduling metrics"><span>CPU utilization <strong>{current.cpu_utilization_percent}%</strong></span><span>Throughput <strong>{current.throughput} processes / time unit</strong></span></div><TableFrame minWidth={500}><caption className="sr-only">Per-process CPU completion, turnaround, and waiting results for {current.algorithm}</caption><thead><tr><th>Process</th><th>Completion</th><th>Turnaround</th><th>Waiting</th></tr></thead><tbody>{current.metrics.map(metric=><tr key={metric.pid}><td className="strong-cell">{metric.pid}</td><td>{metric.completion}</td><td>{metric.turnaround}</td><td>{metric.waiting}</td></tr>)}</tbody></TableFrame></>:<EmptyState title="No CPU results yet" detail="Run a comparison to view measured timing and the Gantt trace."/>}</Card>
    </div>
    {results.length>1&&<Card className="gap-top"><div className="panel-heading"><div><div className="eyebrow">SAME INPUT SNAPSHOT</div><h2>Algorithm comparison</h2></div></div><div className="chart-area"><ResponsiveContainer width="100%" height={250}><BarChart data={chartData} margin={{top:10,right:20,left:-15,bottom:8}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)"/><XAxis dataKey="algorithm" tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)'}}/><Bar dataKey="waiting" name="Average waiting time" fill="var(--series-2)" radius={[5,5,0,0]}/><Bar dataKey="turnaround" name="Average turnaround" fill="var(--series-1)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></Card>}
  </>
}
