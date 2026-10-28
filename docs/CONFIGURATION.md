# Configuration

The static website has no required credentials. `npm run dev` binds to loopback and deliberately refuses hidden files, server source and private folders.

## Optional email endpoint

`api/contact.js` is a Vercel-style serverless endpoint. Configure these privately in the hosting provider:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Server-only email provider credential |
| `CONTACT_FROM_EMAIL` | A sender verified with your email provider |
| `CONTACT_TO_EMAIL` | The privately chosen enquiry destination |

The static local preview does not run the endpoint. Review public business contact details and legal copy before deploying a fork. Configure the public directory data in `productores-data.js`; do not put private leads, farmer conversations or order/customer records there.

## PWA

Serve the project over HTTP locally or HTTPS when hosted. The service worker caches listed public assets only. Increment its cache version when changing the precache list. It is not a substitute for a payment system, order database or realtime stock service.
