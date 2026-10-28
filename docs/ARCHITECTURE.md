# AgroCanary — architecture

A static, installable marketplace pilot for Canary Islands produce, with producer profiles and manual order enquiries.

## Code boundaries

- ***.html:** Public pages, producer directory and legal copy.
- **assets/:** Website images and branding.
- **api/contact.js:** Optional server-side email endpoint.
- **scripts/serve.mjs:** Local website preview with a restricted file boundary.
- **tests/:** Preview security regression test.

## Data boundary

This public repository contains application source and fictional test inputs. Personal/operational state belongs in ignored local storage or separately configured services. Test results establish the behavior exercised by the suite; they do not certify live integrations, product efficacy or deployment readiness.

See the README for implementation status and `CONFIGURATION.md` for provider-specific requirements.
