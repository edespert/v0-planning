"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, FileSpreadsheet, AlertCircle } from "lucide-react"
import { fetchPlanningFiles } from "@/lib/github"
import type { PlanningFile } from "@/lib/github"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PlanningList() {
  const [planningFiles, setPlanningFiles] = useState<PlanningFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const loadPlanningFiles = async () => {
      try {
        setLoading(true)
        const files = await fetchPlanningFiles()
        setPlanningFiles(files)

        // If we only have one file and it's the sample file, we're in demo mode
        if (files.length === 1 && files[0].name === "Tasks 1c8d4f937e638190af1efbc2a32cf799") {
          setIsDemo(true)
          setError("Impossible d'accéder aux fichiers GitHub. Affichage des données de démonstration.")
        }
      } catch (err) {
        console.error("Error in planning-list component:", err)
        setError(`Une erreur s'est produite lors du chargement des fichiers. Utilisation des données de démonstration.`)
        setIsDemo(true)
      } finally {
        setLoading(false)
      }
    }

    loadPlanningFiles()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement des plannings...</div>
  }

  if (planningFiles.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium">Aucun planning disponible</h3>
        <p className="text-sm text-gray-500 mt-2">Aucun fichier CSV n'a été trouvé dans le dépôt GitHub.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isDemo && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Mode démonstration</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planningFiles.map((file) => (
          <Card key={file.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="line-clamp-2">{file.name}</CardTitle>
              <CardDescription>Date de publication: {file.publishedAt}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-gray-500">Cliquez sur le bouton ci-dessous pour générer le planning Gantt.</p>
            </CardContent>
            <CardFooter>
              <Link href={`/planning/${file.id}`} target="_blank" passHref>
                <Button className="w-full flex items-center gap-2">
                  Générer le planning
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
