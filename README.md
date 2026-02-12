# 🧾 Tabie Web - Bill Splitting Made Beautiful

A stunning, mobile-first web app for splitting bills with friends. Scan receipts with AI, assign items with a tap, and send payment requests via SMS.

![Tabie Preview](https://via.placeholder.com/800x400/0a0a0a/00ff88?text=Tabie+Web+App)

## ✨ Features

- **📸 AI Receipt Scanning** - Upload a photo, get items extracted automatically
- **👥 Easy Assignment** - Tap items to assign them to people
- **💬 SMS Invites** - Send payment requests directly via text
- **📊 Smart Splitting** - Auto-calculate tax & tip (equal or proportional)
- **🌙 Gorgeous Dark UI** - Designed for mobile, works everywhere
- **⚡ No Download** - Just open in a browser

## 🚀 Quick Start

```bash
# Clone/extract the project
cd tabie-web

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000 on your phone or in Chrome DevTools mobile view
```

## 📱 Best Experience

This app is designed for mobile. For the best experience:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar

Or just open on your actual phone!

## 🔑 Mindee OCR Setup (Optional)

The app works without an API key (uses mock data). To enable real receipt scanning:

1. Sign up at [app.mindee.com](https://app.mindee.com)
2. Get your API key from the dashboard
3. Either:
   - Create `.env` file: `VITE_MINDEE_API_KEY=your_key`
   - Or enter it in the app's sign-in screen

**Model ID**: `c257d369-14b9-4483-b4c1-24fbee240c83` (Receipt model)

### Mindee V2 API Notes

The app uses Mindee's new V2 API:
- **Endpoint**: `https://api-v2.mindee.net/v2/inferences/enqueue`
- **Auth**: Just the API key (no "Token" or "Bearer" prefix)
- **Flow**: Async - POST to enqueue, then poll for results

## 📁 Project Structure

```
tabie-web/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx     # Hero landing page
│   │   ├── Auth.jsx        # Login/signup (testing mode)
│   │   ├── Home.jsx        # Tab list + camera button
│   │   ├── NewTab.jsx      # Scan or manual entry
│   │   ├── ScanBill.jsx    # Camera/upload receipt
│   │   ├── EditBill.jsx    # Items + people + assignments
│   │   ├── InvitePeople.jsx # SMS invites
│   │   ├── TabView.jsx     # Tab dashboard
│   │   └── Checkout.jsx    # Payment tracking
│   ├── stores/
│   │   ├── authStore.js    # Auth state (Zustand)
│   │   └── billStore.js    # Bills/tabs state (Zustand)
│   ├── services/
│   │   └── ocr.js          # Mindee V2 API integration
│   ├── App.jsx             # Routes
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind + custom styles
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🎨 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool (fast!)
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Lucide React** - Icons
- **Mindee V2** - Receipt OCR

## 🛠 Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📲 SMS Integration

The app opens the native SMS app with a pre-filled message. For programmatic SMS (Twilio):

1. Set up a Twilio account
2. Add environment variables (see `.env.example`)
3. Create a backend API to send SMS (not included - requires server)

Current implementation uses `sms:` URL scheme which works on mobile devices.

## ✅ Recently Added

- [x] Venmo, Cash App, and PayPal payment deep links
- [x] Shareable tab links for guests
- [x] Real-time Firestore sync
- [x] HEIC image support (iPhone photos)

## 🔮 Coming Soon

- [ ] Receipt history & analytics
- [ ] Group/friend management
- [ ] Push notifications
- [ ] Payment confirmation tracking

## 🐛 Troubleshooting

### OCR not working
- Check your Mindee API key is correct
- Make sure you're using a V2 key from app.mindee.com (not platform.mindee.com)
- The app will use mock data automatically if OCR fails

### SMS not opening
- SMS links only work on actual mobile devices
- Use the "Copy" button as an alternative

### Styling looks off
- Make sure you're viewing in mobile viewport
- Clear browser cache if styles seem broken

## 📄 License

MIT - Feel free to use and modify!

---

Built with ❤️ and lots of ☕
Last updated: unknown
