const KEY = "admin_password";

export function getStoredPassword(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(KEY) ?? "";
}

export function storePassword(password: string): void {
  sessionStorage.setItem(KEY, password);
}
