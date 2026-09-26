## 📋 Installation Steps for the Jira Dashboard

**Prerequisites**

- Node.js (version 14 or higher)
- npm (bundled with Node.js)
- An active Jira account with API access

**Installation**

Clone the repository:

```bash
git clone https://github.com/nelsoncabrera06/Jira-Dashboard.git
cd jira-dashboard
```

**Install dependencies**

```bash
npm install
```

**Configure environment variables**

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env` in the project root:

```bash
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token
PORT=3000
```

**Generate your Jira API token**

Go to: https://id.atlassian.com/manage-profile/security/api-tokens

Click "Create API token"

Copy the token and paste it into your `.env` file

**Start the server**

```bash
npm start
```

or simply:

```bash
node server.js
```

(Or, for development with auto-restart: `npm run dev`)

**Access the application**

Open your browser at: http://localhost:3000

**Custom dashboard example**

<img width="1344" height="768" alt="gemini-difuso" src="https://github.com/user-attachments/assets/b701c03f-0f77-4173-8814-24980cb64f21" />
