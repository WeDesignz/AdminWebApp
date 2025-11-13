# WeDesignz Admin Panel

A sophisticated Next.js admin panel for managing the WeDesignz platform with role-based access control, real-time updates, and comprehensive analytics.

## Features

### Core Functionality
- **Role-Based Access Control**: Super Admin and Moderator roles with permission-gated features
- **2FA Authentication**: Secure login with Two-Factor Authentication support
- **Real-time Updates**: WebSocket integration for live notifications and updates
- **Comprehensive Dashboard**: KPI cards, charts, and quick actions
- **Designer Management**: Onboarding workflow, payout processing, and account management
- **Customer Management**: User profiles, subscription management, and purchase history
- **Design Moderation**: Approve/reject designs, manage featured/trending content
- **Transaction Management**: View all transactions with refund capabilities
- **Custom Orders**: Live queue with SLA tracking and deliverable management
- **Subscription Plans**: CRUD operations for pricing and plan features
- **Reports & Analytics**: Generate and export business reports
- **System Configuration**: Platform settings and maintenance mode
- **Activity Log**: Complete audit trail of admin actions
- **Notifications**: Real-time alerts with priority levels

### UI/UX Features
- **Modern Design**: Glassy cards, smooth animations, and elegant aesthetics
- **Dark/Light Mode**: Full theme support with CSS variables
- **Responsive**: Fully mobile-responsive with adaptive layouts
- **Accessible**: Built with Headless UI for keyboard navigation and screen readers
- **Micro-interactions**: Hover effects, transitions, and framer-motion animations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query + SWR
- **Charts**: Recharts
- **Icons**: Heroicons + Lucide React
- **UI Components**: Headless UI
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites
- Node.js 20 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file based on `.env.example`:
```bash
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
SENTRY_DSN=
```

### Running the Application

**Development:**
```bash
npm run dev
```
The app will be available at `http://localhost:5000`

**Production Build:**
```bash
npm run build
npm start
```

**Linting & Formatting:**
```bash
npm run lint
npm run format
```

## Demo Credentials

For testing the application with mock data:

- **Email**: `admin@wedesignz.com`
- **Password**: `admin123`
- **2FA Code**: `123456`

## Project Structure

```
.
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Dashboard page
│   ├── designers/          # Designer management
│   ├── customers/          # Customer management
│   ├── designs/            # Design moderation
│   ├── orders/custom/      # Custom orders
│   ├── transactions/       # Transaction management
│   ├── plans/              # Subscription plans
│   ├── reports/            # Reports
│   ├── analytics/          # Analytics
│   ├── notifications/      # Notifications
│   ├── system/configs/     # System configuration
│   ├── activity-log/       # Activity log
│   ├── settings/           # Settings
│   └── login/              # Authentication
├── components/             # React components
│   ├── common/             # Reusable components
│   └── layout/             # Layout components
├── lib/                    # Utility libraries
│   ├── api/                # API client and mock data
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Utility functions
├── store/                  # Zustand state management
├── types/                  # TypeScript type definitions
└── public/                 # Static assets
```

## API Integration

The application uses a mock API by default for development. To integrate with a real backend:

1. Update `NEXT_PUBLIC_API_BASE` in your `.env.local` file
2. Update `NEXT_PUBLIC_WS_URL` for WebSocket connections
3. The API client in `lib/api/client.ts` will automatically use the real endpoints

### API Endpoints

The application expects the following endpoints:

**Authentication:**
- `POST /api/admin/login` - Login with email/password
- `POST /api/admin/2fa/verify` - Verify 2FA code
- `POST /api/admin/auth/refresh` - Refresh access token
- `POST /api/admin/logout` - Logout

**Designers:**
- `GET /api/admin/designers` - List designers
- `GET /api/admin/designers/:id` - Get designer details
- `POST /api/admin/designers/:id/approve` - Approve/reject designer
- `POST /api/admin/designers/:id/payout` - Process payout

**Custom Orders:**
- `GET /api/admin/custom-orders` - List custom orders
- `POST /api/admin/custom-orders/:id/status` - Update order status

**Transactions:**
- `GET /api/admin/transactions` - List transactions
- `POST /api/admin/transactions/:id/refund` - Process refund

**Reports:**
- `POST /api/admin/reports/generate` - Generate report

**System:**
- `GET /api/admin/configs` - Get system configuration
- `PUT /api/admin/configs` - Update system configuration

**Notifications:**
- `GET /api/admin/notifications` - List notifications
- `POST /api/admin/notifications` - Create notification

All API requests include `Authorization: Bearer <access_token>` header.

## Theme Customization

The application uses CSS variables for theming. Update `app/globals.css` to customize colors:

```css
:root {
  --primary: #6C5CE7;        /* Primary color */
  --accent: #00BFA6;         /* Accent color */
  --muted: #6B7280;          /* Muted text */
  --bg: #F9FAFB;             /* Background */
  --card-bg: rgba(255, 255, 255, 0.95); /* Card background */
}
```

## Replit Configuration

The application is configured to run on Replit:

1. The dev server runs on port 5000 (required for Replit)
2. All necessary configuration files are included
3. Environment variables can be set using Replit Secrets

### Required Replit Secrets

Add these in the Replit Secrets tab:
- `NEXT_PUBLIC_API_BASE` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL
- `NEXTAUTH_SECRET` - JWT secret key

## Security Notes

- Never commit API keys or secrets to version control
- Always use environment variables for sensitive data
- The frontend only displays UI - all payment operations must be handled server-side
- Super Admin actions are gated in the UI and should be re-validated by the backend
- Access tokens are automatically refreshed when expired
- 2FA is required for all admin accounts

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

This is a proprietary admin panel for WeDesignz. Contact the development team for contribution guidelines.

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the WeDesignz development team.
