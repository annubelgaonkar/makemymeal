# makemymeal.com

Order a peanut butter & banana sandwich with your own amounts of bread, peanut butter and banana. The chef gets the order live, and the delivery is confirmed with a one-time password (OTP) that only the customer has.

- **Customer page (`/`)**: choose quantities, see the itemized bill (with delivery charge) and nutrition, enter name, phone and address (required), drop an exact pin on the map or use GPS, place the order, get the OTP and live status updates.
- **Kitchen (`/kitchen`)**: password-protected. Lists new orders with a chime, shows customer details and a Google Maps link to the pin, and moves orders through *Start making → Hand to delivery → Confirm delivery (OTP)*.

Test mode: no payment is collected.

## How the OTP is protected

- The OTP is created on the server, stored **encrypted** (AES-256-GCM), and never sent to the kitchen screen.
- The customer can see it only with the private order token kept in their browser.
- An order can become **Delivered** only through the server-side OTP check. There is no other way to set that status.
- 5 wrong OTP tries lock OTP entry for that order for 5 minutes.
- Orders can only move forward (`placed → preparing → out → delivered`).

## Deploy on Vercel

1. In Vercel, **Add New → Project**, import this GitHub repo. Framework: Next.js (detected automatically). Don't deploy yet.
2. Open the project's **Storage** tab → **Create Database** → **Neon (Postgres)** → connect it to this project. Vercel adds `DATABASE_URL` for you.
3. In **Settings → Environment Variables**, add:
   - `APP_SECRET`: a long random string (for example the output of `openssl rand -hex 32`). Don't change it later, or existing OTPs stop working.
   - `KITCHEN_PASSWORD`: the password your chef will use.
4. **Deploy**. The database table is created automatically on the first order.
5. Optional: under **Settings → Domains**, add `makemymeal.com` once you own the domain, and follow Vercel's DNS steps.

## Turning on SMS later

SMS to Indian numbers needs DLT registration. When your MSG91 template is approved (with variables `##otp##` and `##order##`), add `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` in Vercel and redeploy. Until then the OTP is shown in the app only.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, APP_SECRET, KITCHEN_PASSWORD
npm run dev
```

## Changing prices, delivery charge or nutrition

Edit `lib/menu.js`. The server always recomputes totals, so the browser can't change prices.
