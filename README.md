
## File Structure
```plaintext
tea-inventory-dashboard/
│
├── app/                        # Next.js application routes and pages
│   ├── (auth)/                 # Authentication-related routes
│   ├── (dashboard)/            # Main dashboard routes
│   ├── api/                    # API route handlers
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   ├── not-found.tsx           # 404 page
│   └── page.tsx                # Root/landing page
│
├── components/                 # Reusable React components
│   ├── auth/                   # Authentication components
│   ├── compliance/             # Compliance-related components
│   ├── dashboard/              # Dashboard-specific components
│   ├── inventory/              # Inventory management components
│   ├── layout/                 # Layout-related components
│   ├── products/               # Product-related components
│   ├── reports/                # Reporting components
│   ├── sales/                  # Sales-related components
│   ├── settings/               # Settings-related components
│   └── ui/                     # Base UI components
│
├── contexts/                   # React context providers
│   ├── sidebar-context.tsx
│   └── theme-context.tsx
│
├── lib/                        # Utility and type definitions
│   ├── supabase/               # Supabase client configurations
│   ├── types/                  # TypeScript type definitions
│   └── utils.ts                # Utility functions
│
├── public/                     # Static assets
│
└── README.md                   # Project documentation
```
