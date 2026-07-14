# Vercel Frontend Deployment

Deploy this frontend as a separate Vercel project from the same GitHub repo.

## Project settings

```txt
Framework Preset: Next.js
Root Directory: Porto/portfolio-frontend
Build Command: npm run build
Output Directory: leave default
Install Command: npm install
```

## Environment variable

Set this in Vercel Project Settings > Environment Variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://porto-backend-pearl.vercel.app/api/v1
```

Use `Production and Preview` for the environment scope.

## After backend/domain changes

If the backend Vercel domain changes, update `NEXT_PUBLIC_API_BASE_URL` and redeploy this frontend project.

After the frontend has a final Vercel URL, update the backend variable `PORTFOLIO_ALLOWED_ORIGINS` from `*` to that frontend URL, then redeploy the backend.
