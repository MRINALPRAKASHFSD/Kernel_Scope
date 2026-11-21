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
