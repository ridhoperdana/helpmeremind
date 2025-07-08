package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
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
	Login string `json:"login"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/report", reportHandler)

	handler := enableCORS(mux)

	fmt.Println("Server starting on :7744")
	if err := http.ListenAndServe(":7733", handler); err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
	}
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// In a production environment, you should restrict the allowed origins.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

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

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Authorization header is missing or invalid", http.StatusUnauthorized)
		return
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		http.Error(w, "Date parameter is required", http.StatusBadRequest)
		return
	}

	report, err := generateReport(token, dateStr)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate report: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Write([]byte(report))
}

func generateReport(token, dateStr string) (string, error) {
	fmt.Println("Generating report for date:", dateStr)
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return "", fmt.Errorf("invalid date format, use YYYY-MM-DD: %w", err)
	}
	dateOnly := date.Format("2006-01-02")

	client := &http.Client{}

	user, err := getAuthenticatedUser(client, token)
	if err != nil {
		return "", fmt.Errorf("failed to get authenticated user: %w", err)
	}

	query := fmt.Sprintf("is:pr author:%s created:%s..%s", user.Login, dateOnly, dateOnly)
	searchURL := fmt.Sprintf("https://api.github.com/search/issues?q=%s", strings.ReplaceAll(query, " ", "+"))

	req, _ := http.NewRequest("GET", searchURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch PRs: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch PRs: status code %d", resp.StatusCode)
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

		commits, err := getCommitsForPR(client, item.PullRequest.URL, token)
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

func getAuthenticatedUser(client *http.Client, token string) (*User, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)

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

func getCommitsForPR(client *http.Client, prAPIURL, token string) ([]Commit, error) {
	commitsURL := prAPIURL + "/commits"
	req, _ := http.NewRequest("GET", commitsURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

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
