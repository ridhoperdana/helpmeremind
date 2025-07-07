package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
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

func main() {
	username := flag.String("username", "", "GitHub username")
	token := flag.String("token", "", "GitHub personal access token")
	dateStr := flag.String("date", "", "Date in YYYY-MM-DD format")
	flag.Parse()

	if *username == "" || *token == "" || *dateStr == "" {
		fmt.Println("Usage: go run main.go --username <username> --token <token> --date <YYYY-MM-DD>")
		os.Exit(1)
	}

	date, err := time.Parse("2006-01-02", *dateStr)
	if err != nil {
		fmt.Println("Invalid date format. Use YYYY-MM-DD")
		os.Exit(1)
	}
	dateOnly := date.Format("2006-01-02")

	client := &http.Client{}
	query := fmt.Sprintf("is:pr author:%s created:%s..%s", *username, dateOnly, dateOnly)
	searchURL := fmt.Sprintf("https://api.github.com/search/issues?q=%s", strings.ReplaceAll(query, " ", "+"))

	req, _ := http.NewRequest("GET", searchURL, nil)
	req.SetBasicAuth(*username, *token)

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		fmt.Printf("Failed to fetch PRs: %v\n", err)
		os.Exit(1)
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

	json.NewDecoder(resp.Body).Decode(&searchResults)

	// Prepare markdown file
	fileName := fmt.Sprintf("pr-report-%s.md", dateOnly)
	file, err := os.Create(fileName)
	if err != nil {
		fmt.Printf("Failed to create output file: %v\n", err)
		os.Exit(1)
	}
	defer file.Close()

	for _, item := range searchResults.Items {
		fmt.Fprintf(file, "## [%s](%s)\n", item.Title, item.HTMLURL)

		prAPIURL := item.PullRequest.URL
		prReq, _ := http.NewRequest("GET", prAPIURL, nil)
		prReq.SetBasicAuth(*username, *token)
		prResp, err := client.Do(prReq)
		if err != nil || prResp.StatusCode != 200 {
			fmt.Fprintf(file, "Failed to fetch PR data for #%d\n\n", item.Number)
			continue
		}
		var pr PullRequest
		json.NewDecoder(prResp.Body).Decode(&pr)
		prResp.Body.Close()

		commitsURL := prAPIURL + "/commits"
		commitReq, _ := http.NewRequest("GET", commitsURL, nil)
		commitReq.SetBasicAuth(*username, *token)
		commitResp, err := client.Do(commitReq)
		if err != nil || commitResp.StatusCode != 200 {
			fmt.Fprintf(file, "Failed to fetch commits for PR #%d\n\n", pr.Number)
			continue
		}
		var commits []Commit
		json.NewDecoder(commitResp.Body).Decode(&commits)
		commitResp.Body.Close()

		for i, c := range commits {
			if i >= 5 {
				break
			}
			msg := strings.Split(c.Commit.Message, "\n")[0]
			fmt.Fprintf(file, "- `%s`: %s\n", c.SHA[:7], msg)
		}
		fmt.Fprintln(file)
	}

	fmt.Printf("Markdown report written to %s\n", fileName)
}
