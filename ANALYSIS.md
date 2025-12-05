# Universify Project Analysis

## Executive Summary

The **Universify** project consists of **two separate frontend applications** for an event discovery and calendar management platform:

1. **Universify** - A React Native (Expo) cross-platform mobile/web app
2. **Universify-CalFrontend** - A React (Vite) web-only calendar application

Both applications serve similar purposes but use different technology stacks and have distinct implementations.

---

## 1. Universify (React Native/Expo App)

### Overview
A comprehensive cross-platform event aggregation and discovery application built with React Native (Expo) for iOS, Android, and Web. This is the main mobile-first application.

### Technology Stack
- **Framework**: React Native with Expo (~54.0.20)
- **Navigation**: Expo Router (~6.0.13)
- **Language**: TypeScript
- **State Management**: React Context API
- **Animations**: React Native Reanimated (~4.1.1)
- **Package Manager**: pnpm (monorepo structure)
- **Storage**: LocalStorage (web) / AsyncStorage pattern

### Project Structure
```
Universify/
├── apps/
│   └── client/                    # Main Expo application
│       ├── app/                   # Expo Router screens
│       │   ├── (auth)/            # Authentication screens
│       │   ├── (tabs)/            # Main app tabs (calendar, find, create, profile)
│       │   └── settings/          # Settings screens
│       ├── components/            # Reusable components
│       │   ├── calendar/          # Calendar components
│       │   ├── events/            # Event components
│       │   ├── layout/            # Layout components
│       │   └── ui/                # Base UI components
│       ├── contexts/              # React Context providers
│       ├── hooks/                 # Custom React hooks
│       ├── utils/                 # Utility functions
│       ├── types/                 # TypeScript type definitions
│       └── data/                  # Mock data (JSON files)
├── package.json                   # Root package.json (pnpm workspace)
└── pnpm-workspace.yaml            # pnpm workspace configuration
```

### Key Features

#### ✅ Implemented Features

1. **Authentication System**
   - Login/Signup with .edu email validation
   - Password strength indicators
   - Protected routes
   - Demo accounts for testing

2. **Calendar System**
   - Google Calendar-style weekly/daily view
   - Full 24-hour view (12 AM - 11 PM)
   - Auto-scrolls to 7 AM on mount
   - Drag-to-create events functionality
   - Event blocks sized by duration
   - Time navigation (previous/next/today)
   - Resizable recommendations sidebar (desktop)

3. **Event Discovery**
   - Search with 3 modes: Names Only, All Fields, Semantic
   - Grid view (3 columns desktop) / List view toggle
   - Quick filter pills for categories
   - Advanced filter drawer
   - "My Events" filter
   - Event cards with RSVP counts and capacity
   - Animated detail sidebar

4. **Event Creation**
   - Comprehensive form with all fields
   - Multi-category selection
   - Color picker for calendar display
   - RSVP settings (enabled/disabled, public/private attendees)
   - Club vs Social event toggle
   - Capacity limits
   - Real-time validation

5. **Recommendations Feed**
   - Personalized based on user interests
   - Random selection from upcoming events
   - Filter integration
   - "Why recommended" tags

6. **Profile & Settings**
   - User profile with stats
   - Account settings
   - Preferences (home page, calendar days, category interests)
   - Appearance (theme, font size, accessibility)

7. **Responsive Design**
   - Mobile-first approach
   - Desktop navigation bar (top horizontal)
   - Mobile bottom tabs
   - Breakpoints: <768px (mobile), 768-1024px (tablet), >1024px (desktop)

8. **Animations**
   - Landing page with multiple animation types
   - Event cards with entrance and interaction animations
   - Smooth transitions throughout
   - Uses React Native Animated API with native driver

### Data Models

#### Event Type
```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  location: string;
  categories: EventCategory[];
  organizer: { id: string; name: string; type: 'club' | 'individual' };
  color: string; // Hex color
  rsvpEnabled: boolean;
  rsvpCounts: { going: number; maybe: number; notGoing: number };
  attendees: Attendee[];
  attendeeVisibility: 'public' | 'private';
  isClubEvent: boolean;
  isSocialEvent: boolean;
  capacity?: number;
  recurring?: RecurringPattern;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}
```

#### Event Categories
- Career, Food, Fun, Afternoon, Events, Academic, Networking, Social, Sports, Arts, Tech, Wellness

### State Management

Uses React Context API with four main contexts:
1. **AuthContext** - User authentication state
2. **EventsContext** - Event CRUD operations, RSVP management
3. **SettingsContext** - User preferences and settings
4. **FilterContext** - Event filtering state

### Data Storage
- Currently uses LocalStorage (web) for persistence
- Mock data includes 40+ diverse events
- Sample events for current week (Nov 17-22, 2025)
- Ready for backend integration (Supabase/AWS)

