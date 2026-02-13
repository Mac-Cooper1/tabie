# Tabie Web - Bill Splitting Made Simple

A mobile-first web app for splitting bills with friends. Scan receipts with AI, assign items with a tap, and track payments in real-time.

## Features

- **AI Receipt Scanning** - Upload a photo, get items extracted via Mindee V2 OCR
- **Item Assignment** - Tap items to claim them; split single items fractionally (1/2, 1/3, etc.) or with everyone
- **Guest Join Flow** - Share a link, guests select their name and claim items from their phone
- **Smart Splitting** - Auto-calculate tax & tip (equal or proportional to items)
- **Admin Dashboard** - Track who's paid, mark payments, close tabs
- **Payment Deep Links** - Venmo, Cash App, and PayPal integration
- **Real-time Sync** - Firestore-powered live updates across all participants
- **Dark UI** - Designed for mobile, works everywhere
- **No Download** - Progressive web app, just open in a browser

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template and fill in your keys
cp .env.example .env

# Start development server
npm run dev
```

Open http://localhost:5173 on your phone or in Chrome DevTools mobile view.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase project API key |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_MINDEE_API_KEY` | No | Mindee OCR API key (uses mock data without it) |
| `VITE_MINDEE_MODEL_ID` | No | Mindee custom model ID |

Firebase config is required for auth and real-time data. Mindee is optional - the app falls back to mock receipt data if not configured.

## Mindee OCR Setup

1. Sign up at [app.mindee.com](https://app.mindee.com)
2. Get your API key and model ID from the dashboard
3. Add both to your `.env` file:
   ```
   VITE_MINDEE_API_KEY=your_key_here
   VITE_MINDEE_MODEL_ID=your_model_id_here
   ```

The app uses Mindee's V2 API with async processing (enqueue, poll, fetch results). Auth is the raw API key in the Authorization header (no "Token" prefix).

## Project Structure

```
tabie-web/
  src/
    pages/
      Landing.jsx           # Hero landing page
      Auth.jsx              # Login/signup
      Home.jsx              # Tab list with status tracking
      NewTab.jsx            # Scan or manual entry
      ScanBill.jsx          # Camera/upload receipt
      EditBill.jsx          # Review scanned items
      InvitePeople.jsx      # Add people, set tax/tip, publish tab
      GuestItemSelection.jsx # Main tab view (admin + guest)
      JoinTab.jsx           # Guest name selection (claim identity)
      Checkout.jsx          # Admin payment summary
      GuestCheckout.jsx     # Guest payment flow
      Settings.jsx          # Payment accounts setup
    hooks/
      useTab.js             # Firestore tab subscription + item operations
      useParticipantId.js   # Participant identity resolution (admin auto-recognition)
    stores/
      authStore.js          # Auth state (Zustand)
      billStore.js          # Local bill/tab state (Zustand)
    services/
      ocr.js                # Mindee V2 API integration
      firestore.js          # Firestore CRUD operations
    App.jsx                 # Routes
    main.jsx                # Entry point
    index.css               # Tailwind + custom styles
```

## Tech Stack

- **React 18** + Vite
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Firebase** (Auth + Firestore) for backend
- **Mindee V2** for receipt OCR
- **Lucide React** for icons

## How It Works

1. **Admin creates a tab** - Scans a receipt or enters items manually
2. **Admin adds people** - Types names of everyone at the table
3. **Admin sets tax/tip** - Choose percentage or custom amount, equal or proportional split
4. **Admin publishes** - Generates a shareable link
5. **Guests join** - Open the link, select their name from the list
6. **Everyone claims items** - Tap items you had, split items fractionally if shared
7. **Guests pay** - Deep links to Venmo/Cash App/PayPal with pre-filled amounts
8. **Admin tracks payments** - Mark people as paid, close the tab when done

## Tab Status Lifecycle

Tabs progress through these statuses visible on the Home screen:

- **Draft** - Tab created but not yet published
- **Waiting for claims** - Published, no items assigned yet
- **X/Y claimed** - Some items have been claimed by guests
- **Fully assigned** - All items assigned to people
- **X/Y paid** - Some payments confirmed
- **Settled** - All payments confirmed or tab closed

## Development

```bash
# Dev server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

**OCR not working**
- Verify both `VITE_MINDEE_API_KEY` and `VITE_MINDEE_MODEL_ID` are set in `.env`
- Restart the dev server after changing `.env` values
- Check browser localStorage for a stale `mindee_api_key` that may override the env var
- The app uses mock data automatically if OCR fails

**Admin redirected to join page**
- The `useParticipantId` hook auto-recognizes admins by matching `user.id` to `tab.createdBy`
- If this fails, clear localStorage for `tabie_participant_{tabId}` and reload

**Negative or wrong totals**
- Tax/tip proportions are capped at 1.0 to prevent overcharge from rounding
- "Everyone" split divides by number of people (1/n each), not full price per person

**Styling looks off**
- This is a mobile-first app - view in mobile viewport (430px wide)
- Use Chrome DevTools device toolbar or open on your phone

## License

MIT
