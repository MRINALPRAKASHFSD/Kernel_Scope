import { describe, expect, it } from 'vitest'
import type { SimulationRun } from './types'
import { algorithmNames, inputSummary, metricRows, technicalInterpretation } from './presentation'

const run = (overrides: Partial<SimulationRun> = {}): SimulationRun => ({
  id: 11, dataset_id: null, category: 'integrated', selected_algorithm: 'all algorithms',
  input_snapshot: {dataset:{processes:[{pid:'A',arrival:0,burst:3}],quantum:2,memory:{references:[1,2,1],frames:2},deadlock:{available:[1,2],maximum:[[2,2]],allocation:[[1,0]]},storage:{requests:[10,20],head:5,cylinders:50}}},
  result: {
    scheduling:[{algorithm:'FCFS',average_waiting:2,average_turnaround:5,cpu_utilization_percent:100,throughput:.2}],
    memory:[{algorithm:'FIFO',faults:2,hits:1},{algorithm:'LRU',faults:1,hits:2}],
    deadlock:{safe:true,safe_sequence:['P0'],need:[[1,2]],trace:[{completed:'P0',available_after:[2,2]}]},
    storage:[{algorithm:'FCFS',total_head_movement:25,average_movement_per_request:12.5,requests_served:2}],
  },
  status:'completed', error_message:null, created_at:'2026-01-01T00:00:00Z', completed_at:'2026-01-01T00:01:00Z',
  ...overrides,
})

describe('persisted result presentation helpers', () => {
  it('keeps comparison values within the selected domain and uses the right unit metric', () => {
    const saved=run()
    expect(metricRows(saved,'cpu')).toEqual([{algorithm:'FCFS',primary:2,secondary:5}])
    expect(metricRows(saved,'memory')).toEqual([{algorithm:'FIFO',primary:2,secondary:1},{algorithm:'LRU',primary:1,secondary:2}])
    expect(metricRows(saved,'storage')).toEqual([{algorithm:'FCFS',primary:25,secondary:12.5}])
  })

  it('reports only a measured winner and the actual stored value', () => {
    expect(technicalInterpretation(run(),'memory')).toBe('LRU recorded the lowest page faults (1 page fault) among 2 algorithms run against this input snapshot.')
  })

  it('summarizes the persisted integrated input without inventing workload details', () => {
    expect(inputSummary(run())).toEqual([
      '1 process; Round Robin quantum 2',
      '3 page references; 2 physical frames',
      '1 process; 2 resource types',
      '2 disk requests; initial head 5; 50 cylinders',
    ])
  })

  it('names algorithms by domain for integrated reports where names can repeat', () => {
    expect(algorithmNames(run())).toEqual(['CPU: FCFS','Memory: FIFO, LRU',"Banker: Banker's algorithm",'Disk: FCFS'])
  })
})
