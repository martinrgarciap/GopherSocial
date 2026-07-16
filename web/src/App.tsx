import "./App.css";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ProjectHeader } from "./LandingPage";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/v1";

const TOKEN_KEY = "gophersocial_token";
const USERNAME_KEY = "gophersocial_username";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem(TOKEN_KEY)),
  );
  const [username, setUsername] = useState(
    () => localStorage.getItem(USERNAME_KEY) || "",
  );

  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(Boolean(localStorage.getItem(TOKEN_KEY)));
      setUsername(localStorage.getItem(USERNAME_KEY) || "");
    };

    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    window.dispatchEvent(new Event("auth-changed"));
  };

  return (
    <>
      <ProjectHeader active="app" />
      <div className="app-shell">
        <aside className="sidebar">
          <NavLink to="/app" className="brand">
            GopherSocial
          </NavLink>

          <div className="session-label">
            {isLoggedIn ? `Welcome ${username || "back"}` : "Guest"}
          </div>

          <nav className="nav-links" aria-label="Main navigation">
            <NavLink to="/app">Home</NavLink>
            {isLoggedIn && <NavLink to="/following">Following</NavLink>}
            {!isLoggedIn && <NavLink to="/login">Login</NavLink>}
            {!isLoggedIn && <NavLink to="/register">Register</NavLink>}
          </nav>

          {isLoggedIn ? (
            <>
              <NavLink className="sidebar-action" to="/create">
                Create
              </NavLink>
              <button className="sidebar-action secondary-action" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <NavLink className="sidebar-action" to="/register">
              Join now
            </NavLink>
          )}
        </aside>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </>
  );
}

export default App;
