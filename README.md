# Replit.md

## Overview

This is a full-stack web application for managing a real-time Telegram bot. The system provides an admin dashboard to view bot user statistics, manage welcome messages, and track user engagement metrics in real-time. Built with a modern React frontend and Express.js backend, it features simple username/password authentication and uses PostgreSQL for data persistence. The Telegram bot is fully integrated with webhook support for instant message processing.

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
  - `users` - Admin user authentication data with password hashing
  - `sessions` - Session storage for authentication
  - `botUsers` - Telegram bot user data with metrics and activity tracking
  - `welcomeMessages` - Customizable welcome message configuration

### Authentication & Authorization
- **Simple Authentication**: Username/password login system
- **Session Security**: HTTP-only cookies with secure flags  
- **Protected Routes**: Middleware-based route protection
- **Admin Account**: Single admin user with database credentials

### Telegram Bot Integration
- **Real-time Processing**: Webhook-based message handling
- **User Registration**: Automatic user tracking when they start the bot
- **Welcome Messages**: Customizable welcome message management
- **Command Support**: /start, /help, /stats commands
- **Activity Tracking**: Message count and last activity monitoring

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
