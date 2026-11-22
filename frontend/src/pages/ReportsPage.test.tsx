import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ReportsPage from './ReportsPage'

const apiMock=vi.hoisted(()=>vi.fn())
vi.mock('../lib/api',()=>({api:apiMock,downloadUrl:(path:string)=>`/api${path}`}))

const integratedRun={
  id:11,dataset_id:5,category:'integrated',selected_algorithm:'all algorithms',
  input_snapshot:{dataset:{processes:[{pid:'A',arrival:0,burst:3}],quantum:2,memory:{references:[1,2,1],frames:2},deadlock:{available:[1,2],maximum:[[2,2]],allocation:[[1,0]]},storage:{requests:[10,20],head:5,cylinders:50}}},
  result:{scheduling:[{algorithm:'FCFS',average_waiting:2,average_turnaround:5,cpu_utilization_percent:100,throughput:.2}],memory:[{algorithm:'FIFO',faults:2,hits:1,fault_rate_percent:66.7},{algorithm:'LRU',faults:1,hits:2,fault_rate_percent:33.3}],deadlock:{safe:true,safe_sequence:['P0'],need:[[1,2]],trace:[{completed:'P0',available_after:[2,2]}]},storage:[{algorithm:'FCFS',total_head_movement:25,average_movement_per_request:12.5,requests_served:2}]},
  status:'completed',error_message:null,created_at:'2026-01-01T00:00:00Z',completed_at:'2026-01-01T00:01:00Z',
}

describe('Reports page',()=>{
  beforeEach(()=>{
    apiMock.mockReset()
    apiMock.mockImplementation(async(path:string)=>{
      if(path==='/simulations?limit=200')return {items:[integratedRun]}
      if(path==='/reports/11')return integratedRun
      if(path==='/datasets/5')return {id:5,name:'OS Baseline',description:'Bundled reproducible workload',category:'integrated',config:{},created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'}
      throw new Error(`Unexpected API path ${path}`)
    })
  })

  it('shows saved provenance, domain-specific metrics, raw JSON, exports, and print action',async()=>{
    const print=vi.spyOn(window,'print').mockImplementation(()=>undefined)
    const {container}=render(<ReportsPage/>)
    expect(await screen.findByRole('heading',{name:'Integrated resource simulation'})).toBeInTheDocument()
    expect(await screen.findByText('OS Baseline')).toBeInTheDocument()
    expect(screen.getByText(/CPU: FCFS, Memory: FIFO, LRU/)).toBeInTheDocument()
    expect(screen.getByText(/1 process; Round Robin quantum 2/)).toBeInTheDocument()
    expect(container.querySelector('.report-metric-grid')).toHaveTextContent(/2\s*time units/)
    fireEvent.change(screen.getByLabelText('Comparison domain'),{target:{value:'memory'}})
    expect(await screen.findByText('Page faults')).toBeInTheDocument()
    expect(container.querySelector('.report-metric-grid')).toHaveTextContent(/1\s*page fault/)
    fireEvent.click(screen.getByText('Show raw result JSON'))
    expect(screen.getByText(/"total_head_movement": 25/)).toBeInTheDocument()
    expect(screen.getByRole('link',{name:'Download JSON for run 11'})).toHaveAttribute('href','/api/reports/11/export?format=json')
    expect(screen.getByRole('link',{name:'Download CSV for run 11'})).toHaveAttribute('href','/api/reports/11/export?format=csv')
    fireEvent.click(screen.getByRole('button',{name:'Print report'}))
    expect(print).toHaveBeenCalledOnce()
    await waitFor(()=>expect(apiMock).toHaveBeenCalledWith('/datasets/5'))
    print.mockRestore()
  })

  it('renders persisted Banker matrices and safety state for deadlock reports',async()=>{
    apiMock.mockImplementation(async(path:string)=>{
      if(path==='/simulations?limit=200')return {items:[{...integratedRun,id:12,dataset_id:null,category:'deadlock',selected_algorithm:'BANKER',input_snapshot:{available:[1,2],maximum:[[2,2]],allocation:[[1,0]]},result:{category:'deadlock',safe:true,safe_sequence:['P0'],unfinished:[],need:[[1,2]],trace:[{completed:'P0',available_after:[2,2]}]}}]}
      if(path==='/reports/12')return {...integratedRun,id:12,dataset_id:null,category:'deadlock',selected_algorithm:'BANKER',input_snapshot:{available:[1,2],maximum:[[2,2]],allocation:[[1,0]]},result:{category:'deadlock',safe:true,safe_sequence:['P0'],unfinished:[],need:[[1,2]],trace:[{completed:'P0',available_after:[2,2]}]}}
      throw new Error(`Unexpected API path ${path}`)
    })
    render(<ReportsPage/>)
    expect(await screen.findByRole('heading',{name:'Deadlock safety analysis'})).toBeInTheDocument()
    expect(screen.getByText('SAFE')).toBeInTheDocument()
    expect(screen.getByText('Need matrix')).toBeInTheDocument()
    expect(screen.getByText('Available resource trace')).toBeInTheDocument()
    expect(screen.getByText(/sequence P0/)).toBeInTheDocument()
  })

  it('distinguishes failed history loading from a successful empty report list and retries',async()=>{
    let calls=0
    apiMock.mockImplementation(async(path:string)=>{
      if(path==='/simulations?limit=200'){calls+=1;if(calls===1)throw new Error('History unavailable');return {items:[]}}
      throw new Error(`Unexpected API path ${path}`)
    })
    render(<ReportsPage/>)

    expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable')
    expect(screen.queryByText('No completed simulations')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Retry loading reports'}))
    expect(await screen.findByText('No completed simulations')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('retries a failed selected report request without replacing it with an empty state',async()=>{
    let calls=0
    apiMock.mockImplementation(async(path:string)=>{
      if(path==='/simulations?limit=200')return {items:[integratedRun]}
      if(path==='/reports/11'){calls+=1;if(calls===1)throw new Error('Report unavailable');return integratedRun}
      if(path==='/datasets/5')return {id:5,name:'OS Baseline',description:'Bundled reproducible workload',category:'integrated',config:{},created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'}
      throw new Error(`Unexpected API path ${path}`)
    })
    render(<ReportsPage/>)

    expect(await screen.findByRole('alert')).toHaveTextContent('Report unavailable')
    expect(screen.queryByText('No completed simulations')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Retry loading selected report'}))
    expect(await screen.findByRole('heading',{name:'Integrated resource simulation'})).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})
