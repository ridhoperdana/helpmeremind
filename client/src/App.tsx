import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from "./components/theme-provider"

function App() {
  const [token, setToken] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [report, setReport] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerateReport = async () => {
    setLoading(true)
    setError("")
    setReport("")

    try {
      const response = await fetch(
        `http://localhost:8080/api/report?date=${date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || "Failed to generate report")
      }

      const reportText = await response.text()
      setReport(reportText)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="container mx-auto p-4">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>GitHub PR Report</CardTitle>
            <CardDescription>
              Enter your GitHub token and a date to generate a report of your
              pull requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">GitHub Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </CardFooter>
        </Card>

        {error && (
          <Card className="max-w-2xl mx-auto mt-4">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {report && (
          <Card className="max-w-2xl mx-auto mt-4">
            <CardHeader>
              <CardTitle>Report for {date}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
