package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

type PullRequest struct {
	URL       string    `json:"url"`
	HTMLURL   string    `json:"html_url"`
	Title     string    `json:"title"`
	Number    int       `json:"number"`
	CreatedAt time.Time `json:"created_at"`
}

type Commit struct {
	SHA    string `json:"sha"`
	Commit struct {
		Message string `json:"message"`
	} `json:"commit"`
}

type User struct {
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

type SessionData struct {
	User  User
	Token *oauth2.Token
}

var sessions = make(map[string]SessionData) // In-memory session store: sessionID -> SessionData

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/report", reportHandler)
	mux.HandleFunc("/api/me", handleMe)
	mux.HandleFunc("/auth/github/login", handleGitHubLogin)
	mux.HandleFunc("/auth/github/callback", handleGitHubCallback)
	mux.HandleFunc("/auth/logout", handleLogout)

	handler := enableCORS(mux)

	port := os.Getenv("API_PORT")
	if port == "" {
		port = "7733"
	}

	fmt.Println("Server starting on :" + port)
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), handler); err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
	}
}

func handleGitHubLogin(w http.ResponseWriter, r *http.Request) {
	oauthStateString, err := generateSessionID()
	if err != nil {
		http.Error(w, "Failed to generate state", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "oauthstate",
		Value:    oauthStateString,
		Path:     "/",
		Expires:  time.Now().Add(10 * time.Minute),
		HttpOnly: true,
	})

	url := githubOauthConfig.AuthCodeURL(oauthStateString, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleGitHubCallback(w http.ResponseWriter, r *http.Request) {
	oauthState, _ := r.Cookie("oauthstate")

	if r.FormValue("state") != oauthState.Value {
		fmt.Println("invalid oauth GitHub state")
		http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
		return
	}

	code := r.FormValue("code")
	token, err := githubOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		fmt.Printf("oauthConf.Exchange() failed with '%s'\n", err)
		http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
		return
	}

	oauthClient := githubOauthConfig.Client(context.Background(), token)
	client := oauthClient
	user, err := getAuthenticatedUser(client) // token is now in the client
	if err != nil {
		fmt.Printf("getAuthenticatedUser failed with '%s'\n", err)
		http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
		return
	}

	sessionID, err := generateSessionID()
	if err != nil {
		http.Error(w, "Failed to generate session ID", http.StatusInternalServerError)
		return
	}

	sessions[sessionID] = SessionData{
		User:  *user,
		Token: token,
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
	})

	frontendURL := "http://localhost:5173"
	if frontendURLFromEnv := os.Getenv("FRONTEND_URL"); frontendURLFromEnv != "" {
		frontendURL = frontendURLFromEnv
	}

	// Redirect to the frontend
	http.Redirect(w, r, frontendURL, http.StatusTemporaryRedirect)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err == nil {
		sessionID := cookie.Value
		delete(sessions, sessionID)
	}

	// Clear the cookie by setting its max age to -1
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})

	frontendURL := "http://localhost:5173"
	if frontendURLFromEnv := os.Getenv("FRONTEND_URL"); frontendURLFromEnv != "" {
		frontendURL = frontendURLFromEnv
	}
	http.Redirect(w, r, frontendURL, http.StatusTemporaryRedirect)
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	sessionID := cookie.Value
	sessionData, ok := sessions[sessionID]
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessionData.User)
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// In a production environment, you should restrict the allowed origins.
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:7734")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func reportHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getAuthenticatedClient(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		http.Error(w, "Date parameter is required", http.StatusBadRequest)
		return
	}

	report, err := generateReport(client, dateStr)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate report: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Write([]byte(report))
}

func generateReport(client *http.Client, dateStr string) (string, error) {
	fmt.Println("Generating report for date:", dateStr)
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return "", fmt.Errorf("invalid date format, use YYYY-MM-DD: %w", err)
	}
	dateOnly := date.Format("2006-01-02")

	user, err := getAuthenticatedUser(client)
	if err != nil {
		return "", fmt.Errorf("failed to get authenticated user: %w", err)
	}

	query := fmt.Sprintf("is:pr author:%s created:%s..%s", user.Login, dateOnly, dateOnly)
	searchURL := fmt.Sprintf("https://api.github.com/search/issues?q=%s", strings.ReplaceAll(query, " ", "+"))

	req, _ := http.NewRequest("GET", searchURL, nil)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch PRs: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to fetch PRs: status code %d, body: %s", resp.StatusCode, string(bodyBytes))
	}
	defer resp.Body.Close()

	var searchResults struct {
		Items []struct {
			Title       string `json:"title"`
			HTMLURL     string `json:"html_url"`
			Number      int    `json:"number"`
			PullRequest struct {
				URL string `json:"url"`
			} `json:"pull_request"`
		} `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&searchResults); err != nil {
		return "", fmt.Errorf("failed to decode search results: %w", err)
	}

	var report bytes.Buffer
	for _, item := range searchResults.Items {
		fmt.Fprintf(&report, "## [%s](%s)\n", item.Title, item.HTMLURL)

		commits, err := getCommitsForPR(client, item.PullRequest.URL)
		if err != nil {
			fmt.Fprintf(&report, "Failed to fetch commits for PR #%d: %v\n\n", item.Number, err)
			continue
		}

		for i, c := range commits {
			if i >= 5 {
				break
			}
			msg := strings.Split(c.Commit.Message, "\n")[0]
			fmt.Fprintf(&report, "- `%s`: %s\n", c.SHA[:7], msg)
		}
		fmt.Fprintln(&report)
	}

	return report.String(), nil
}

func getAuthenticatedUser(client *http.Client) (*User, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user: status code %d", resp.StatusCode)
	}

	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func getCommitsForPR(client *http.Client, prAPIURL string) ([]Commit, error) {
	commitsURL := prAPIURL + "/commits"
	req, _ := http.NewRequest("GET", commitsURL, nil)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("request failed with status: %d", resp.StatusCode)
	}

	var commits []Commit
	if err := json.NewDecoder(resp.Body).Decode(&commits); err != nil {
		return nil, err
	}

	return commits, nil
}

func getAuthenticatedClient(r *http.Request) (*http.Client, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return nil, fmt.Errorf("unauthorized: no session cookie")
	}

	sessionID := cookie.Value
	sessionData, ok := sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("unauthorized: invalid session")
	}

	return githubOauthConfig.Client(context.Background(), sessionData.Token), nil
}
