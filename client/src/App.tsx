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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet"

interface User {
  name: string
  avatar_url: string
  login: string
}

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

function LoginPage() {
  const handleLogin = () => {
    const includePrivateRepos = (
      document.getElementById("private_repo_scope") as HTMLInputElement
    )?.checked
    let loginUrl = `${apiUrl}/auth/github/login`
    if (includePrivateRepos) {
      loginUrl += "?private_repo=true"
    }
    window.location.href = loginUrl
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">HelpMeRemind</h1>
        <Button onClick={handleLogin} variant="outline">
          <Github className="mr-2 h-4 w-4" /> Login
        </Button>
      </header>

      <main className="flex-grow">
        <section className="text-center py-32 md:py-48 lg:py-60 min-h-[60vh]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              Never Forget What You've Accomplished
            </h2>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
              HelpMeRemind automatically generates daily reports of your GitHub
              pull requests, so you can easily track your progress and prepare
              for your stand-ups.
            </p>
            <Button onClick={handleLogin} size="lg">
              <Github className="mr-2 h-4 w-4" /> Get Your First Report
            </Button>
          </div>
        </section>

        <section id="features" className="py-16 md:py-24 bg-muted">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold">How It Works</h3>
              <p className="text-lg text-muted-foreground mt-2">
                Three simple steps to your daily PR summary.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground mx-auto mb-4">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <h4 className="text-xl font-semibold mb-2">
                  Login with GitHub
                </h4>
                <p className="text-muted-foreground">
                  Securely connect your GitHub account with a single click.
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground mx-auto mb-4">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <h4 className="text-xl font-semibold mb-2">Pick a Date</h4>
                <p className="text-muted-foreground">
                  Select the day you want to generate a report for.
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground mx-auto mb-4">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <h4 className="text-xl font-semibold mb-2">Get Report</h4>
                <p className="text-muted-foreground">
                  Instantly receive a Markdown-formatted list of your PRs.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="login" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Boost Your Productivity?
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              Stop wasting time compiling your daily updates. Let us do it for
              you.
            </p>
            <div className="max-w-md mx-auto">
              <Card className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <input
                    type="checkbox"
                    id="private_repo_scope"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="private_repo_scope"
                    className="ml-2 block text-sm text-muted-foreground"
                  >
                    Include private repositories in your report
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  We request read-only access to your public and (optionally)
                  private repositories to generate the report. Your credentials
                  are never stored on our servers.
                </p>
                <Button onClick={handleLogin} size="lg" className="w-full">
                  <Github className="mr-2 h-4 w-4" /> Login with GitHub & Try
                  Now
                </Button>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} HelpMeRemind. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
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
      {/* Desktop Header */}
      <div className="hidden md:flex absolute top-4 right-4 items-center gap-4">
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

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between">
        <Sheet>
          <SheetTrigger asChild>
            <img
              src={user.avatar_url}
              alt="user avatar"
              className="w-8 h-8 rounded-full cursor-pointer"
            />
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px]">
            <SheetHeader className="text-left">
              <SheetTitle>Hi, {user.name || user.login}!</SheetTitle>
            </SheetHeader>
            <div className="absolute bottom-4 left-4 right-4">
              <Button onClick={handleLogout} variant="outline" className="w-full">
                Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <ModeToggle />
      </div>

      <div className="max-w-2xl mx-auto mt-8 md:mt-16">
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
