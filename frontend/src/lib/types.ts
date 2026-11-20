export type Process = { pid: string; arrival: number; burst: number }
export type CpuResult = {
  algorithm: string; quantum: number | null; metrics: Array<{pid: string; completion: number; turnaround: number; waiting: number}>
  gantt: Array<{pid: string; start: number; end: number}>
  average_waiting: number; average_turnaround: number; cpu_utilization_percent: number; throughput: number
}
export type MemoryTrace = {step: number; page: number; result: 'HIT' | 'FAULT'; frames: number[]}
export type MemoryResult = {algorithm: string; frames: number; references: number; hits: number; faults: number; hit_rate_percent: number; fault_rate_percent: number; trace: MemoryTrace[]}
export type DiskResult = {algorithm: string; direction: string | null; route: number[]; total_head_movement: number; average_movement_per_request: number; requests_served: number}
export type Dataset = {id: number; name: string; description: string; category: string; config: Record<string, any>; created_at: string; updated_at: string}
export type SimulationRun = {id: number; dataset_id: number | null; category: string; selected_algorithm: string; input_snapshot: Record<string, any>; result: Record<string, any> | null; status: string; error_message: string | null; created_at: string; completed_at: string | null}
export type DashboardSummary = {total_runs: number; algorithm_count: number; saved_datasets: number; failed_runs: number; recent_runs: SimulationRun[]; recent_activity: Array<{id: number; action: string; category: string; status: string; message: string; timestamp: string}>}
