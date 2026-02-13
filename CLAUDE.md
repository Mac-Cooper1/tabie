# Claude Code - Tabie Web

## Build & Dev

```bash
npm run dev      # Dev server on localhost:5173
npm run build    # Production build (run after changes to verify)
```

Always run `npm run build` after making changes to confirm no errors.

## Architecture

This is a React 18 + Vite + Tailwind CSS app. State is split between:
- **Zustand stores** (`src/stores/`) - local/offline state (bill creation, auth)
- **Firestore** (`src/services/firestore.js`) - published tabs, real-time sync
- **`useTab` hook** (`src/hooks/useTab.js`) - subscribes to a Firestore tab via `onSnapshot`, provides item operations

Two user roles exist on every tab:
- **Admin** - the authenticated user who created the tab (`tab.createdBy === user.id`)
- **Guest** - anyone who opens the share link and claims a name

Identity resolution happens in `src/hooks/useParticipantId.js`. It checks localStorage first (`tabie_participant_{tabId}`), then auto-recognizes admins by matching `user.id` to `tab.createdBy`.

## Key Files

| File | Role |
|------|------|
| `src/pages/GuestItemSelection.jsx` | Main tab view for both admin and guests. Largest file (~1250 lines). Has item list, split controls, payment tracking, edit people modal, close tab. |
| `src/hooks/useTab.js` | Core data hook. `getPersonTotal()` calculates what someone owes. `familySplitItem()` splits with everyone. `setSplitShare()` sets fractional assignments. |
| `src/stores/billStore.js` | Local Zustand store for tab creation flow (before publishing to Firestore). Has its own `getPersonTotal()` copy. |
| `src/pages/JoinTab.jsx` | Guest join flow - shows list of names added by admin, guest selects who they are. |
| `src/pages/InvitePeople.jsx` | Admin setup: add people, set tax/tip, publish tab. |
| `src/services/ocr.js` | Mindee V2 OCR integration. Model ID and API key from env vars. |

## Data Model

A tab's items use an `assignments` object for fractional splits:
```js
item.assignments = { personId: quantity }  // e.g., { "abc": 0.5, "def": 0.5 }
item.assignedTo = ["abc", "def"]           // array of assigned person IDs
```

For single items, quantity is a fraction (0.5 = half). For multi-quantity items (e.g., 3x beer), it's a whole number count.

## Common Pitfalls

- **Proportion cap**: When calculating proportional tax/tip, always use `Math.min(itemsTotal / tab.subtotal, 1.0)`. Without the cap, rounding can make proportions exceed 1.0, causing overcharges. This must be applied in every file that computes proportional tax/tip: `useTab.js`, `billStore.js`, `Checkout.jsx`, `GuestCheckout.jsx`.

- **Family split math**: `familySplitItem` must assign `1 / numPeople` to each person, not `1`. Assigning `1` means each person gets the full item price.

- **Duplicate logic**: `getPersonTotal()` exists in both `useTab.js` (for Firestore tabs) and `billStore.js` (for local tabs). Changes to calculation logic must be applied to both.

- **Mobile-first**: This app is designed for 430px mobile viewports. The sticky header in `GuestItemSelection.jsx` must stay compact - large expandable sections belong in modals (bottom sheets), not inline in the header.

- **Bottom padding**: `GuestItemSelection.jsx` has a fixed bottom bar. The main container needs `pb-52` to prevent the last item from being clipped.

- **Env vars**: Vite only exposes `VITE_*` prefixed env vars to the browser. Restart the dev server after changing `.env`. localStorage values (e.g., `mindee_api_key`) can override env vars.

## After Making Changes

After any medium or large change, update `README.md` to reflect the current state of the app.
