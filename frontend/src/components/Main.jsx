import React, { useState } from "react";
import { AppBar, Typography, ThemeProvider, CssBaseline, createTheme,Toolbar } from "@mui/material";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReactGA from "react-ga4";
import Create from "./Create";  
import Home from "./Home";
import Room from "./Room";
import "../css/Main.scss";


// Theme configuration
const theme = createTheme({
  typography: {
    fontFamily: ["Bangers", "sans-serif"].join(","),
    h3: {
      letterSpacing: "2px",
    },
  },

});

// Initialize Google Analytics if key exists
const key = process.env.REACT_APP_ANALYTICS_KEY;
if (key) ReactGA.initialize(key);

const Main = () => {
  const [username, setUsername] = useState("");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

<AppBar
  position="static"
  elevation={2} // subtle shadow
  sx={{
    backgroundColor: "#ffffff", // white background
    color: "#333", // text color
    borderBottom: "1px solid #e0e0e0", // soft divider
  }}
>
  <Toolbar>
    <Typography
      variant="h5"
      component="div"
      sx={{ p: 1, fontWeight: "bold" }}
    >
      <a
        href="/"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        Hangmanonline.io
      </a>
    </Typography>
  </Toolbar>
</AppBar>

      <div className="container">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home setUsername={setUsername} />} />
            <Route path="/create" element={<Create setUser={setUsername} user={username} />} />
            <Route path="/:roomID" element={<Room username={username} />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
};

export default Main;
