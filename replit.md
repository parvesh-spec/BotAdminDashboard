# Replit.md

## Overview

This is a full-stack web application for managing a Telegram bot's users. The system provides an admin dashboard to view bot user statistics, search and filter users, and track user engagement metrics. Built with a modern React frontend and Express.js backend, it features secure authentication through Replit's OAuth system and uses PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Authentication**: Replit OAuth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL session store
- **Database ORM**: Drizzle ORM with type-safe schema definitions

### Data Storage
- **Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**:
  - `users` - Admin user authentication data
  - `sessions` - Session storage for authentication
  - `botUsers` - Telegram bot user data with metrics

### Authentication & Authorization
- **OAuth Provider**: Replit's OpenID Connect service
- **Session Security**: HTTP-only cookies with secure flags
- **Protected Routes**: Middleware-based route protection
- **User Management**: Automatic user creation on first login

### Key Design Patterns
- **Monorepo Structure**: Shared schema definitions between client and server
- **Type Safety**: End-to-end TypeScript with shared types
- **Component Composition**: Reusable UI components with consistent design system
- **Query Optimization**: Cached server state with automatic invalidation
- **Error Handling**: Centralized error handling with user-friendly messages

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL hosting for data persistence
- **Replit Authentication**: OAuth service for secure user authentication

### Development Tools
- **Drizzle**: Database ORM and migration management
- **Vite**: Frontend build tool and development server
- **ESBuild**: Backend bundling for production deployment

### UI Framework
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

### State Management
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management with validation

### Runtime Dependencies
- **Express**: Web server framework
- **Passport**: Authentication middleware
- **WebSocket**: Real-time communication support (ws package)