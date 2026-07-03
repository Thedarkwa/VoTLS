## Goal
Restrict account creation to admins only. Regular users see just Login and Forgot Password on the auth screen.

## Changes

### 1. `src/pages/Login.tsx`
- Remove sign-up mode: delete `isSignUp` state, the signup branch in `handleAuth`, and the "Don't have an account? Sign Up" toggle at the bottom.
- Keep only the sign-in flow (`signInWithPassword`).
- Add a "Forgot password?" link below the password field that opens a small inline form (or toggles to a reset view) where the user enters their email and we call:
  ```ts
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  ```
- Show a success toast: "Password reset link sent. Check your email."

### 2. New page `src/pages/ResetPassword.tsx`
- Public route that handles the recovery link.
- Detects the `type=recovery` session (Supabase auto-processes the hash).
- Shows a "Set new password" form with password + confirm fields (plus the same show/hide eye toggle for consistency).
- Calls `supabase.auth.updateUser({ password })`, then signs out and redirects to `/login` with a success toast.

### 3. `src/App.tsx`
- Register `/reset-password` as a public route (outside any auth guard).

### 4. Admin-created accounts (how new users get in)
Since sign-up is removed from the UI, admins create users out-of-band. Options:
- **A. Manual only** — admin creates users from the backend user management screen; new user receives an invite email and sets their password via the same `/reset-password` page. No app code needed beyond the above.
- **B. In-app admin screen** — add an "Invite user" form for admins (requires a `user_roles` table with an `admin` role, an edge function using the service role to call `auth.admin.inviteUserByEmail`, and role checks).

## Question for you
Do you want option A (admins invite users from the backend dashboard — zero extra code) or option B (build an in-app admin-only "Invite user" screen — more work, needs roles + an edge function)?

## Technical notes
- `useAuth` hook is unchanged.
- Forgot-password flow uses Supabase's built-in email; no template changes required unless you want custom copy.
- `/reset-password` must be public so the recovery link works before the user is authenticated.
