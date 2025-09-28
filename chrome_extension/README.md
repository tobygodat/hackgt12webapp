# CartWatch - Financial Twin

A production-quality React web application that visualizes the long-term impact of purchases through "financial twin" simulations and helps users understand financial tradeoffs via intelligent recommendations.

## Features

-   **Financial Twin Simulation**: Monte Carlo simulation of purchase impact over 12-24 months
-   **Real-time Balance Projections**: P10/P50/P90 confidence bands for future financial health
-   **Smart Recommendations**: AI-powered suggestions for spending cuts and substitutes
-   **Transaction Management**: Complete transaction tracking with filtering and analysis
-   **Insights Dashboard**: Visual analytics of spending patterns and financial health
-   **Dark-first Design**: Modern, accessible UI with Tailwind CSS
-   **Firebase Integration**: Secure authentication and real-time data storage
-   **Optional AI Integration**: Gemini-powered financial advice and explanations

## Tech Stack

-   **Frontend**: React 18, Vite, Tailwind CSS
-   **State Management**: Zustand
-   **Routing**: React Router v6
-   **Charts**: Recharts
-   **Authentication**: Firebase Auth
-   **Database**: Cloud Firestore
-   **Forms**: React Hook Form
-   **Date Handling**: date-fns
-   **Icons**: Lucide React
-   **AI**: Google Gemini (optional)
-   **Testing**: Jest, React Testing Library

## Quick Start

### Prerequisites

-   Node.js 18+ and npm
-   Firebase project with Firestore enabled
-   (Optional) Google AI Studio API key for Gemini integration

### Installation

1. **Clone and install dependencies**:

```bash
git clone <repository-url>
cd cartwatch
npm install
```

2. **Set up Firebase**:

    - Create a new Firebase project at https://console.firebase.google.com
    - Enable Authentication (Email/Password)
    - Enable Firestore Database
    - Copy your Firebase config

3. **Configure environment variables**:

```bash
cp .env.example .env
# Edit .env with your Firebase configuration
```

4. **Set up Firestore security rules**:

```bash
# Deploy the provided firestore.rules
firebase deploy --only firestore:rules
```

5. **Start the development server**:

```bash
npm run dev
```

6. **Optional: Seed demo data**:

```bash
# Edit scripts/seed.js with your Firebase config
node scripts/seed.js
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Required: Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your_app_id

# Optional: Gemini AI Integration
VITE_GEMINI_API_KEY=your_gemini_key
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Layout.jsx       # Main app layout with navigation
│   ├── Card.jsx         # Styled card container
│   ├── Charts/          # Chart components (Line, Pie, Bar)
│   └── ...
├── pages/               # Main application pages
│   ├── Dashboard.jsx    # Financial twin dashboard
│   ├── Transactions.jsx # Transaction management
│   ├── Insights.jsx     # Analytics and insights
│   └── Profile.jsx      # User profile and settings
├── hooks/               # Custom React hooks
│   ├── useAuth.js       # Authentication management
│   ├── useAccounts.js   # Account data management
│   ├── useTransactions.js # Transaction data
│   └── useSimulation.js # Financial simulation
├── domain/              # Core business logic
│   ├── simulateTwin.js  # Monte Carlo simulation engine
│   ├── recommend.js     # Recommendation algorithm
│   └── util.js          # Utility functions
├── lib/                 # External service integrations
│   ├── firebase.js      # Firebase configuration
│   ├── firestore.js     # Firestore helpers
│   └── gemini.js        # Gemini AI integration
├── store/               # Global state management
│   └── useAppStore.js   # Zustand store
└── theme/               # Design system
    └── colors.js        # Color palette
```

## Core Concepts

### Financial Twin Simulation

The heart of CartWatch is the Monte Carlo simulation that models how a purchase impacts your financial future:

1. **Inputs**: Purchase amount, timeline, income/expense volatility, current accounts
2. **Process**: 1000 simulation runs with randomized monthly cash flows
3. **Outputs**: P10/P50/P90 balance projections, debt impact, goal delays

### Recommendation Engine

Analyzes transaction history to suggest smart alternatives:

-   Identifies discretionary spending categories
-   Ranks by potential savings vs. lifestyle friction
-   Suggests specific cuts and substitutes

### Data Model

```javascript
// User profile
{
  displayName: "string",
  email: "string",
  currency: "USD",
  riskTolerance: "medium"
}

// Financial accounts
{
  type: "checking|savings|cc|loan",
  name: "string",
  balance: number,
  apr?: number,
  limit?: number
}

// Transactions
{
  amount: number,
  category: "string",
  merchant: "string",
  date: Timestamp,
  type: "debit|credit"
}
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint code
```

### Testing

Run the test suite:

```bash
npm test
```

Tests cover:

-   Core simulation logic (`simulateTwin`)
-   Recommendation algorithm (`rankRecommendations`)
-   UI components (Money, Charts, etc.)

### Gemini AI Integration

Two approaches for integrating Gemini:

1. **Client-side** (demo/development):

    - Add `VITE_GEMINI_API_KEY` to `.env`
    - ⚠️ **Warning**: Exposes API key to users

2. **Server-side** (production):
    - Deploy the provided `api/gemini.js` serverless function
    - Set `GEMINI_API_KEY` on your server
    - Use `analyzeWithGeminiAPI()` instead of `analyzeWithGemini()`

### Deployment

1. **Build the app**:

```bash
npm run build
```

2. **Deploy to your hosting provider**:

    - Vercel: `vercel --prod`
    - Netlify: Upload `dist/` folder
    - Firebase Hosting: `firebase deploy`

3. **Deploy Firestore rules**:

```bash
firebase deploy --only firestore:rules
```

## Security

-   Firestore rules ensure users can only access their own data
-   Client-side validation with server-side enforcement
-   Environment variables for sensitive configuration
-   No hardcoded API keys or secrets

## Browser Support

-   Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
-   ES2020+ features used
-   Responsive design for mobile/tablet/desktop

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit changes: `git commit -m "Description"`
6. Push and create a Pull Request

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ for better financial decision-making.
