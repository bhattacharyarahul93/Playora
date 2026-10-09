import { GameId } from "../types/game";

export const games: {
  id: GameId;
  name: string;
  icon: string;
  description: string;
  color: string;
}[] = [
  {
    id: "card-match",
    name: "Card Match",
    icon: "🧠",
    description: "Flip cards and find every pair.",
    color: "#EDE7FF",
  },
  {
    id: "watermelon",
    name: "Watermelon Pop",
    icon: "🍉",
    description: "Tap fruit, avoid bombs, build combos.",
    color: "#FFE4EB",
  },
  {
    id: "number-merge",
    name: "Number Merge",
    icon: "🔢",
    description: "Merge matching numbers and reach the target.",
    color: "#F2E4D5",
  },
  {
    id: "snake",
    name: "Snake",
    icon: "🐍",
    description: "Eat fruit and grow!",
    color: "#DFF7D8",
  },
  {
    id: "ludo",
    name: "Ludo",
    icon: "🎲",
    description: "Roll, move, capture and race all four tokens home.",
    color: "#E8DFFF",
  },
  {
    id: "periodic-table",
    name: "Periodic Table",
    icon: "⚛️",
    description: "Test your knowledge of elements, symbols and atomic numbers.",
    color: "#D9EAF7",
  },
  {
    id: "sudoku-classic",
    name: "Sudoku Classic",
    icon: "🧩",
    description: "Fill the 9×9 grid without repeating numbers.",
    color: "#D9EAF7",
  },
  {
    id: "crossword-master",
    name: "Crossword Master",
    icon: "🔤",
    description: "Complete words by finding the missing letters.",
    color: "#F3E4C8",
  },
  {
    id: "tic-tac-toe",
    name: "Tic Tac Toe",
    icon: "❌",
    description: "Beat the computer in the classic X and O game.",
    color: "#F8DDE5",
  },
  {
    id: "chess",
    name: "Chess",
    icon: "♟️",
    description: "Challenge the computer in a real game of chess.",
    color: "#E8DCC8",
  },
];
