import PocketBase from 'pocketbase';

export const pb = new PocketBase('https://imggreff.elysrestobar.com');

if (typeof window !== 'undefined') {
  const customAuth = localStorage.getItem('pb_auth');
  if (customAuth && !pb.authStore.isValid) {
    try {
      const parsed = JSON.parse(customAuth);
      pb.authStore.save(parsed.token, parsed.model);
    } catch(e) {}
  }
  
  // Keep syncing just in case
  pb.authStore.onChange((token, model) => {
    localStorage.setItem('pb_auth', JSON.stringify({ token, model }));
  });
}
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export function getCurrentUser(): User | null {
  try {
    const auth = pb.authStore.model;
    if (auth) {
      return {
        id: auth.id as string,
        email: auth.email as string,
        name: (auth as any).name || '',
        avatar: (auth as any).avatar || ''
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

export function clearAuth() {
  pb.authStore.clear();
}