import { create } from 'zustand'

const useUnitStore = create((set) => ({
  unit: localStorage.getItem('fitlog_unit') || 'kg',
  setUnit: (unit) => {
    localStorage.setItem('fitlog_unit', unit)
    set({ unit })
  },
}))

/** Format a stored kg value for display in the current unit. */
export function fmtWeight(kg, unit, includeUnit = true) {
  if (kg === null || kg === undefined || kg === '' || kg === 0) {
    return includeUnit ? `0 ${unit}` : '0'
  }
  if (unit === 'lbs') {
    const val = Math.round(kg * 2.2046 * 10) / 10
    return includeUnit ? `${val} lbs` : `${val}`
  }
  return includeUnit ? `${kg} kg` : `${kg}`
}

export default useUnitStore
