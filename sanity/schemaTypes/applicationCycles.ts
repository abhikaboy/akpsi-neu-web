// Application cycles are generated, not hand-entered: Spring/Fall for the
// current year through three years out. Regenerates itself every year
// instead of needing someone to remember to add next year's options.
export function applicationCycleOptions(): { title: string; value: string }[] {
  const startYear = new Date().getFullYear()
  const options: { title: string; value: string }[] = []
  for (let year = startYear; year <= startYear + 3; year++) {
    options.push({ title: `Spring ${year}`, value: `spring-${year}` })
    options.push({ title: `Fall ${year}`, value: `fall-${year}` })
  }
  return options
}
