# CRM 1.0 - Enterprise Scalable Architecture

A modern, enterprise-grade CRM system built with Next.js 15, TypeScript, and scalable architecture patterns.

## 🚀 **Features**

- **Modern Tech Stack**: Next.js 15.4.6, React 19, TypeScript strict mode
- **Enterprise Architecture**: Scalable, maintainable, and type-safe
- **Advanced Data Layer**: Airtable integration with robust error handling and retry logic
- **Multiple Integrations**: GitHub, Google Places API, Vercel Blob Storage
- **Security First**: Webhook signature verification, input validation, environment variable security
- **Developer Experience**: ESLint, Prettier, Vitest, comprehensive TypeScript support
- **Production Ready**: Vercel deployment optimized with performance headers

## 🏗️ **Architecture Overview**

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes with validation
│   └── (dashboard)/       # Main application pages
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   ├── features/         # Feature-specific components
│   └── forms/            # Form components
├── lib/                  # Business logic and utilities
│   ├── airtable/        # Airtable abstraction layer
│   ├── github/          # GitHub integration
│   ├── google/          # Google Places API
│   ├── vercel/          # Vercel Blob storage
│   └── validations/     # Zod validation schemas
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── constants/           # Application constants
└── utils/               # Utility functions
```

## 🛠️ **Quick Start**

### Prerequisites

- Node.js 18+ and npm
- Environment variables (see `.env.example`)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual API keys
   ```

3. **Development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** to [http://localhost:3000](http://localhost:3000)

## 📋 **Environment Variables**

Required environment variables (see `.env.example`):

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here

# GitHub Integration
GITHUB_TOKEN=your_github_token_here
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Vercel Blob Storage
VERCEL_BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

## 🧪 **Testing**

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔧 **Development Scripts**

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run type-check       # Check TypeScript types
npm run validate         # Run all checks (type, lint, test)
```

## 📦 **Deployment**

### Vercel (Recommended)

1. **Connect repository** to Vercel
2. **Configure environment variables** in Vercel dashboard
3. **Deploy**:
   ```bash
   npm run deploy          # Production deployment
   npm run deploy:preview  # Preview deployment
   ```

## 🏛️ **Key Architecture Decisions**

### 1. **Data Layer**
- **Airtable Client**: Enterprise-grade with rate limiting, retry logic, and error handling
- **Type Safety**: End-to-end TypeScript with auto-generated schemas
- **Validation**: Zod schemas for runtime type checking

### 2. **Security**
- **Environment Variables**: Type-safe validation with Zod
- **Webhook Security**: Signature verification with timing-safe comparison
- **Input Validation**: All user inputs validated with Zod schemas

### 3. **Developer Experience**
- **TypeScript Strict**: Maximum type safety
- **ESLint + Prettier**: Code consistency
- **Testing**: Vitest with React Testing Library

---

**Built with ❤️ using modern web technologies and enterprise architecture patterns.**
