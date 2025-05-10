import { PlanningList } from "@/components/planning-list"

export default function Home() {
  return (
    <main className="container mx-auto p-4 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Plannings disponibles</h1>
      <PlanningList />
    </main>
  )
}
