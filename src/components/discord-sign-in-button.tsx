"use client";

import { FormEvent, useEffect, useState } from "react";

export function DiscordSignInButton() {
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCsrfToken() {
      try {
        const response = await fetch("/api/auth/csrf", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to initialize Discord sign-in");
        }

        const data = (await response.json()) as { csrfToken?: string };

        if (!data.csrfToken) {
          throw new Error("Discord sign-in security token was not returned");
        }

        if (!cancelled) {
          setCsrfToken(data.csrfToken);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Unable to initialize Discord sign-in. Please refresh and try again.");
        }
      }
    }

    void loadCsrfToken();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!csrfToken) {
      event.preventDefault();
      setError("Discord sign-in is still initializing. Please try again.");
    }
  }

  return (
    <form
      action="/api/auth/signin/discord"
      method="POST"
      onSubmit={handleSubmit}
      className="mt-7"
    >
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/" />

      <button
        type="submit"
        disabled={!csrfToken}
        className="discord-btn disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.211.375-.444.87-.608 1.262a18.27 18.27 0 0 0-5.487 0A12.64 12.64 0 0 0 9.182 3 19.736 19.736 0 0 0 4.745 4.372C1.578 9.1.72 13.72 1.149 18.276a19.9 19.9 0 0 0 5.993 2.99c.483-.657.914-1.354 1.284-2.087a12.9 12.9 0 0 1-2.023-.967c.17-.123.336-.252.497-.384a14.25 14.25 0 0 0 11.999 0c.163.132.329.261.497.384-.646.383-1.324.71-2.026.968.37.732.8 1.429 1.284 2.086a19.83 19.83 0 0 0 5.995-2.989c.503-5.277-.838-9.855-3.532-13.907ZM8.02 15.33c-1.183 0-2.155-1.086-2.155-2.419 0-1.333.955-2.42 2.155-2.42 1.21 0 2.176 1.096 2.156 2.42 0 1.333-.947 2.419-2.156 2.419Zm7.975 0c-1.183 0-2.156-1.086-2.156-2.419 0-1.333.955-2.42 2.156-2.42 1.21 0 2.175 1.096 2.155 2.42 0 1.333-.946 2.419-2.155 2.419Z" />
        </svg>
        {csrfToken ? "Sign in with Discord" : "Preparing Discord sign-in..."}
      </button>

      {error && (
        <p className="mt-3 text-xs leading-5 text-red" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
