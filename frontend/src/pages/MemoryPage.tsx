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
