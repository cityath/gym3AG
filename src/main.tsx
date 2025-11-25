import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Verificar que el elemento root exista
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Failed to find the root element");
}