### Demo Accounts
1. `demo@cmu.edu` / `Demo123!`
2. `student@andrew.cmu.edu` / `Student123!`
3. `test@stanford.edu` / `Test123!`

---

## 2. Universify-CalFrontend (React/Vite Web App)

### Overview
A React-based web calendar application built with Vite, TypeScript, and shadcn-ui. This appears to be a separate web-focused implementation.

### Technology Stack
- **Framework**: React 18.3.1
- **Build Tool**: Vite 5.4.19
- **Language**: TypeScript
- **UI Library**: shadcn-ui (Radix UI components)
- **Styling**: Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router DOM 6.30.1
- **Date Handling**: date-fns 3.6.0
- **Package Manager**: npm/bun

### Project Structure
```
Universify-CalFrontend/
├── src/
│   ├── components/
│   │   ├── CalendarHeader.tsx
│   │   ├── EventCard.tsx
│   │   ├── EventDisplayCard.tsx
│   │   ├── WeekView.tsx
│   │   └── ui/                    # 49 shadcn-ui components
│   ├── hooks/
│   │   ├── useEvents.ts
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── events.ts
│   │   ├── scheduledEvents.ts     # LocalStorage-based scheduling
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Index.tsx              # Main calendar page
│   │   └── NotFound.tsx
│   ├── types/
│   │   └── calendar.ts
│   └── App.tsx
├── public/
└── package.json
```

### Key Features

1. **Week View Calendar**
   - Displays 7-day week view
   - Shows events scheduled for the current week
   - Navigation: Previous week, Next week, Today

2. **Event Scheduling System**
   - Events can be "scheduled" to appear on calendar
   - Uses LocalStorage with week-based keys
   - Events adjust to current week (preserves day of week and time)
   - Schedule/Unschedule functionality

3. **Event Display**
   - Sidebar with all available events
   - Event cards with expand/collapse
   - Shows event details (title, time, location, categories)
   - Color-coded events

4. **Event Data Model**
   ```typescript
   interface CalendarEvent {
     id: string;
     title: string;
     startTime: Date;
     endTime: Date;
     color: string;
     location?: string;
     categories?: string[];
     image?: string;
     description?: string;
   }
   ```

### Key Differences from Universify App

1. **Simpler Architecture**: Single-page application focused on calendar view
2. **Web-Only**: No mobile app support
3. **Different State Management**: Uses React Query instead of Context API
4. **Scheduling Concept**: Events must be explicitly "scheduled" to appear on calendar
5. **No Authentication**: Appears to be a standalone calendar tool
6. **Modern Web Stack**: Uses latest React patterns, Vite, shadcn-ui

---

## 3. Comparison: Universify vs Universify-CalFrontend

| Feature | Universify (Expo) | Universify-CalFrontend (Vite) |
|---------|------------------|-------------------------------|
| **Platform** | iOS, Android, Web | Web Only |
| **Framework** | React Native + Expo | React + Vite |
| **Navigation** | Expo Router | React Router |
| **State Management** | Context API | React Query |
| **UI Components** | Custom + Material Icons | shadcn-ui (Radix UI) |
| **Styling** | React Native StyleSheet | Tailwind CSS |
| **Authentication** | ✅ Yes | ❌ No |
| **Event Creation** | ✅ Full form | ❌ No |
| **Calendar View** | ✅ Full 24-hour, drag-to-create | ✅ Week view, schedule system |
| **Event Discovery** | ✅ Search, filters, recommendations | ❌ No |
| **Profile/Settings** | ✅ Yes | ❌ No |
| **Data Storage** | LocalStorage (web) | LocalStorage |
| **Package Manager** | pnpm (monorepo) | npm/bun |

---

## 4. Architecture Analysis

### Universify (Expo App)

**Strengths:**
- ✅ Cross-platform support (iOS, Android, Web)
- ✅ Comprehensive feature set
- ✅ Well-organized code structure
- ✅ Type-safe with TypeScript
- ✅ Responsive design with mobile-first approach
- ✅ Rich animations and UX
- ✅ Ready for backend integration

**Areas for Improvement:**
- ⚠️ Currently uses mock data and LocalStorage
- ⚠️ Authentication is hardcoded (demo mode)
- ⚠️ No real backend integration yet
- ⚠️ Could benefit from state management library (Redux/Zustand) for complex state

### Universify-CalFrontend (Vite App)

**Strengths:**
- ✅ Modern web stack (Vite, React 18, TypeScript)
- ✅ Beautiful UI with shadcn-ui
- ✅ Fast development experience with Vite
- ✅ Clean, focused calendar implementation
- ✅ Good use of React Query for data fetching

**Areas for Improvement:**
- ⚠️ Limited feature set (calendar only)
- ⚠️ No authentication
- ⚠️ No event creation UI
- ⚠️ Scheduling concept might be confusing to users
- ⚠️ No mobile optimization

---

## 5. Code Quality Assessment

### Universify (Expo App)

