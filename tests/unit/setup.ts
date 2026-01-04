import "@testing-library/jest-dom";
// Provide a default API base URL for hooks expecting it
(globalThis as any).__APP_API_BASE_URL__ = "http://localhost:3000";
(globalThis as any).process = {
  env: { VITE_API_BASE_URL: "http://localhost:3000" },
};
