export interface ApplicationCycleOption {
  label: string
  value: string
}

// Mirrors sanity/schemaTypes/applicationCycles.ts — kept in sync by hand since
// the Studio and the site are separate deployables that don't share code.
export function getApplicationCycleOptions(): ApplicationCycleOption[] {
  const startYear = new Date().getFullYear()
  const options: ApplicationCycleOption[] = []
  for (let year = startYear; year <= startYear + 3; year++) {
    options.push({ label: `Spring ${year}`, value: `spring-${year}` })
    options.push({ label: `Fall ${year}`, value: `fall-${year}` })
  }
  return options
}
