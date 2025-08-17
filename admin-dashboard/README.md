# Prospector Admin Dashboard

This is a separate admin dashboard for managing your Prospector application. It provides a clean, dedicated interface for administrative tasks without cluttering your main user-facing application.

## Setup Instructions

1. **Create a New Lovable Project**
   - Go to Lovable and create a new project
   - Name it something like "Prospector Admin Dashboard"

2. **Copy the Files**
   - Copy all files from this `admin-dashboard` folder to your new project
   - Make sure to maintain the same directory structure

3. **Configure Supabase Connection**
   - Update `src/integrations/supabase/client.ts` with your existing Supabase credentials:
     ```typescript
     const SUPABASE_URL = "https://akcxkwbqeehxvwhmrqbb.supabase.co";
     const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY3hrd2JxZWVoeHZ3aG1ycWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNTgzMTMsImV4cCI6MjA2OTkzNDMxM30.ix6oVIa0vyWg1R_IoUZyEiadZTvCDa6GitEIqRLoIYk";
     ```

4. **Install Required Dependencies**
   - The admin dashboard uses the same dependencies as your main app
   - Make sure all shadcn/ui components are installed
   - Add any missing dependencies using Lovable's package manager

5. **Copy Required Components and Hooks**
   - Copy these files from your main project:
     - `src/contexts/AuthContext.tsx`
     - `src/hooks/useIsAdmin.ts`
     - `src/components/ProtectedRoute.tsx`
     - `src/integrations/supabase/types.ts`
     - `src/lib/utils.ts`
     - All UI components from `src/components/ui/`

6. **Configure Routes and Navigation**
   - The admin dashboard is already set up with proper routing
   - Only users with admin roles can access the dashboard
   - The login page will check for admin permissions

## Features

- **Dashboard**: Overview statistics and metrics
- **Users**: Manage all user accounts, edit profiles, credits, subscriptions
- **Credits**: Add/remove credits, view transaction history
- **Analytics**: Detailed insights with charts and graphs
- **Settings**: System-wide configuration options

## Security

- Only users with admin roles in the `user_roles` table can access
- Separate deployment from your main application
- Uses the same authentication system but with additional admin checks

## Benefits

- **Clean Separation**: Admin functionality is completely separate from user-facing app
- **Enhanced Security**: Admin features aren't exposed in the public application
- **Better UX**: Dedicated admin interface with powerful tools
- **Independent Deployment**: Can be updated independently from main app

## Access

Once deployed, only users with admin roles can access this dashboard. Make sure you have at least one admin user in your database before deploying.

To grant admin access to a user, run this SQL in your Supabase dashboard:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'your-admin-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```