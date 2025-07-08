# Help Me Remind

Ever returned from a vacation, opened your terminal, and thought:

“Wait... what did I even do last week?” 😵‍💫

Fear not, forgetful engineer!

This Web App is your GitHub-powered time machine, designed specifically for those who:

1. Pushed code like a hero 🚀
2. Closed PRs like a beast 🔥
...and then completely forgot everything after 3 days of eating too much and sleeping in 🏖️🥱

## 🛠️ What it does
### 🕵️ Finds all your PRs on a specific date
### 🔍 Digs up the top 5 commits from each PR

## 🛠️ Prerequisites

### Go

- **Version**: `1.23.2`

You can use a tool like `gvm` to manage Go versions.

### Node.js

- **Version**: `v22.12.0`

It is recommended to use `nvm` to manage Node.js versions.
```bash
nvm use v22.12.0
```

## 🚀 Getting Started

### 1. Install Dependencies

**API (Go Server)**

Navigate to the `server` directory and install the Go modules.

```bash
cd server
go mod tidy
```

**Web (React Client)**

Navigate to the `client` directory and install the npm packages.

```bash
cd client
npm install
```

### 2. Running the Application

You will need two separate terminal sessions to run both the backend API and the frontend web server.

**Run the API (Go Server)**

In the `server` directory:

```bash
go run .
```

The API server will be running on `http://localhost:8080` (or the configured port).

**Run the Web (React Client)**

In the `client` directory:

```bash
npm run dev
```

The development server will be running on `http://localhost:5173` (or the next available port).

---
Made with ❤️

## 📜 License

This is a for-fun, open-source project. It is licensed under the [MIT License](LICENSE).