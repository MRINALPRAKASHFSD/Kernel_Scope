import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CircleDot, Play, Save } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { parseIntegerList } from '../lib/validation'
import { buildDiskRoute, buildDiskRouteLegend } from '../lib/diskRoute'
import type { Dataset, DiskResult, SimulationRun } from '../lib/types'
import { useToast } from '../components/Toast'
import { AlgorithmChecks, Button, Card, EmptyState, ErrorNotice, Field, PageHeader, TableFrame } from '../components/ui'

const allAlgorithms=['FCFS','SSTF','SCAN']
export default function DiskPage(){
  const toast=useToast()
  const [cylinders,setCylinders]=useState(200)
  const [head,setHead]=useState(53)
  const [queue,setQueue]=useState('98, 183, 37, 122, 14, 124, 65, 67')
  const [direction,setDirection]=useState<'up'|'down'>('up')
  const [algorithms,setAlgorithms]=useState(allAlgorithms)
  const [datasets,setDatasets]=useState<Dataset[]>([])
  const [datasetId,setDatasetId]=useState<number|undefined>()
  const [run,setRun]=useState<SimulationRun|null>(null)
  const [active,setActive]=useState('SCAN')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const results=(run?.result?.algorithms??[]) as DiskResult[]
  const current=results.find(item=>item.algorithm===active)??results[0]
  const chartCylinders=Number(run?.input_snapshot?.cylinders??cylinders)
  const routeData=useMemo(()=>{
    if(!current)return []
    const input=run?.input_snapshot?.dataset?.storage??run?.input_snapshot?.storage??run?.input_snapshot
    const requests=Array.isArray(input?.requests)?input.requests.filter((value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)):[]
