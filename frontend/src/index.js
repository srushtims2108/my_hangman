import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Main from "./components/Main"; // Use Main, not App

const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
