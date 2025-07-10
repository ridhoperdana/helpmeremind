import { useState, useEffect } from "react"
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle"
import { Button } from "./components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card"
import { Label } from "./components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover"
import { cn } from "./lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Github } from "lucide-react"

interface User {
  name: string
  avatar_url: string
  login: string
}

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

function LoginPage() {
  const handleLogin = () => {
    const includePrivateRepos = (document.getElementById('private_repo_scope') as HTMLInputElement)?.checked;
    let loginUrl = '/auth/github/login';
    if (includePrivateRepos) {
      loginUrl += '?private_repo=true';
    }
    window.location.href = loginUrl;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-8">HelpMeRemind</h1>
      <div className="max-w-md text-center mb-8">
        <p className="text-lg mb-4">
          Generate daily reports of your GitHub activity with a single click.
        </p>
        <div className="p-4 rounded-lg text-center text-sm">
          <div className="flex items-center justify-center mb-2">
            <input type="checkbox" id="private_repo_scope" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label htmlFor="private_repo_scope" className="ml-2 block text-gray-200">
              Include private repositories in your report
            </label>
          </div>
          <p className="text-xs text-gray-400">
            We will only have read-access to your repositories. Your authentication token is never stored on our servers.
          </p>
        </div>
      </div>
      <Button onClick={handleLogin}>
        <Github className="mr-2 h-4 w-4" /> Login with GitHub
      </Button>
    </div>
  );
}

function ReminderApp({ user }: { user: User }) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [report, setReport] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogout = async () => {
    window.location.href = `${apiUrl}/auth/logout` // This will trigger a page reload and auth check.
  }

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
        `${apiUrl}/api/report?date=${format(date, "yyyy-MM-dd")}`,
        {
          credentials: "include", // Send cookies with the request
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
    <div className="container mx-auto p-4">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <p>
          Welcome, <strong>{user.name || user.login}</strong>!
        </p>
        <img
          src={user.avatar_url}
          alt="user avatar"
          className="w-8 h-8 rounded-full"
        />
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
        <ModeToggle />
      </div>

      <div className="max-w-2xl mx-auto mt-16">
        <Card>
          <CardHeader>
            <CardTitle>GitHub PR Report</CardTitle>
            <CardDescription>
              Select a date to generate a report of your pull requests for that
              day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Date</Label>
              <Popover
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
              >
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
              <CardTitle>
                Report for {date ? format(date, "PPP") : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      console.log("fetching user: ", apiUrl)
      try {
        const response = await fetch(`${apiUrl}/api/me`, {
          credentials: 'include', // This tells the browser to send cookies
        });
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Failed to fetch user:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p>
        </div>
      ) : user ? (
        <ReminderApp user={user} />
      ) : (
        <LoginPage />
      )}
    </ThemeProvider>
  )
}

export default App
