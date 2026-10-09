/**
 * @file comparison-table.tsx
 * @description Table component comparing GRAB with other popular request libraries.
 */
import { Check, X, AlertCircle } from "lucide-react"

const libraries = ["GRAB", "Axios", "TanStack", "SWR", "Alova", "Ky"]

const features = [
  { name: "Size", values: ["4KB", "13KB", "39KB", "4.2KB", "4KB", "4KB"] },
  { name: "Zero Dependencies", values: [true, false, false, false, true, true] },
  { name: "isLoading State", values: [true, false, true, true, true, false] },
  { name: "Auto JSON", values: [true, true, false, false, true, true] },
  { name: "Request Deduplication", values: [true, false, true, true, true, false] },
  { name: "Caching", values: [true, false, true, true, true, false] },
  { name: "Mock Testing", values: [true, false, false, false, "partial", false] },
  { name: "Rate Limiting", values: [true, false, false, false, "partial", false] },
  { name: "Auto Retry", values: [true, "partial", true, true, true, true] },
  { name: "Pagination Support", values: [true, false, true, "partial", true, false] },
  { name: "Debug Logging", values: [true, "partial", true, true, "partial", "partial"] },
  { name: "Request History", values: [true, false, true, true, false, false] },
]

function CellValue({ value }: { value: boolean | string | "partial" }) {
  if (value === true) {
    return <Check className="h-5 w-5 text-primary mx-auto" />
  }
  if (value === false) {
    return <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
  }
  if (value === "partial") {
    return <AlertCircle className="h-5 w-5 text-yellow-500 mx-auto" />
  }
  return <span className="text-sm font-medium text-foreground">{value}</span>
}

export function ComparisonTable() {
  return (
    <section className="py-20 md:py-32 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How GRAB <span className="text-primary">Compares</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Stop trying to make fetch happen! See how GRAB stacks up against the competition.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-semibold text-foreground">Feature</th>
                {libraries.map((lib, index) => (
                  <th
                    key={lib}
                    className={`text-center py-4 px-4 font-semibold ${
                      index === 0 ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {lib}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, rowIndex) => (
                <tr key={feature.name} className={`border-b border-border ${rowIndex % 2 === 0 ? "bg-card/50" : ""}`}>
                  <td className="py-4 px-4 text-muted-foreground">{feature.name}</td>
                  {feature.values.map((value, colIndex) => (
                    <td key={colIndex} className={`py-4 px-4 text-center ${colIndex === 0 ? "bg-primary/5" : ""}`}>
                      <CellValue value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-muted-foreground mt-8 text-sm">
          <AlertCircle className="h-4 w-4 text-yellow-500 inline mr-1" />
          Partial support or requires additional configuration
        </p>
      </div>
    </section>
  )
}
