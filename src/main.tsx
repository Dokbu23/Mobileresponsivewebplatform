
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "./app/styles/sweetalert.css";

  // Apply saved dark mode preference before first render to avoid flash
  if (localStorage.getItem('discover-mansalay:dark') === 'true') {
    document.documentElement.classList.add('dark');
  }

  createRoot(document.getElementById("root")!).render(<App />);
  
