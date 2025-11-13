# WeDesignz Admin Panel - Replit Project

## Project Overview
A comprehensive Next.js admin panel for the WeDesignz platform with role-based access control, real-time notifications, designer/customer management, and business analytics.

## Recent Changes
- **2024-11-02**: Initial project setup with complete admin panel implementation
  - Configured Next.js 14 with TypeScript and Tailwind CSS
  - Implemented authentication with 2FA support
  - Created all major admin pages (Dashboard, Designers, Customers, Designs, Orders, Transactions, Plans, Reports, Analytics, Notifications, System Configs, Activity Log, Settings)
  - Set up global state management with Zustand
  - Integrated React Query for data fetching with mock API
  - Implemented light/dark mode theming
  - Added WebSocket integration for real-time updates
  - Created reusable component library

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State Management**: Zustand (auth, notifications, UI)
- **Data Fetching**: TanStack React Query + SWR
- **Charts**: Recharts
- **UI Components**: Headless UI, custom components
- **Animations**: Framer Motion
- **Real-time**: WebSocket (with polling fallback)

### Key Features
1. **Authentication**: Email/password login with 2FA verification
2. **Role-Based Access**: Super Admin and Moderator roles
3. **Dashboard**: KPI cards, revenue charts, designer performance
4. **Designer Management**: Onboarding workflow, payout processing
5. **Design Moderation**: Approve/reject, featured/trending management
6. **Custom Orders**: Live queue with SLA tracking
7. **Transactions**: Full transaction history with refund capabilities
8. **Real-time Notifications**: WebSocket-powered alerts
9. **Activity Log**: Complete audit trail
10. **Theme Support**: Light/dark mode with CSS variables

### Directory Structure
- `/app` - Next.js pages and routes
- `/components` - Reusable React components
- `/lib` - Utilities, API client, hooks
- `/store` - Zustand state stores
- `/types` - TypeScript type definitions

## User Preferences
- Uses Inter font family
- Prefers elegant, modern UI with glassy effects
- Requires dark mode support
- Needs real-time updates for critical operations

## Development Notes

### Running the App
```bash
npm run dev
```
App runs on port 5000 (Replit requirement)

### Demo Credentials
- Email: admin@wedesignz.com
- Password: admin123
- 2FA Code: 123456

### Environment Variables
Set these in Replit Secrets:
- `NEXT_PUBLIC_API_BASE` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL
- `NEXTAUTH_SECRET` - JWT secret

### Mock API
The app uses mock data by default (`lib/api/mockAPI.ts`). To integrate with real backend:
1. Set `NEXT_PUBLIC_API_BASE` environment variable
2. The API client will automatically switch from mock to real endpoints

### Theme Customization
Colors are defined as CSS variables in `app/globals.css`. Update these to change the theme:
- `--primary`: Main brand color (indigo purple)
- `--accent`: Secondary accent (teal)
- `--bg`: Background color (changes with theme)
- `--card-bg`: Card background (glassy effect)

## Known Issues
- WebSocket connection will fallback to polling if WS URL is not available
- Some advanced analytics features are placeholders for future implementation

## Next Steps
- Integrate with actual backend API
- Add CSV export functionality
- Implement keyboard shortcuts (G for navigation, / for search)
- Add guided tour for new admins
- Expand test coverage
