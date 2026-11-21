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
