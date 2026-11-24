import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Printer, Search } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, downloadUrl } from '../lib/api'
import type { Dataset, SimulationRun } from '../lib/types'
import { algorithmNames, inputSnapshot, inputSummary, metricDefinition, metricRows, metricUnit, reportTitle, resultsForDomain, technicalInterpretation, type ReportDomain } from '../lib/presentation'
import { Card, EmptyState, LoadError, Loading, Metric, PageHeader, SelectField, StatusPill, TableFrame } from '../components/ui'

const domains: {key: ReportDomain; label: string}[] = [
  {key:'cpu',label:'CPU scheduling'},
  {key:'memory',label:'Memory management'},
  {key:'storage',label:'Disk scheduling'},
]

function deadlockResult(run: SimulationRun) {
  if (!run.result) return null
  if (run.category === 'integrated') return run.result.deadlock ?? null
  return run.category === 'deadlock' ? run.result : null
}

export default function ReportsPage(){
  const [runs,setRuns]=useState<SimulationRun[]>([])
  const [selectedId,setSelectedId]=useState('')
  const [record,setRecord]=useState<SimulationRun|null>(null)
  const [dataset,setDataset]=useState<Dataset|null>(null)
  const [datasetIssue,setDatasetIssue]=useState('')
  const [domain,setDomain]=useState<ReportDomain>('cpu')
  const [loading,setLoading]=useState(true)
  const [reportLoading,setReportLoading]=useState(false)
  const [historyError,setHistoryError]=useState('')
  const [reportError,setReportError]=useState('')
  const [reportRetry,setReportRetry]=useState(0)

  const loadRuns=useCallback(()=>{
    setLoading(true)
    setHistoryError('')
    setRuns([])
    setSelectedId('')
    setRecord(null)
    let current=true
    api<{items:SimulationRun[]}>('/simulations?limit=200')
      .then(data=>{if(!current)return;const completed=data.items.filter(item=>item.status==='completed');setRuns(completed);if(completed.length)setSelectedId(String(completed[0].id))})
      .catch(e=>{if(current)setHistoryError(e instanceof Error?e.message:'Could not load simulation history.')})
      .finally(()=>{if(current)setLoading(false)})
    return()=>{current=false}
  },[])
  useEffect(()=>{const cancel=loadRuns();return cancel},[loadRuns])

  useEffect(()=>{
    if(!selectedId){setRecord(null);setReportError('');setReportLoading(false);return}
    let current=true
    setRecord(null);setReportError('');setReportLoading(true)
    api<SimulationRun>(`/reports/${selectedId}`)
      .then(item=>{if(!current)return;setRecord(item);if(item.category==='memory')setDomain('memory');else if(item.category==='storage')setDomain('storage');else setDomain('cpu')})
      .catch(e=>{if(current)setReportError(e instanceof Error?e.message:'Could not load this report.')})
      .finally(()=>{if(current)setReportLoading(false)})
    return()=>{current=false}
  },[selectedId,reportRetry])

  useEffect(()=>{
    if(!record?.dataset_id){setDataset(null);setDatasetIssue('');return}
    let current=true
    setDataset(null);setDatasetIssue('')
    api<Dataset>(`/datasets/${record.dataset_id}`)
      .then(item=>{if(current)setDataset(item)})
      .catch(()=>{if(current)setDatasetIssue('Dataset record is unavailable; the saved input snapshot is included below.')})
    return()=>{current=false}
  },[record?.dataset_id])

  const comparison = useMemo(()=>record?metricRows(record,domain):[],[record,domain])
  const comparisonResults = record ? resultsForDomain(record.result,record.category,domain) : []
  const definition=metricDefinition(domain)
  const deadlock=record?deadlockResult(record):null
  const canCompare=record?.category==='integrated'||record?.category===domain
  const source=record?.dataset_id ? dataset?.name ?? (datasetIssue?'Unavailable dataset record':`Dataset #${record.dataset_id}`) : 'Unsaved input snapshot'
  const title=record?reportTitle(record.category):''

  if(loading)return <><PageHeader title="Reports & exports" description="Inspect persisted simulation snapshots and measured policy results."/><Loading/></>
  if(historyError)return <><PageHeader title="Reports & exports" description="Inspect persisted simulation snapshots and measured policy results."/><LoadError message={historyError} onRetry={loadRuns} retryLabel="Retry loading reports"/></>
  return <><PageHeader eyebrow="WORKSPACE / REPORTS" title="Reports & exports" description="Inspect stored simulation runs, download JSON or CSV exports, and print execution summaries." action={record&&<div className="button-row report-actions"><a className="button button-secondary" aria-label={`Download JSON for run ${record.id}`} href={downloadUrl(`/reports/${record.id}/export?format=json`)}><Download size={15}/> JSON</a><a className="button button-secondary" aria-label={`Download CSV for run ${record.id}`} href={downloadUrl(`/reports/${record.id}/export?format=csv`)}><Download size={15}/> CSV</a><button className="button button-primary" onClick={()=>window.print()}><Printer size={15}/> Print report</button></div>}/>
    <Card className="report-picker"><SelectField label="Completed simulation" value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Choose a stored run</option>{runs.map(run=><option key={run.id} value={run.id}>Run #{run.id} · {run.category} · {new Date(run.created_at).toLocaleString()}</option>)}</SelectField><Search size={17}/></Card>
    {reportLoading?<Card><Loading label="Loading saved run"/></Card>:reportError?<Card><LoadError message={reportError} onRetry={()=>setReportRetry(value=>value+1)} retryLabel="Retry loading selected report"/></Card>:record?<Card className="print-report">
      <div className="report-title"><div className="report-logo" aria-hidden="true">KS</div><div><div className="eyebrow">KERNELSCOPE · EXECUTION REPORT</div><h2>{title}</h2><p>Simulation run #{record.id}</p></div><StatusPill status={record.status}/></div>
      <div className="report-metadata"><span>Execution date<strong>{new Date(record.completed_at??record.created_at).toLocaleString()}</strong></span><span>Status<strong><StatusPill status={record.status}/></strong></span><span>Dataset / source<strong>{source}</strong></span><span>Algorithms<strong>{algorithmNames(record).join(', ')||record.selected_algorithm}</strong></span><span>Run ID<strong>#{record.id}</strong></span></div>
      {dataset?.description&&<p className="report-dataset-description">{dataset.description}</p>}{datasetIssue&&<p className="report-dataset-description">{datasetIssue}</p>}
      <div className="report-section"><h3 className="subheading">Input summary</h3><ul className="report-input-summary">{inputSummary(record).map(line=><li key={line}>{line}</li>)}</ul></div>

      {deadlock&&<div className="report-section report-deadlock"><h3 className="subheading">Banker safety result</h3><div className={`report-safety ${deadlock.safe?'safe-banner':'unsafe-banner'}`}><strong>{deadlock.safe?'SAFE':'UNSAFE'}</strong><span>{deadlock.safe?`Safe sequence: ${(deadlock.safe_sequence??[]).join(' → ')||'not recorded'}`:`Unfinished processes: ${(deadlock.unfinished??[]).join(', ')||'none'}`}</span></div>
        {Array.isArray(deadlock.need)&&<><h4 className="report-subheading">Need matrix</h4><TableFrame minWidth={420}><caption>Need matrix from the selected persisted run</caption><thead><tr><th>Process</th>{(deadlock.need[0]??[]).map((_:number,index:number)=><th key={index}>R{index+1}</th>)}</tr></thead><tbody>{deadlock.need.map((row:number[],index:number)=><tr key={index}><td className="strong-cell">P{index}</td>{row.map((value:number,j:number)=><td key={j}>{value}</td>)}</tr>)}</tbody></TableFrame></>}
        {Array.isArray(deadlock.trace)&&deadlock.trace.length>0&&<><h4 className="report-subheading">Available resource trace</h4><TableFrame minWidth={440}><caption>Available resources after each process completion</caption><thead><tr><th>Completed process</th>{(deadlock.trace[0].available_after??[]).map((_:number,index:number)=><th key={index}>R{index+1} available</th>)}</tr></thead><tbody>{deadlock.trace.map((row:any,index:number)=><tr key={`${row.completed}-${index}`}><td className="strong-cell">{row.completed}</td>{(row.available_after??[]).map((value:number,j:number)=><td key={j}>{value}</td>)}</tr>)}</tbody></TableFrame></>}
      </div>}

      {canCompare&&<div className="report-section report-comparison"><div className="report-section-heading"><div><h3 className="subheading">Domain comparison</h3><p>Metrics below come from this stored run and share its saved input.</p></div>{record.category==='integrated'&&<SelectField label="Comparison domain" value={domain} onChange={e=>setDomain(e.target.value as ReportDomain)}>{domains.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</SelectField>}</div>
        {comparison.length?<><div className="report-metric-grid">{comparisonResults.map(item=>{const primary=domain==='cpu'?item.average_waiting:domain==='memory'?item.faults:item.total_head_movement;return <div className="report-metric" key={item.algorithm}><span>{item.algorithm}</span><strong>{primary} <small>{metricUnit(domain,primary)}</small></strong>{domain==='cpu'?<p>Average turnaround: {item.average_turnaround} time units<br/>CPU utilization: {item.cpu_utilization_percent}% · Throughput: {item.throughput}</p>:domain==='memory'?<p>Hits: {item.hits} · Fault rate: {item.fault_rate_percent}%</p>:<p>Average / request: {item.average_movement_per_request} cylinders<br/>Requests served: {item.requests_served}</p>}</div>})}</div><div className="report-chart-heading"><h4>{definition.label}</h4><span>Unit: {definition.unit}</span></div><div className="chart-area report-chart" role="group" aria-label={definition.label + " by algorithm"}><p className="sr-only">Chart uses the selected persisted run and its shared input snapshot. Values are in {definition.unit}.</p><ResponsiveContainer width="100%" height={260}><BarChart data={comparison.map(item=>({algorithm:item.algorithm,value:item.primary}))} margin={{top:14,right:22,left:8,bottom:8}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)"/><XAxis dataKey="algorithm" tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false} label={{value:definition.unit,angle:-90,position:'insideLeft',fill:'var(--muted)',fontSize:12}}/><Tooltip formatter={(value:any)=>[`${value} ${definition.unit}`,definition.label]} contentStyle={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:10,color:'var(--text)',fontSize:12}}/><Bar dataKey="value" name={definition.label} fill="var(--series-1)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><div className="table-wrap" role="region" aria-label="Scrollable report comparison table" tabIndex={0}><table><caption className="sr-only">{definition.label} and supporting metrics by algorithm</caption><thead><tr><th>Algorithm</th><th>{definition.label} ({definition.unit})</th><th>{definition.secondaryLabel}</th></tr></thead><tbody>{comparison.map((item,index)=><tr key={`${item.algorithm}-${index}`}><td className="strong-cell">{item.algorithm}</td><td>{item.primary}</td><td>{item.secondary??'-'}</td></tr>)}</tbody></table></div></>:<EmptyState title="No comparison metrics in this result" detail="The persisted result does not contain values for this domain."/>}
      </div>}

      {record.category==='deadlock'&&<div className="report-section"><h3 className="subheading">Technical interpretation</h3><p className="report-copy">{deadlock?.safe?`The recorded resource snapshot is safe. Banker's algorithm found the sequence ${(deadlock.safe_sequence??[]).join(' → ')||'shown above'}, under which each process can complete and release its allocation.`:`The recorded resource snapshot is unsafe. ${(deadlock?.unfinished??[]).length?`The unfinished processes are ${(deadlock.unfinished??[]).join(', ')}.`:''} An unsafe result does not by itself establish that a deadlock is currently occurring.`}</p></div>}
      {canCompare&&<div className="report-section"><h3 className="subheading">Technical interpretation</h3><p className="report-copy">{technicalInterpretation(record,domain)} {comparison.length>1?'The comparison is limited to algorithms executed within this run.':''}</p></div>}

      <div className="report-section report-raw"><h3 className="subheading">Persisted data</h3><details><summary>Show raw input JSON</summary><pre className="code-block">{JSON.stringify(inputSnapshot(record),null,2)}</pre></details><details><summary>Show raw result JSON</summary><pre className="code-block result-json">{JSON.stringify(record.result,null,2)}</pre></details></div>
    </Card>:<Card><EmptyState title={runs.length?'Select a completed simulation':'No completed simulations'} detail={runs.length?'Choose a stored run to review its persisted inputs and results.':'Run a simulator first. Completed runs appear here for export and printing.'}/></Card>}
  </>
}
