// Color palettes for the simulation
const PALETTES = {
  default: {
    name: "Default",
    colors: [
      "#ef4444", // Red-500
      "#3b82f6", // Blue-500
      "#a855f7", // Purple-500
      "#ec4899", // Pink-500
      "#eab308", // Yellow-500
      "#f97316", // Orange-500
      "#d946ef", // Fuchsia-500
      "#f43f5e", // Rose-500
      "#0ea5e9", // Sky-500
      "#f59e0b", // Amber-500
      "#64748b", // Slate-600
      "#71717a", // Gray-500
      "#78716c"  // Neutral Gray
    ],
    bg: "#0f172a" // Tailwind slate-900
  },
  miro: {
    name: "Miró",
    colors: [
      "#e63946", // Vibrant red  
      "#f4d03f", // Bright yellow
      "#2274a5", // Deep blue
      "#000000", // Black
      "#e8e8e8"  // Off-white
    ],
    bg: "#1e293b" // Slate-800
  },
  soviet: {
    name: "Soviet Poster",
    colors: [
      "#cc0000", // Soviet red
      "#ffd700", // Golden yellow
      "#000000", // Black
      "#ffffff", // White
      "#b8860b"  // Dark golden
    ],
    bg: "#7f1d1d" // Red-900
  },
  mondrian: {
    name: "Mondrian",
    colors: [
      "#ff0000", // Pure red
      "#ffd700", // Primary yellow
      "#0000ff", // Primary blue
      "#ffffff", // White
      "#000000"  // Black
    ],
    bg: "#f3f4f6" // Gray-100
  },
  cyberpunk: {
    name: "Cyberpunk Neon",
    colors: [
      "#06b6d4", // Cyan-500
      "#ec4899", // Pink-500
      "#f43f5e", // Rose-500
      "#f59e0b", // Amber-500
      "#8b5cf6"  // Violet-500
    ],
    bg: "#1e293b" // Slate-800
  },
  vaporwave: {
    name: "Vaporwave",
    colors: [
      "#f472b6", // Pink-400
      "#a78bfa", // Purple-400
      "#f87171", // Red-400
      "#fbbf24", // Amber-400 (avoiding greenish tone)
      "#60a5fa"  // Blue-400
    ],
    bg: "#fce7f3" // Light pastel pink
  },
  pastelDream: {
    name: "Pastel Dream",
    colors: [
      "#fde68a", // Yellow-200
      "#bfdbfe", // Blue-200
      "#fbcfe8", // Pink-200
      "#e9d5ff", // Purple-200
      "#fda4af"  // Rose-200
    ],
    bg: "#fef9c3" // Soft pastel amber
  },
  kandinsky: {
    name: "Kandinsky",
    colors: [
      "#ff9800", // Orange-500
      "#4a90e2", // Blue
      "#9b59b6", // Purple
      "#f1c40f", // Yellow
      "#d946ef"  // Fuchsia-500
    ],
    bg: "#1f2937" // Gray-800
  },
  synthwave: {
    name: "Synthwave",
    colors: [
      "#6366f1", // Indigo-500
      "#8b5cf6", // Violet-500
      "#ec4899", // Pink-500
      "#60a5fa", // Blue-400
      "#f59e0b"  // Amber-500
    ],
    bg: "#1e3a8a" // Blue-900
  },
  baroque: {
    name: "Baroque",
    colors: [
      "#7f1d1d", // Red-900
      "#fbbf24", // Amber-400 (Gold tone)
      "#1e3a8a", // Blue-900
      "#4b5563", // Gray-600
      "#f9fafb"  // Gray-50 (Near white)
    ],
    bg: "#1f2937" // Gray-800
  }
}; 