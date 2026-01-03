/**
 * Groups days of a month into weeks
 * @param year - The year
 * @param month - The month (1-12)
 * @returns Array of weeks, where each week is an array of day numbers (or null for days outside the month)
 */
export const getDaysInWeeks = (year: number, month: number): (number | null)[][] => {
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Convert to Monday = 0, Tuesday = 1, ..., Sunday = 6
  const dayOfWeek = (firstDayOfMonth.getDay() + 6) % 7
  
  // Calculate the start of the week (Monday)
  const startOfWeek = new Date(firstDayOfMonth)
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)
  
  const weeks: (number | null)[][] = []
  let currentWeekStart = new Date(startOfWeek)
  
  while (true) {
    const weekDays: (number | null)[] = []
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(currentWeekStart)
      currentDay.setDate(currentWeekStart.getDate() + i)
      
      // Check if this day belongs to the selected month
      if (currentDay.getMonth() === month - 1 && currentDay.getFullYear() === year) {
        weekDays.push(currentDay.getDate())
      } else {
        weekDays.push(null)
      }
    }
    
    weeks.push(weekDays)
    
    // Move to next week
    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    
    // Stop if we've passed the month
    if (currentWeekStart.getMonth() > month - 1 || 
        (currentWeekStart.getMonth() === month - 1 && currentWeekStart.getDate() > daysInMonth)) {
      // Check if the last week has any days from the current month
      const hasCurrentMonthDays = weekDays.some(day => day !== null)
      if (!hasCurrentMonthDays) break
      
      const maxDay = Math.max(...weekDays.filter(day => day !== null) as number[])
      if (maxDay >= daysInMonth) break
    }
  }
  
  return weeks
}

