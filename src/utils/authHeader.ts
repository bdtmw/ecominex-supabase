// Returns the stored JWT (client-side only). The API lives on a different
// origin, so the httpOnly cookie may be blocked as a third-party cookie;
// sending the token as a Bearer header keeps requests authenticated.
export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("token");
  } catch {
    return null;
  }
};
