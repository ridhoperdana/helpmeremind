import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from "./components/theme-provider"

function App() {
  const [token, setToken] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [report, setReport] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerateReport = async () => {
    if (!date) {
      setError("Please select a date.")
      return
    }

    setLoading(true)
    setError("")
    setReport("")

    try {
      const response = await fetch(
        `http://localhost:8080/api/report?date=${format(date, "yyyy-MM-dd")}`,
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
            <div className="flex flex-col space-y-2">
              <Label>Date</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <DayPicker
                    mode="single"
                    selected={date}
                    onSelect={(day) => {
                      setDate(day)
                      setIsDatePickerOpen(false)
                    }}
                    initialFocus
                    className="m-0"
                  />
                </PopoverContent>
              </Popover>
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
              <CardTitle>Report for {date ? format(date, "PPP") : ""}</CardTitle>
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