**Code Organization**: ⭐⭐⭐⭐⭐
- Well-structured with clear separation of concerns
- Logical folder structure
- Good use of TypeScript types

**Component Reusability**: ⭐⭐⭐⭐
- Shared UI components
- Reusable hooks
- Context providers for state

**Type Safety**: ⭐⭐⭐⭐⭐
- Comprehensive TypeScript types
- Type-safe event handling
- Type-safe navigation

**Documentation**: ⭐⭐⭐⭐
- Good README
- Implementation summary document
- Code comments where needed

### Universify-CalFrontend (Vite App)

**Code Organization**: ⭐⭐⭐⭐
- Clean structure
- Good separation of concerns
- Modern React patterns

**Component Reusability**: ⭐⭐⭐⭐
- Uses shadcn-ui for consistent components
- Custom hooks for logic
- Utility functions

**Type Safety**: ⭐⭐⭐⭐
- TypeScript throughout
- Type definitions for calendar events

**Documentation**: ⭐⭐⭐
- Basic README (Lovable template)
- Could use more project-specific docs

---

## 6. Recommendations

### For Universify (Expo App)

1. **Backend Integration**
   - Integrate with Supabase or AWS for real data persistence
   - Implement proper authentication flow
   - Add API layer for event CRUD operations

2. **State Management**
   - Consider adding Zustand or Redux Toolkit for complex state
   - Keep Context API for simple global state

3. **Testing**
   - Add unit tests for utilities and hooks
   - Add integration tests for critical flows
   - Add E2E tests for key user journeys

4. **Performance**
   - Implement virtual scrolling for large event lists
   - Add image optimization
   - Implement code splitting

5. **Accessibility**
   - Add screen reader support
   - Improve keyboard navigation
   - Add ARIA labels

### For Universify-CalFrontend (Vite App)

1. **Feature Expansion**
   - Add event creation form
   - Add authentication
   - Add event discovery/search
   - Add user profile

2. **UX Improvements**
   - Clarify the "scheduling" concept or remove it
   - Add mobile-responsive design
   - Add drag-and-drop for event scheduling

3. **Backend Integration**
   - Connect to same backend as Universify app
   - Add real-time updates
   - Add user accounts

4. **Unification Consideration**
   - Consider merging features into Universify app
   - Or use as a web-specific optimized version
   - Share types and utilities between projects

---

## 7. Project Status

### Universify (Expo App)
**Status**: ✅ **Production-Ready Frontend** (needs backend)
- Frontend is complete and polished
- All major features implemented
- Ready for backend integration
- Can be deployed as-is for demo/testing

### Universify-CalFrontend (Vite App)
**Status**: ⚠️ **Prototype/Incomplete**
- Basic calendar functionality works
- Missing key features (auth, event creation)
- Appears to be a separate experiment or alternative implementation
- Could be merged into main app or developed further

---

## 8. File Statistics

### Universify (Expo App)
- **Components**: ~30+ components
- **Screens**: 8+ screens (auth, tabs, settings)
- **Contexts**: 4 context providers
- **Hooks**: 5+ custom hooks
- **Types**: 3 type definition files
- **Utils**: 3 utility modules
- **Mock Data**: 4 JSON files

### Universify-CalFrontend (Vite App)
- **Components**: ~55 components (including shadcn-ui)
- **Pages**: 2 pages
- **Hooks**: 3 custom hooks
- **Types**: 1 type definition file
- **Utils**: 3 utility modules

---

## 9. Dependencies Analysis

### Universify (Expo App)
**Key Dependencies:**
- `expo`: ~54.0.20
- `react-native`: 0.81.5
- `expo-router`: ~6.0.13
- `react-native-reanimated`: ~4.1.1
- `@expo/vector-icons`: ^15.0.3

**Total Dependencies**: ~20 production dependencies

### Universify-CalFrontend (Vite App)
**Key Dependencies:**
- `react`: ^18.3.1
- `vite`: ^5.4.19
- `@tanstack/react-query`: ^5.83.0
- `react-router-dom`: ^6.30.1
- `date-fns`: ^3.6.0
- Multiple `@radix-ui/*` packages (shadcn-ui)

**Total Dependencies**: ~60+ production dependencies (many from shadcn-ui)

---

## 10. Conclusion

The Universify project consists of two distinct frontend applications:

1. **Universify (Expo)** - A comprehensive, production-ready mobile/web app with full feature set
2. **Universify-CalFrontend (Vite)** - A focused web calendar application, appears to be experimental

**Recommendation**: 
- Focus development on the **Universify (Expo)** app as it's more complete and cross-platform
- Consider whether **Universify-CalFrontend** should be merged, kept separate, or deprecated
- Next priority should be backend integration for the Expo app
- Both apps could potentially share a common backend API

---

**Analysis Date**: 2025-01-27
**Analyzed By**: AI Code Assistant

