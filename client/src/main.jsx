import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./styles/app.css";

const isGitHubPages =
  typeof window !== "undefined" && window.location.hostname.endsWith("github.io");

const Router = isGitHubPages ? HashRouter : BrowserRouter;
const routerProps = isGitHubPages ? {} : { basename: import.meta.env.BASE_URL };

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router
      {...routerProps}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
