# HelpMeRemind

This script is to help fellow software engineers that often forgot their work after holiday.
This script will output:
- PR
- The commits inside the PR

## How to Run
1. Install Golang
2. Run the CLI
```go
go run main.go --username <username> --token <github token> --date <the date you want to get work history>
```

## Roadmap
Features that i want to add later:
- [ ] Get commits instead of PR (sometime we just commit to master without PR 😜)
- [ ] Web version