import { fetchPlanningFile } from "@/lib/github"
import { GanttChartWrapper } from "@/components/gantt-chart-wrapper"

export default async function PlanningPage({ params }: { params: { id: string } }) {
  try {
    const { url, name, publishedAt } = await fetchPlanningFile(params.id)

    return (
      <main className="container mx-auto p-4 min-h-screen">
        <GanttChartWrapper csvUrl={url} initialName={name} initialPublishDate={publishedAt} />
      </main>
    )
  } catch (error) {
    console.error("Error in planning page:", error)

    // Fallback to sample data
    return (
      <main className="container mx-auto p-4 min-h-screen">
        <GanttChartWrapper
          csvUrl="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tasks%201c8d4f937e638190af1efbc2a32cf799-DxgwR4jquvHvZYnA33TADkgwl67XRl.csv"
          initialName="Sample Planning"
          initialPublishDate={new Date().toLocaleDateString("fr-FR")}
        />
      </main>
    )
  }
}
