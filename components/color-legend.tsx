export function ColorLegend() {
  const colorMappings = [
    { color: "#FFD700", label: "Préparation, Analyse, Conception, Itérations, Rédaction" },
    { color: "#3b82f6", label: "Réunion, Atelier, Envoi, Présentation" },
    { color: "#4ade80", label: "Retours" },
    { color: "#ef4444", label: "Validation" },
    { color: "#8b5cf6", label: "Autres tâches" },
  ]

  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-medium text-sm">Légende des couleurs</h4>
      {colorMappings.map((mapping, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: mapping.color }} aria-hidden="true"></div>
          <span className="text-sm">{mapping.label}</span>
        </div>
      ))}
    </div>
  )
}
