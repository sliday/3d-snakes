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
  },
  neonNightmare: {
    name: "Neon Nightmare",
    colors: [
      "#22d3ee", // Cyan-400
      "#fb7185", // Rose-400
      "#a78bfa", // Violet-400
      "#34d399", // Emerald-400
      "#fbbf24"  // Amber-400
    ],
    bg: "#18181b" // Zinc-900
  },
  candyLand: {
    name: "Candy Land",
    colors: [
      "#f472b6", // Pink-400
      "#818cf8", // Indigo-400
      "#34d399", // Emerald-400
      "#fcd34d", // Amber-300
      "#fb7185"  // Rose-400
    ],
    bg: "#fdf4ff" // Fuchsia-50
  },
  toxicWaste: {
    name: "Toxic Waste",
    colors: [
      "#84cc16", // Lime-500
      "#facc15", // Yellow-500
      "#4ade80", // Green-400
      "#2dd4bf", // Teal-400
      "#fbbf24"  // Amber-400
    ],
    bg: "#064e3b" // Emerald-900
  },
  iceCream: {
    name: "Ice Cream Shop",
    colors: [
      "#fda4af", // Rose-300
      "#c4b5fd", // Violet-300
      "#93c5fd", // Blue-300
      "#fde68a", // Amber-200
      "#6ee7b7"  // Emerald-300
    ],
    bg: "#fff1f2" // Rose-50
  },
  lavaLamp: {
    name: "Lava Lamp",
    colors: [
      "#f87171", // Red-400
      "#fb923c", // Orange-400
      "#fbbf24", // Amber-400
      "#facc15", // Yellow-400
      "#f472b6"  // Pink-400
    ],
    bg: "#27272a" // Zinc-800
  },
  deepSea: {
    name: "Deep Sea",
    colors: [
      "#0ea5e9", // Sky-500
      "#06b6d4", // Cyan-500
      "#14b8a6", // Teal-500
      "#0891b2", // Cyan-600
      "#7dd3fc"  // Sky-300
    ],
    bg: "#0c4a6e" // Sky-900
  },
  alienInvasion: {
    name: "Alien Invasion",
    colors: [
      "#4ade80", // Green-400
      "#34d399", // Emerald-400
      "#2dd4bf", // Teal-400
      "#a7f3d0", // Emerald-200
      "#86efac"  // Green-300
    ],
    bg: "#052e16" // Green-950
  },
  discoFever: {
    name: "Disco Fever",
    colors: [
      "#e879f9", // Fuchsia-400
      "#c084fc", // Purple-400
      "#818cf8", // Indigo-400
      "#38bdf8", // Sky-400
      "#fb7185"  // Rose-400
    ],
    bg: "#581c87" // Purple-900
  },
  retroComputer: {
    name: "Retro Computer",
    colors: [
      "#22c55e", // Green-500
      "#86efac", // Green-300
      "#4ade80", // Green-400
      "#16a34a", // Green-600
      "#15803d"  // Green-700
    ],
    bg: "#000000" // Black
  },
  sunsetBeach: {
    name: "Sunset Beach",
    colors: [
      "#f97316", // Orange-500
      "#fb923c", // Orange-400
      "#fdba74", // Orange-300
      "#fed7aa", // Orange-200
      "#fff7ed"  // Orange-50
    ],
    bg: "#312e81" // Indigo-900
  },
  cottonCandy: {
    name: "Cotton Candy",
    colors: [
      "#fecdd3", // Rose-200
      "#fbcfe8", // Pink-200
      "#f5d0fe", // Fuchsia-200
      "#e9d5ff", // Purple-200
      "#ddd6fe"  // Violet-200
    ],
    bg: "#faf5ff" // Purple-50
  }
}; 