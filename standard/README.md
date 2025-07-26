# Standard RedwoodSDK Starter

This "standard starter" is the recommended implementation for RedwoodSDK. You get a full-stack Typescript web application with:

- Vite
- database (Prisma via D1)
- Session Management (via DurableObjects)
- Passkey authentication (Webauthn)
- Storage (via R2)

## Companion Chrome Extension

This starter can be paired with the **RedwoodSDK Chrome Extension Starter** to create a unified cross-platform experience:

- **Shared Backend**: Both web app and extension use the same RedwoodSDK API
- **Synchronized Authentication**: Users stay logged in across both platforms
- **Extended Functionality**: Bring your web app features into any browser tab
- **Unified User Experience**: Seamless data sync between web and extension

To add a companion extension: `npx create-rwsdk my-extension --template=extension`

## Creating your project

```shell
npx create-rwsdk my-project-name
cd my-project-name
npm install
```

## Running the dev server

```shell
pnpm run dev
```

Point your browser to the URL displayed in the terminal (e.g. `http://localhost:5173/`). You should see a "Hello World" message in your browser.

## Deploying your app

### Wrangler Setup

Within your project's `wrangler.jsonc`:

- Replace the `__change_me__` placeholders with a name for your application

- Create a new D1 database:

```shell
npx wrangler d1 create my-project-db
```

Copy the database ID provided and paste it into your project's `wrangler.jsonc` file:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-project-db",
      "database_id": "your-database-id",
    },
  ],
}
```

### Authentication Setup

For authentication setup and configuration, including optional bot protection, see the [Authentication Documentation](https://docs.rwsdk.com/core/authentication).

## Building with Chrome Extension

For a complete cross-platform experience, consider adding the companion Chrome extension:

1. **Create extension after your web app:**
   ```shell
   npx create-rwsdk my-project-extension --template=extension
   cd my-project-extension
   ```

2. **Configure same backend:**
   - Use the same API URL in extension's `.env`
   - Authentication will sync automatically
   - Users can access features from both web app and browser extension

## Further Reading

- [RedwoodSDK Documentation](https://docs.rwsdk.com/)
- [Chrome Extension Starter](../extension/README.md)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/runtime-apis/secrets/)
