# Security Policy

## Reporting a vulnerability

Do not publish exploit details in a public issue.

Report security-sensitive findings privately to the repository maintainers through GitHub's private vulnerability reporting feature when available.

## Security boundaries

ClearGuide Studio interacts with user-selected web pages. Security-sensitive areas include:

- host permissions
- content-script injection
- imported guide JSON
- DOM selectors and page-derived text
- cross-page workflow navigation
- extension storage
- any future network or AI integration

## Rules for contributions

- never commit API keys, tokens, credentials, cookies, or session material
- do not add `eval()` or `new Function()` to extension pages
- do not load remote executable JavaScript into the extension
- validate imported guide structures before execution
- request only the minimum site permissions required
- keep sensitive page values out of guide exports
