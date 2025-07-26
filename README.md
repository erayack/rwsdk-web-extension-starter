## ✨ RedwoodSDK Web + Chrome Extension Starter

**Complete boilerplate** for building **cross-platform applications** with RedwoodSDK — featuring a web application and companion Chrome extension with shared authentication and synchronized data.

It provides:

- 🌐 **Web Application** - Full-stack app with SSR, RSC, and edge deployment
- 🔧 **Chrome Extension** - Companion browser extension with React + TypeScript
- 🔄 **Shared Authentication** - Users stay logged in across both platforms
- 📱 **Data Synchronization** - Real-time sync between web and extension

---

## 📦 Quickstart

### Web Application + Chrome Extension

Create a complete cross-platform system:

**1. Clone this repository:**
```bash
git clone https://github.com/redwoodjs/rwsdk-web-extension-starter
cd rwsdk-web-extension-starter
pnpm install
```

**2. Start development:**
```bash
# Start web application
pnpm run dev:web

# Start extension development (in another terminal)
pnpm run dev:extension
```

**3. Load extension in Chrome:**
- Open `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select the `extension/dist` folder

## 🚀 Available Scripts

### Development
- `pnpm run dev:web` - Start web application dev server
- `pnpm run dev:extension` - Start extension build watcher

### Building
- `pnpm run build:web` - Build web application for production
- `pnpm run build:extension` - Build extension for Chrome Web Store

### Deployment
- `pnpm run deploy:web` - Deploy web app to Cloudflare Workers
- `pnpm run package:extension` - Create extension.zip for Chrome Web Store

### Features

🔄 **Synchronized Authentication** - Users stay logged in across both platforms
🌐 **Shared Backend** - Both use the same RedwoodSDK API endpoints
📱 **Cross-Platform** - Seamless data sync between web app and browser extension
⚡ **Real-time** - WebSocket support across web and extension contexts

### Add more routes?

As long as you return a valid Response, RedwoodSDK is happy!

```js
// worker.tsx

import { defineApp } from "rwsdk/worker";
import { route, render } from "rwsdk/router";
import MyReactPage from "@app/pages/MyReactPage";

export default defineApp([
  render(Document, [
    route("/", () => new Response("Hello, World!")),
    route("/ping", function () {
      return <h1>Pong!</h1>;
    }),
    route("/react", MyReactPage)
    route("/docs", async () => {
      return new Response(null, {
        status: 301,
        headers: {
          "Location": "https://docs.rwsdk.com",
        },
      });
    }),
    route("/sitemap.xml", async () => {
      return new Response(sitemap, {
        status: 200,
        headers: {
          "Content-Type": "application/xml",
        },
      });
    }),
    route("/robots.txt", async () => {
      const robotsTxt = `User-agent: *
        Allow: /
        Disallow: /search
        Sitemap: https://rwsdk.com/sitemap.xml`;

      return new Response(robotsTxt, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }),
  ]),
]);
```

Start building immediately → [Quick start guide](https://docs.rwsdk.com/getting-started/quick-start/)

---

## 🚀 React Server Components

RedwoodSDK is true Javascript full-stack:

```js
// users.ts (server function)
"use server";
import { db } from "@/db";

export async function getUsers() {
  const users = await db.users.findAll();
  return users;
}

// UserList.tsx (React server component)
import { getUsers } from "./users";

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <div>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

Setup a database now → [React Server Components](https://docs.rwsdk.com/core/react-server-components/)

---

## ⭐️ Like it? Star it!

If this project saves you time or sparks ideas, please [⭐ star the repo](https://github.com/redwoodjs/sdk) — it really helps us grow the community.

---

## 🛠 Contributing

This is a Web + Extension boilerplate repository. To contribute:

- Fix bugs or propose improvements to the starter templates
- Join our community on [Discord](https://discord.gg/redwoodjs)

## 📁 Project Structure

```
├── standard/           # RedwoodSDK web application
│   ├── src/           # App components and pages
│   ├── prisma/        # Database schema and migrations
│   └── wrangler.jsonc # Cloudflare deployment config
├── extension/         # Chrome extension companion
│   ├── src/          # Extension code (popup, background, content)
│   ├── manifest.json # Extension manifest
│   └── dist/         # Built extension (after npm run build)
└── README.md         # This file
```
