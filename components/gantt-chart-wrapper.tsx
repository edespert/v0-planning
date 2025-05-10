"use client"

import { GanttChart } from "@/components/gantt-chart"

interface GanttChartWrapperProps {
  csvUrl: string
  initialName: string
  initialPublishDate: string
}

export function GanttChartWrapper({ csvUrl, initialName, initialPublishDate }: GanttChartWrapperProps) {
  return <GanttChart csvUrl={csvUrl} initialName={initialName} initialPublishDate={initialPublishDate} />
}
