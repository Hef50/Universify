# Universify - Event Discovery Platform

A comprehensive cross-platform event aggregation and discovery application built with React Native (Expo) for iOS, Android, and Web.

## 🎯 Features

### ✅ Implemented (Frontend Complete)

- **Authentication System**
  - Login/Signup with .edu email validation
  - Password strength indicators with animated checkmarks
  - Secure authentication flow with protected routes
  - Demo accounts for testing

- **Calendar System**
  - Google Calendar-style weekly/daily view
  - Configurable view (1-15 days, default 7 desktop / 3 mobile)
  - Event blocks sized by duration
  - Time navigation (previous/next/today)
  - Resizable recommendations sidebar (desktop)
  - Click events to view details

- **Event Discovery**
  - Search with 3 modes: Names Only, All Fields, Semantic
  - Grid view (3 columns desktop) / List view toggle
  - Quick filter pills for categories
  - Advanced filter drawer (categories, event types, etc.)
  - Event cards with RSVP counts and capacity
  - Animated detail sidebar (right on desktop, bottom on mobile)

- **Event Creation**
  - Comprehensive form with all fields
  - Multi-category selection
  - Color picker for calendar display
  - RSVP settings (enabled/disabled, public/private attendees)
  - Club vs Social event toggle
  - Capacity limits
  - Real-time validation

- **Recommendations Feed**
  - Personalized based on user interests
  - Random selection from upcoming events
  - Filter integration
  - "Why recommended" tags
  - Refresh functionality

- **Profile & Settings**
  - User profile with stats (events created, saved, interests)
  - Account settings (name, university; sign-in managed by Google)
  - Preferences (home page, calendar days, category interests)
  - Appearance (theme, font size, accessibility)
  - Logout functionality

- **Responsive Design**
  - Mobile-first approach
  - Tablet optimization
  - Desktop layouts with sidebars
  - Breakpoints: <768px (mobile), 768-1024px (tablet), >1024px (desktop)

- **State Management**
  - Context APIs for Auth, Events, Settings, Filters
  - LocalStorage persistence (web)
  - Ready for backend integration

## 📁 Project Structure

```
apps/client/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Home/Recommendations
│   │   ├── calendar.tsx          # Calendar view
│   │   ├── find.tsx              # Find activities
│   │   ├── create.tsx            # Create event
│   │   └── profile.tsx           # User profile
│   ├── settings/                 # Settings screens
│   │   ├── account.tsx
│   │   ├── preferences.tsx
│   │   └── appearance.tsx
│   └── _layout.tsx               # Root layout with providers
├── components/
│   ├── calendar/                 # Calendar components
│   │   ├── CalendarGrid.tsx
│   │   ├── CalendarHeader.tsx
│   │   ├── EventBlock.tsx
│   │   └── TimeColumn.tsx
│   ├── events/                   # Event components
│   │   ├── EventCard.tsx
│   │   ├── EventDetailSidebar.tsx
│   │   └── CreateEventForm.tsx
│   ├── recommendations/          # Recommendation components
│   │   ├── RecommendationCard.tsx
│   │   └── RecommendationsList.tsx
│   ├── layout/                   # Layout components
│   │   ├── ResponsiveLayout.tsx
│   │   ├── ResizableSidebar.tsx
│   │   ├── FilterDrawer.tsx
│   │   └── Header.tsx
│   └── ui/                       # Base UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── CategoryPill.tsx
│       ├── SearchBar.tsx
│       ├── Modal.tsx
│       └── AnimatedDrawer.tsx
├── contexts/                     # React Context providers
│   ├── AuthContext.tsx
│   ├── EventsContext.tsx
│   ├── SettingsContext.tsx
│   └── FilterContext.tsx
├── hooks/                        # Custom React hooks
│   ├── useResponsive.ts
│   ├── useCalendar.ts
│   ├── useEventFilters.ts
│   └── useAuth.ts
├── utils/                        # Utility functions
│   ├── dateHelpers.ts
│   ├── eventHelpers.ts
│   └── validation.ts
├── types/                        # TypeScript types
│   ├── event.ts
│   ├── user.ts
│   └── settings.ts
└── data/                         # Mock data
    ├── mockEvents.json           # 40 diverse events
    ├── mockUsers.json            # 5 test accounts
    └── categories.json           # 12 event categories
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+ (this is a pnpm workspace — use pnpm, not npm)

### Installation

```bash
# From the repository root
pnpm install

