import { loginAction, logoutAction, registerAction } from '@/actions/auth';

function authError(message: string) {
  return {
    error: {
      message,
    },
  };
}

export const authClient = {
  signIn: {
    email: async ({ email, password, rememberMe }: { email: string; password: string; rememberMe?: boolean }) => {
      try {
        const response = await loginAction({ email, password, rememberMe });

        if (!response.success) {
          return authError(response.error);
        }

        return { data: response.data, error: null };
      } catch (error) {
        return authError(error instanceof Error ? error.message : 'An error occurred.');
      }
    },
  },
  signUp: {
    email: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      try {
        const response = await registerAction({ email, password, name });

        if (!response.success) {
          return authError(response.error);
        }

        return { data: response.data, error: null };
      } catch (error) {
        return authError(error instanceof Error ? error.message : 'An error occurred.');
      }
    },
  },
  signOut: async () => {
    try {
      const response = await logoutAction();

      if (!response.success) {
        return authError(response.error);
      }

      return { error: null };
    } catch (error) {
      return authError(error instanceof Error ? error.message : 'An error occurred.');
    }
  },
};
