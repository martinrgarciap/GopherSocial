import "./App.css";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/v1";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("gophersocial_token")),
  );

  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("gophersocial_token")));
    };

    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("gophersocial_token");
    window.dispatchEvent(new Event("auth-changed"));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          GopherSocial
        </NavLink>

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
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
  );
}

export default App;