# Start the development server
cd apps/client
pnpm start
```

### Running on Different Platforms

```bash
# Web
pnpm web

# iOS (requires Mac)
pnpm ios

# Android
pnpm android
```

### Useful scripts

```bash
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test:unit    # Unit tests (dedupe, recurrence, layout, recommendations)
pnpm test:e2e     # Playwright E2E suite (starts the web server itself)
pnpm build        # Static web export to dist/
pnpm seed         # Seed mock events into Supabase (needs service-role key)
```

## 🧪 Trying It Out

Authentication is Google OAuth only, restricted to `@andrew.cmu.edu` /
`@cmu.edu` accounts — there are no password logins. Without Supabase
credentials in `.env`, the app runs in offline demo mode: it loads the
bundled mock events and keeps all changes in local state.

## 🎨 Design System

### Colors

- **Primary**: `#FF6B6B` (Coral Red)
- **Secondary**: `#8B7FFF` (Purple)
- **Accent**: `#FF6BA8` (Pink)
- **Background**: `#F8F9FA` (Light Gray)
- **Text**: `#1F2937` (Dark Gray)

### Typography

- **Headers**: Bold, 24-32px
- **Body**: Regular, 14-16px
- **Small**: Regular, 12-14px

### Spacing

- Base unit: 8px
- Small: 8px, Medium: 16px, Large: 24px, XLarge: 32px

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔌 Backend Integration (Next Steps)

The frontend is designed to easily integrate with backend services:

### Supabase Integration

1. Replace Context API localStorage with Supabase client
2. Set up authentication with Supabase Auth
3. Create tables for events, users, RSVPs
4. Implement real-time subscriptions

### API Endpoints Needed

```typescript
// Authentication
POST /auth/signup
POST /auth/login
POST /auth/logout
GET /auth/me

// Events
GET /events
GET /events/:id
POST /events
PUT /events/:id
DELETE /events/:id
POST /events/:id/rsvp

// Users
GET /users/:id
PUT /users/:id
GET /users/:id/events
GET /users/:id/saved-events
```

### LLM Integration

- Instagram post scraping → LLM parsing → Event creation
- Semantic search implementation
- Event recommendation algorithm
- Natural language event queries

## 🔮 Future Enhancements

- [ ] Google Calendar sync
- [ ] Slack/Discord bot integration
- [ ] Instagram scraping with LLM parsing
- [ ] Push notifications
- [ ] Real-time updates (WebSockets)
- [ ] Social features (friends, chat)
- [ ] ML-based recommendations
- [ ] Analytics dashboard
- [ ] Event check-in QR codes
- [ ] Event photos/media
- [ ] Comments and reviews

## 🛠️ Tech Stack

- **Framework**: React Native (Expo SDK 54)
- **Router**: Expo Router v6
- **Language**: TypeScript
- **Styling**: React Native StyleSheet
- **Animations**: react-native-reanimated
- **State**: React Context API
- **Data**: JSON (mock) → Supabase (production)

## 📝 Notes

- All data is currently stored in localStorage (web) for prototype
- Mock data includes 40 diverse events across 12 categories
- Authentication is hardcoded for demo purposes
- Ready for Supabase/AWS backend integration
- LLM integration points are marked in code

## 🤝 Contributing

This is a prototype/MVP. For production deployment:

1. Set up Supabase project
2. Configure environment variables
3. Implement proper authentication
4. Add error boundaries
5. Set up analytics
6. Configure CI/CD

## 📄 License

Private project for Carnegie Mellon University

---

**Built with ❤️ for the CMU community**
