import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockGoogleAuthProvider = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: mockGoogleAuthProvider,
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("useFirebaseAuth — Firebase configured", () => {
  beforeEach(() => {
    vi.doMock("../firebase", () => ({
      auth: { name: "mock-auth" },
      isFirebaseConfigured: true,
    }));
  });

  it("subscribes to auth state changes and exposes the resolved user", async () => {
    let authCallback: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      authCallback = callback;
      return vi.fn();
    });

    const { useFirebaseAuth } = await import("../useFirebaseAuth");
    const { result } = renderHook(() => useFirebaseAuth());

    expect(result.current.configured).toBe(true);
    expect(result.current.loading).toBe(true);
    expect(mockOnAuthStateChanged).toHaveBeenCalledWith(
      { name: "mock-auth" },
      expect.any(Function),
    );

    const fakeUser = { uid: "user-1", email: "coach@example.com" };
    act(() => authCallback?.(fakeUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(fakeUser);
    });
  });

  it("signs in with Google through a popup against the configured auth instance", async () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    mockSignInWithPopup.mockResolvedValue(undefined);

    const { useFirebaseAuth } = await import("../useFirebaseAuth");
    const { result } = renderHook(() => useFirebaseAuth());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockGoogleAuthProvider).toHaveBeenCalled();
    expect(mockSignInWithPopup).toHaveBeenCalledWith(
      { name: "mock-auth" },
      expect.any(Object),
    );
  });

  it("signs out through the configured auth instance", async () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    mockSignOut.mockResolvedValue(undefined);

    const { useFirebaseAuth } = await import("../useFirebaseAuth");
    const { result } = renderHook(() => useFirebaseAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledWith({ name: "mock-auth" });
  });
});

describe("useFirebaseAuth — Firebase not configured", () => {
  beforeEach(() => {
    vi.doMock("../firebase", () => ({
      auth: null,
      isFirebaseConfigured: false,
    }));
  });

  it("reports an unconfigured, not-loading state without subscribing to auth changes", async () => {
    const { useFirebaseAuth } = await import("../useFirebaseAuth");
    const { result } = renderHook(() => useFirebaseAuth());

    expect(result.current.configured).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
  });

  it("rejects sign-in and sign-out attempts with an explicit error", async () => {
    const { useFirebaseAuth } = await import("../useFirebaseAuth");
    const { result } = renderHook(() => useFirebaseAuth());

    await expect(result.current.signInWithGoogle()).rejects.toThrow(
      "Firebase non configuré",
    );
    await expect(result.current.signOut()).rejects.toThrow(
      "Firebase non configuré",
    );
    expect(mockSignInWithPopup).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
