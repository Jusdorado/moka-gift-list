const ADMIN_CREDENTIALS = {
  username: process.env.NEXT_PUBLIC_ADMIN_USER || 'admin',
  password: process.env.NEXT_PUBLIC_ADMIN_PASS || 'admin',
};

export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('isAuthenticated') === 'true';
}

export function login(username: string, password: string): boolean {
  if (validateCredentials(username, password)) {
    localStorage.setItem('isAuthenticated', 'true');
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem('isAuthenticated');
}
