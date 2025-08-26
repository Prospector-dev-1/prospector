// Authentication cleanup utilities to prevent limbo states

export const cleanupAuthState = () => {
  try {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log('Auth state cleanup completed');
  } catch (error) {
    console.error('Error during auth cleanup:', error);
  }
};

export const performSecureSignOut = async (supabase: any) => {
  try {
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('Global sign out failed, continuing:', err);
    }
    
    // Force page reload for clean state
    window.location.href = '/auth';
  } catch (error) {
    console.error('Error during secure sign out:', error);
    // Force reload anyway
    window.location.href = '/auth';
  }
};

export const performSecureSignIn = async (
  supabase: any, 
  email: string, 
  password: string
) => {
  try {
    // Clean up existing state
    cleanupAuthState();
    
    // Attempt global sign out to clear any existing sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
    }
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Sign in with email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      // Force page reload for clean state
      window.location.href = '/';
    }
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};