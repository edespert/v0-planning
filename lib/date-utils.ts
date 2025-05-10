const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

const FRENCH_MONTHS_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
]

function parseFrenchDate(dateStr: string): Date {
  // Format: "1 avril 2025"
  const parts = dateStr.split(" ")

  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }

  const day = Number.parseInt(parts[0], 10)
  const monthStr = parts[1].toLowerCase()
  const year = Number.parseInt(parts[2], 10)

  const monthIndex = FRENCH_MONTHS.indexOf(monthStr)

  if (monthIndex === -1) {
    throw new Error(`Invalid month: ${monthStr}`)
  }

  return new Date(year, monthIndex, day)
}

export function formatDateRange(dateRange: string): { start: Date; end: Date; isSingleDay: boolean } {
  try {
    // Check if it's a single date or a range
    if (!dateRange.includes("→")) {
      // It's a single date
      const date = parseFrenchDate(dateRange.trim())
      return { start: date, end: date, isSingleDay: true }
    }

    // Format: "1 avril 2025 → 8 avril 2025"
    const parts = dateRange.split("→")

    if (parts.length !== 2) {
      throw new Error(`Invalid date range format: ${dateRange}`)
    }

    const startDateStr = parts[0].trim()
    const endDateStr = parts[1].trim()

    const start = parseFrenchDate(startDateStr)
    const end = parseFrenchDate(endDateStr)

    // Check if start and end are the same day
    const isSingleDay = start.getTime() === end.getTime()

    return { start, end, isSingleDay }
  } catch (error) {
    console.error(`Error parsing date range: ${dateRange}`, error)
    // Return default dates if parsing fails
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)
    return { start: today, end: nextWeek, isSingleDay: false }
  }
}

export function getMonthsInRange(startDate: Date, endDate: Date): { name: string; days: number[] }[] {
  const months: { name: string; days: number[] }[] = []

  const currentDate = new Date(startDate)
  currentDate.setDate(1) // Start from the first day of the month

  while (currentDate <= endDate) {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const monthName = `${FRENCH_MONTHS[month]} ${year}`
    const daysInMonth = getDaysInMonth(year, month)

    months.push({
      name: monthName,
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
    })

    // Move to the next month
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return months
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getTaskBarPosition(
  task: { startDate: Date; endDate: Date; isSingleDay: boolean },
  month: { name: string; days: number[] },
  monthIndex: number,
  allMonths: { name: string; days: number[] }[],
): { display: boolean; width: number; offset: number } {
  // Extract month and year from the month name
  const [monthName, yearStr] = month.name.split(" ")
  const year = Number.parseInt(yearStr, 10)
  const monthNumber = FRENCH_MONTHS.indexOf(monthName)

  // Create date objects for the first and last day of the month
  const monthStart = new Date(year, monthNumber, 1)
  const monthEnd = new Date(year, monthNumber, month.days.length)

  // Check if the task overlaps with this month
  const taskOverlapsMonth = task.startDate <= monthEnd && task.endDate >= monthStart

  if (!taskOverlapsMonth) {
    return { display: false, width: 0, offset: 0 }
  }

  // Calculate the start position (offset)
  let offset = 0
  if (task.startDate > monthStart) {
    // Task starts within this month
    offset = (task.startDate.getDate() - 1) * 30
  }

  // Calculate the width
  let width

  if (task.isSingleDay) {
    // For single day tasks, make the width smaller (e.g., 20px)
    width = 20
  } else if (task.startDate <= monthStart && task.endDate >= monthEnd) {
    // Task spans the entire month
    width = month.days.length * 30
    offset = 0
  } else if (task.startDate <= monthStart) {
    // Task started before this month
    width = task.endDate.getDate() * 30
    offset = 0
  } else if (task.endDate >= monthEnd) {
    // Task ends after this month
    width = (month.days.length - task.startDate.getDate() + 1) * 30
  } else {
    // Task is completely within this month
    width = (task.endDate.getDate() - task.startDate.getDate() + 1) * 30
  }

  return { display: true, width, offset }
}
