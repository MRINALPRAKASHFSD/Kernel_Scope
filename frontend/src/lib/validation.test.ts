import { describe, expect, it } from 'vitest'
import { parseIntegerList, validateProcessRows } from './validation'

describe('form validation helpers', () => {
  it('parses comma and whitespace separated integer references', () => {
    expect(parseIntegerList('1, 2\n3')).toEqual([1, 2, 3])
  })

  it('rejects empty and noninteger lists', () => {
    expect(parseIntegerList(' ,  ')).toBeNull()
    expect(parseIntegerList('1, two')).toBeNull()
  })

  it('checks process IDs, arrival times, bursts, and quantum', () => {
    const valid = [{ pid: 'A', arrival: 0, burst: 3 }, { pid: 'B', arrival: 2, burst: 1 }]
    expect(validateProcessRows(valid, 2)).toBe('')
    expect(validateProcessRows([{ ...valid[0], pid: ' ' }], 2)).toMatch(/ID/)
    expect(validateProcessRows([valid[0], { ...valid[1], pid: 'A' }], 2)).toMatch(/unique/)
    expect(validateProcessRows([{ ...valid[0], arrival: -1 }], 2)).toMatch(/nonnegative/)
    expect(validateProcessRows([{ ...valid[0], burst: 0 }], 2)).toMatch(/positive/)
    expect(validateProcessRows(valid, 0)).toMatch(/quantum/)
  })
})
