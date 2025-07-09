import { useState, useEffect } from "react"
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card"

interface User {
  name: string
  avatar_url: string
}

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

function LoginPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <a href={`${apiUrl}/auth/github/login`}>
            <Button className="w-full">Login with GitHub</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}

function ReminderApp({ user }: { user: User }) {
  const handleLogout = async () => {
    // The backend doesn't have a formal logout endpoint that revokes the session token.
    // We can "log out" on the client by simply clearing the cookie.
    // A better approach would be to have the backend invalidate the session.
    // For now, we'll redirect to a non-existent backend endpoint that will clear the cookie
    // by nature of being on the same domain. A bit of a hack.
    // A better way would be to call a /logout endpoint.
    window.location.href = `${apiUrl}/auth/logout`; // This will trigger a page reload and auth check.
  };

  return (
    <div className="container mx-auto p-4">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <p>Welcome, {user.name}!</p>
        <img src={user.avatar_url} alt="user avatar" className="w-8 h-8 rounded-full" />
        <Button onClick={handleLogout} variant="outline">Logout</Button>
        <ModeToggle />
      </div>
      <h1 className="text-2xl font-bold">Your Reminders</h1>
      {/* Reminder functionality will go here */}
    </div>
  );
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
