# Articulate English — test result signup worker

Sits between the static site on GitHub Pages and Brevo. It records the contact
**and the consent**, then emails the test result.

Nothing here is secret except the API key, which belongs in Cloudflare, not in
this repo.

## 1. Brevo (free plan)
1. Create an account at brevo.com and verify it.
2. SMTP & API → API keys → Generate a new key. Copy it.
3. Contacts → Lists → create a list called "Articulate English". Note its numeric id.
4. Senders, domains and dedicated IPs → add and verify a sender address
   (hello@articulate.ee if the domain is set up, otherwise any address you verify).
   Brevo will not send until a sender is validated.

## 2. Cloudflare (free plan)
1. Create a free Cloudflare account.
2. Workers & Pages → Create → Workers → Create a Worker (name it `ae-signup`).
3. Replace the starter code with the contents of `workers/signup.js`.
4. Settings → Variables → add:
   - `BREVO_API_KEY`  (secret)
   - `BREVO_LIST_ID`  (plain text, the numeric list id)
   - `FROM_EMAIL`    (plain text, the verified sender address)
5. Deploy. The Worker URL looks like `https://ae-signup.<your-subdomain>.workers.dev`.

## 3. Point the site at it
In `site-config.js`:
```js
workerEndpoint: 'https://ae-signup.<your-subdomain>.workers.dev',
```
Leave it `''` until the Worker is live — the form then says honestly that it is
not set up yet rather than failing.

## What it stores
- email, test taken, level, score, band breakdown, date
- marketing opt-in: YES/NO
- consent timestamp and source

That is the record POPIA s69 and GDPR require you to keep. Nothing else is stored.

## Testing
After deploying, open a test page locally, fill the form and submit. Then check
Brevo → Contacts for the new contact and its attributes, and confirm the email
arrived. If the contact appears but the email does not, the sender address is
almost always the problem.
