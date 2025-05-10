"use client"

import { useEffect, useState, useRef } from "react"
import Papa from "papaparse"
import { Search, Download, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatDateRange, getMonthsInRange, getTaskBarPosition } from "@/lib/date-utils"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { ColorLegend } from "./color-legend"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { validateAndFetchCsv } from "@/lib/github"

interface Task {
  nom: string
  statut: string
  dates: string
  startDate: Date
  endDate: Date
  isMainPhase: boolean
  isSingleDay: boolean
  height: number
}

interface GanttChartProps {
  csvUrl: string
  initialName?: string
  initialPublishDate?: string
}

export function GanttChart({ csvUrl, initialName, initialPublishDate }: GanttChartProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [projectName, setProjectName] = useState(initialName || "")
  const [publishDate, setPublishDate] = useState(initialPublishDate || "")
  const [months, setMonths] = useState<{ name: string; days: number[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const chartRef = useRef<HTMLDivElement>(null)
  const taskRefs = useRef<(HTMLDivElement | null)[]>([])

  // Add PDF export function
  const exportToPDF = async () => {
    if (!chartRef.current) return

    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 1,
        useCORS: true,
        logging: false,
        allowTaint: true,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
      })

      const imgWidth = 280
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight)
      pdf.save(`${projectName}-gantt-chart.pdf`)
    } catch (err) {
      console.error("Error exporting PDF:", err)
      alert("Failed to export PDF. Please try again.")
    }
  }

  // Calculate task heights based on content
  useEffect(() => {
    if (tasks.length === 0 || taskRefs.current.length === 0) return

    const newTasks = [...tasks]
    let hasChanges = false

    taskRefs.current.forEach((ref, index) => {
      if (ref && index < newTasks.length) {
        const height = ref.scrollHeight
        if (height > 40 && newTasks[index].height !== height) {
          newTasks[index].height = height
          hasChanges = true
        } else if (height <= 40 && newTasks[index].height !== 40) {
          newTasks[index].height = 40
          hasChanges = true
        }
      }
    })

    if (hasChanges) {
      setTasks(newTasks)
      setFilteredTasks(
        searchQuery.trim() === ""
          ? newTasks
          : newTasks.filter((task) => task.nom.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }
  }, [tasks, searchQuery])

  useEffect(() => {
    const fetchCSV = async () => {
      try {
        setLoading(true)
        console.log("Fetching CSV from:", csvUrl)

        // Use our improved validation and fetch function
        const csvText = await validateAndFetchCsv(csvUrl)

        // Extract filename from URL if not provided
        if (!initialName) {
          const urlParts = csvUrl.split("/")
          const filenameWithParams = urlParts[urlParts.length - 1]
          const filename = decodeURIComponent(filenameWithParams.split(".")[0])
          setProjectName(filename)
        }

        // Set current date as publish date if not provided
        if (!initialPublishDate) {
          setPublishDate(new Date().toLocaleDateString("fr-FR"))
        }

        // Parse CSV
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("CSV parsing complete, rows:", results.data.length)

            if (results.data.length === 0) {
              setError("Le fichier CSV ne contient aucune donnée valide.")
              setLoading(false)
              return
            }

            // Log the first row to help debug column names
            console.log("First row sample:", results.data[0])

            const parsedTasks = results.data
              .filter((row: any) => row.Nom && row.Dates)
              .map((row: any, index: number) => {
                const { start, end, isSingleDay } = formatDateRange(row.Dates)
                return {
                  nom: row.Nom,
                  statut: row["Statut "] || "",
                  dates: row.Dates,
                  startDate: start,
                  endDate: end,
                  isSingleDay,
                  isMainPhase: row.Nom.trim().endsWith(":") || /^[A-Z0-9\s]+$/.test(row.Nom.trim()),
                  height: 40, // Default height
                }
              })
              .sort((a: Task, b: Task) => a.startDate.getTime() - b.startDate.getTime())

            console.log(`Parsed ${parsedTasks.length} valid tasks`)

            if (parsedTasks.length === 0) {
              setError("Aucune tâche valide n'a été trouvée dans le fichier CSV.")
              setLoading(false)
              return
            }

            // Initialize taskRefs with the correct length
            taskRefs.current = parsedTasks.map(() => null)

            setTasks(parsedTasks)
            setFilteredTasks(parsedTasks)

            // Get all months in the project duration
            if (parsedTasks.length > 0) {
              const earliestDate = parsedTasks.reduce(
                (min, task) => (task.startDate < min ? task.startDate : min),
                parsedTasks[0].startDate,
              )

              const latestDate = parsedTasks.reduce(
                (max, task) => (task.endDate > max ? task.endDate : max),
                parsedTasks[0].endDate,
              )

              setMonths(getMonthsInRange(earliestDate, latestDate))
            }

            setLoading(false)
          },
          error: (error) => {
            console.error("CSV parsing error:", error)
            setError(`Error parsing CSV: ${error.message}`)
            setLoading(false)
          },
        })
      } catch (err) {
        console.error("Error fetching CSV:", err)
        setError(`Error fetching CSV: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }

    fetchCSV()
  }, [csvUrl, initialName, initialPublishDate])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTasks(tasks)
    } else {
      const filtered = tasks.filter((task) => task.nom.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredTasks(filtered)
    }
  }, [searchQuery, tasks])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement du diagramme de Gantt...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{projectName}</h1>
          <p className="text-sm text-gray-500">Date de publication: {publishDate}</p>
        </div>
        <Button onClick={exportToPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exporter en PDF
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="search"
            placeholder="Rechercher une tâche..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Légende des couleurs</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="w-80">
              <ColorLegend />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="overflow-auto">
        <div className="inline-block min-w-full">
          <div className="overflow-hidden" ref={chartRef}>
            <div className="flex">
              {/* Fixed first column */}
              <div className="sticky left-0 z-20 bg-white dark:bg-gray-950 shadow-md">
                {/* Empty cell at intersection */}
                <div className="sticky top-0 z-30 h-16 border-b border-r p-2 w-64 font-bold bg-white dark:bg-gray-950"></div>

                {filteredTasks.map((task, index) => (
                  <div
                    key={`task-${index}`}
                    ref={(el) => (taskRefs.current[index] = el)}
                    className={`border-b border-r p-2 w-64 ${task.isMainPhase ? "font-bold underline" : "font-normal"}`}
                    style={{ height: `${task.height}px` }}
                  >
                    {task.nom}
                  </div>
                ))}
              </div>

              {/* Scrollable timeline */}
              <div className="flex">
                {months.map((month, monthIndex) => (
                  <div key={`month-${monthIndex}`} className="flex flex-col">
                    {/* Month header - sticky top */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-gray-950">
                      {/* Month name */}
                      <div
                        className="text-center font-bold border-b p-2"
                        style={{ width: `${month.days.length * 30}px` }}
                      >
                        {month.name}
                      </div>

                      {/* Days row */}
                      <div className="flex border-b">
                        {month.days.map((day) => (
                          <div key={`${month.name}-${day}`} className="w-[30px] text-center text-xs border-r py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Task bars */}
                    {filteredTasks.map((task, taskIndex) => {
                      const { display, width, offset } = getTaskBarPosition(task, month, monthIndex, months)

                      return (
                        <div
                          key={`bar-${monthIndex}-${taskIndex}`}
                          className="border-b relative"
                          style={{
                            width: `${month.days.length * 30}px`,
                            height: `${task.height}px`,
                          }}
                        >
                          {display && (
                            <div
                              className="absolute h-6 rounded-md top-2"
                              style={{
                                left: `${offset}px`,
                                width: `${width}px`,
                                backgroundColor: getTaskColor(task.nom),
                              }}
                              title={`${task.nom}: ${task.dates}`}
                            ></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getTaskColor(taskName: string): string {
  const name = taskName.toLowerCase()

  if (
    name.includes("préparation") ||
    name.includes("analyse") ||
    name.includes("conception") ||
    name.includes("itérations") ||
    name.includes("rédaction")
  ) {
    return "#FFD700" // yellow
  }

  if (name.includes("réunion") || name.includes("atelier") || name.includes("envoi") || name.includes("présentation")) {
    return "#3b82f6" // blue
  }

  if (name.includes("retours")) {
    return "#4ade80" // green
  }

  if (name.includes("validation")) {
    return "#ef4444" // red
  }

  return "#8b5cf6" // purple (default)
}
