import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { StatusBar } from "expo-status-bar";

import { useRouter } from "expo-router";

import { getAllProgress, saveGameProgress } from "../../src/services/storage";

type GameState = "ready" | "playing" | "gameOver";

type ElementData = {
  number: number;

  symbol: string;

  name: string;

  period: number;

  group: number;

  category: string;
};

const ELEMENTS: ElementData[] = [
  {
    number: 1,

    symbol: "H",

    name: "Hydrogen",

    period: 1,

    group: 1,

    category: "nonmetal",
  },

  {
    number: 2,

    symbol: "He",

    name: "Helium",

    period: 1,

    group: 18,

    category: "noble",
  },

  {
    number: 3,

    symbol: "Li",

    name: "Lithium",

    period: 2,

    group: 1,

    category: "alkali",
  },

  {
    number: 4,

    symbol: "Be",

    name: "Beryllium",

    period: 2,

    group: 2,

    category: "alkaline",
  },

  {
    number: 5,

    symbol: "B",

    name: "Boron",

    period: 2,

    group: 13,

    category: "metalloid",
  },

  {
    number: 6,

    symbol: "C",

    name: "Carbon",

    period: 2,

    group: 14,

    category: "nonmetal",
  },

  {
    number: 7,

    symbol: "N",

    name: "Nitrogen",

    period: 2,

    group: 15,

    category: "nonmetal",
  },

  {
    number: 8,

    symbol: "O",

    name: "Oxygen",

    period: 2,

    group: 16,

    category: "nonmetal",
  },

  {
    number: 9,

    symbol: "F",

    name: "Fluorine",

    period: 2,

    group: 17,

    category: "halogen",
  },

  {
    number: 10,

    symbol: "Ne",

    name: "Neon",

    period: 2,

    group: 18,

    category: "noble",
  },

  {
    number: 11,

    symbol: "Na",

    name: "Sodium",

    period: 3,

    group: 1,

    category: "alkali",
  },

  {
    number: 12,

    symbol: "Mg",

    name: "Magnesium",

    period: 3,

    group: 2,

    category: "alkaline",
  },

  {
    number: 13,

    symbol: "Al",

    name: "Aluminium",

    period: 3,

    group: 13,

    category: "postmetal",
  },

  {
    number: 14,

    symbol: "Si",

    name: "Silicon",

    period: 3,

    group: 14,

    category: "metalloid",
  },

  {
    number: 15,

    symbol: "P",

    name: "Phosphorus",

    period: 3,

    group: 15,

    category: "nonmetal",
  },

  {
    number: 16,

    symbol: "S",

    name: "Sulfur",

    period: 3,

    group: 16,

    category: "nonmetal",
  },

  {
    number: 17,

    symbol: "Cl",

    name: "Chlorine",

    period: 3,

    group: 17,

    category: "halogen",
  },

  {
    number: 18,

    symbol: "Ar",

    name: "Argon",

    period: 3,

    group: 18,

    category: "noble",
  },

  {
    number: 19,

    symbol: "K",

    name: "Potassium",

    period: 4,

    group: 1,

    category: "alkali",
  },

  {
    number: 20,

    symbol: "Ca",

    name: "Calcium",

    period: 4,

    group: 2,

    category: "alkaline",
  },

  {
    number: 21,

    symbol: "Sc",

    name: "Scandium",

    period: 4,

    group: 3,

    category: "transition",
  },

  {
    number: 22,

    symbol: "Ti",

    name: "Titanium",

    period: 4,

    group: 4,

    category: "transition",
  },

  {
    number: 23,

    symbol: "V",

    name: "Vanadium",

    period: 4,

    group: 5,

    category: "transition",
  },

  {
    number: 24,

    symbol: "Cr",

    name: "Chromium",

    period: 4,

    group: 6,

    category: "transition",
  },

  {
    number: 25,

    symbol: "Mn",

    name: "Manganese",

    period: 4,

    group: 7,

    category: "transition",
  },

  {
    number: 26,

    symbol: "Fe",

    name: "Iron",

    period: 4,

    group: 8,

    category: "transition",
  },

  {
    number: 27,

    symbol: "Co",

    name: "Cobalt",

    period: 4,

    group: 9,

    category: "transition",
  },

  {
    number: 28,

    symbol: "Ni",

    name: "Nickel",

    period: 4,

    group: 10,

    category: "transition",
  },

  {
    number: 29,

    symbol: "Cu",

    name: "Copper",

    period: 4,

    group: 11,

    category: "transition",
  },

  {
    number: 30,

    symbol: "Zn",

    name: "Zinc",

    period: 4,

    group: 12,

    category: "transition",
  },

  {
    number: 31,

    symbol: "Ga",

    name: "Gallium",

    period: 4,

    group: 13,

    category: "postmetal",
  },

  {
    number: 32,

    symbol: "Ge",

    name: "Germanium",

    period: 4,

    group: 14,

    category: "metalloid",
  },

  {
    number: 33,

    symbol: "As",

    name: "Arsenic",

    period: 4,

    group: 15,

    category: "metalloid",
  },

  {
    number: 34,

    symbol: "Se",

    name: "Selenium",

    period: 4,

    group: 16,

    category: "nonmetal",
  },

  {
    number: 35,

    symbol: "Br",

    name: "Bromine",

    period: 4,

    group: 17,

    category: "halogen",
  },

  {
    number: 36,

    symbol: "Kr",

    name: "Krypton",

    period: 4,

    group: 18,

    category: "noble",
  },

  {
    number: 37,

    symbol: "Rb",

    name: "Rubidium",

    period: 5,

    group: 1,

    category: "alkali",
  },

  {
    number: 38,

    symbol: "Sr",

    name: "Strontium",

    period: 5,

    group: 2,

    category: "alkaline",
  },

  {
    number: 39,

    symbol: "Y",

    name: "Yttrium",

    period: 5,

    group: 3,

    category: "transition",
  },

  {
    number: 40,

    symbol: "Zr",

    name: "Zirconium",

    period: 5,

    group: 4,

    category: "transition",
  },

  {
    number: 41,

    symbol: "Nb",

    name: "Niobium",

    period: 5,

    group: 5,

    category: "transition",
  },

  {
    number: 42,

    symbol: "Mo",

    name: "Molybdenum",

    period: 5,

    group: 6,

    category: "transition",
  },

  {
    number: 43,

    symbol: "Tc",

    name: "Technetium",

    period: 5,

    group: 7,

    category: "transition",
  },

  {
    number: 44,

    symbol: "Ru",

    name: "Ruthenium",

    period: 5,

    group: 8,

    category: "transition",
  },

  {
    number: 45,

    symbol: "Rh",

    name: "Rhodium",

    period: 5,

    group: 9,

    category: "transition",
  },

  {
    number: 46,

    symbol: "Pd",

    name: "Palladium",

    period: 5,

    group: 10,

    category: "transition",
  },

  {
    number: 47,

    symbol: "Ag",

    name: "Silver",

    period: 5,

    group: 11,

    category: "transition",
  },

  {
    number: 48,

    symbol: "Cd",

    name: "Cadmium",

    period: 5,

    group: 12,

    category: "transition",
  },

  {
    number: 49,

    symbol: "In",

    name: "Indium",

    period: 5,

    group: 13,

    category: "postmetal",
  },

  {
    number: 50,

    symbol: "Sn",

    name: "Tin",

    period: 5,

    group: 14,

    category: "postmetal",
  },

  {
    number: 51,

    symbol: "Sb",

    name: "Antimony",

    period: 5,

    group: 15,

    category: "metalloid",
  },

  {
    number: 52,

    symbol: "Te",

    name: "Tellurium",

    period: 5,

    group: 16,

    category: "metalloid",
  },

  {
    number: 53,

    symbol: "I",

    name: "Iodine",

    period: 5,

    group: 17,

    category: "halogen",
  },

  {
    number: 54,

    symbol: "Xe",

    name: "Xenon",

    period: 5,

    group: 18,

    category: "noble",
  },

  {
    number: 55,

    symbol: "Cs",

    name: "Cesium",

    period: 6,

    group: 1,

    category: "alkali",
  },

  {
    number: 56,

    symbol: "Ba",

    name: "Barium",

    period: 6,

    group: 2,

    category: "alkaline",
  },

  {
    number: 57,

    symbol: "La",

    name: "Lanthanum",

    period: 6,

    group: 3,

    category: "lanthanide",
  },

  {
    number: 58,

    symbol: "Ce",

    name: "Cerium",

    period: 6,

    group: 4,

    category: "lanthanide",
  },

  {
    number: 59,

    symbol: "Pr",

    name: "Praseodymium",

    period: 6,

    group: 5,

    category: "lanthanide",
  },

  {
    number: 60,

    symbol: "Nd",

    name: "Neodymium",

    period: 6,

    group: 6,

    category: "lanthanide",
  },

  {
    number: 61,

    symbol: "Pm",

    name: "Promethium",

    period: 6,

    group: 7,

    category: "lanthanide",
  },

  {
    number: 62,

    symbol: "Sm",

    name: "Samarium",

    period: 6,

    group: 8,

    category: "lanthanide",
  },

  {
    number: 63,

    symbol: "Eu",

    name: "Europium",

    period: 6,

    group: 9,

    category: "lanthanide",
  },

  {
    number: 64,

    symbol: "Gd",

    name: "Gadolinium",

    period: 6,

    group: 10,

    category: "lanthanide",
  },

  {
    number: 65,

    symbol: "Tb",

    name: "Terbium",

    period: 6,

    group: 11,

    category: "lanthanide",
  },

  {
    number: 66,

    symbol: "Dy",

    name: "Dysprosium",

    period: 6,

    group: 12,

    category: "lanthanide",
  },

  {
    number: 67,

    symbol: "Ho",

    name: "Holmium",

    period: 6,

    group: 13,

    category: "lanthanide",
  },

  {
    number: 68,

    symbol: "Er",

    name: "Erbium",

    period: 6,

    group: 14,

    category: "lanthanide",
  },

  {
    number: 69,

    symbol: "Tm",

    name: "Thulium",

    period: 6,

    group: 15,

    category: "lanthanide",
  },

  {
    number: 70,

    symbol: "Yb",

    name: "Ytterbium",

    period: 6,

    group: 16,

    category: "lanthanide",
  },

  {
    number: 71,

    symbol: "Lu",

    name: "Lutetium",

    period: 6,

    group: 17,

    category: "lanthanide",
  },

  {
    number: 72,

    symbol: "Hf",

    name: "Hafnium",

    period: 6,

    group: 4,

    category: "transition",
  },

  {
    number: 73,

    symbol: "Ta",

    name: "Tantalum",

    period: 6,

    group: 5,

    category: "transition",
  },

  {
    number: 74,

    symbol: "W",

    name: "Tungsten",

    period: 6,

    group: 6,

    category: "transition",
  },

  {
    number: 75,

    symbol: "Re",

    name: "Rhenium",

    period: 6,

    group: 7,

    category: "transition",
  },

  {
    number: 76,

    symbol: "Os",

    name: "Osmium",

    period: 6,

    group: 8,

    category: "transition",
  },

  {
    number: 77,

    symbol: "Ir",

    name: "Iridium",

    period: 6,

    group: 9,

    category: "transition",
  },

  {
    number: 78,

    symbol: "Pt",

    name: "Platinum",

    period: 6,

    group: 10,

    category: "transition",
  },

  {
    number: 79,

    symbol: "Au",

    name: "Gold",

    period: 6,

    group: 11,

    category: "transition",
  },

  {
    number: 80,

    symbol: "Hg",

    name: "Mercury",

    period: 6,

    group: 12,

    category: "transition",
  },

  {
    number: 81,

    symbol: "Tl",

    name: "Thallium",

    period: 6,

    group: 13,

    category: "postmetal",
  },

  {
    number: 82,

    symbol: "Pb",

    name: "Lead",

    period: 6,

    group: 14,

    category: "postmetal",
  },

  {
    number: 83,

    symbol: "Bi",

    name: "Bismuth",

    period: 6,

    group: 15,

    category: "postmetal",
  },

  {
    number: 84,

    symbol: "Po",

    name: "Polonium",

    period: 6,

    group: 16,

    category: "postmetal",
  },

  {
    number: 85,

    symbol: "At",

    name: "Astatine",

    period: 6,

    group: 17,

    category: "halogen",
  },

  {
    number: 86,

    symbol: "Rn",

    name: "Radon",

    period: 6,

    group: 18,

    category: "noble",
  },

  {
    number: 87,

    symbol: "Fr",

    name: "Francium",

    period: 7,

    group: 1,

    category: "alkali",
  },

  {
    number: 88,

    symbol: "Ra",

    name: "Radium",

    period: 7,

    group: 2,

    category: "alkaline",
  },

  {
    number: 89,

    symbol: "Ac",

    name: "Actinium",

    period: 7,

    group: 3,

    category: "actinide",
  },

  {
    number: 90,

    symbol: "Th",

    name: "Thorium",

    period: 7,

    group: 4,

    category: "actinide",
  },

  {
    number: 91,

    symbol: "Pa",

    name: "Protactinium",

    period: 7,

    group: 5,

    category: "actinide",
  },

  {
    number: 92,

    symbol: "U",

    name: "Uranium",

    period: 7,

    group: 6,

    category: "actinide",
  },

  {
    number: 93,

    symbol: "Np",

    name: "Neptunium",

    period: 7,

    group: 7,

    category: "actinide",
  },

  {
    number: 94,

    symbol: "Pu",

    name: "Plutonium",

    period: 7,

    group: 8,

    category: "actinide",
  },

  {
    number: 95,

    symbol: "Am",

    name: "Americium",

    period: 7,

    group: 9,

    category: "actinide",
  },

  {
    number: 96,

    symbol: "Cm",

    name: "Curium",

    period: 7,

    group: 10,

    category: "actinide",
  },

  {
    number: 97,

    symbol: "Bk",

    name: "Berkelium",

    period: 7,

    group: 11,

    category: "actinide",
  },

  {
    number: 98,

    symbol: "Cf",

    name: "Californium",

    period: 7,

    group: 12,

    category: "actinide",
  },

  {
    number: 99,

    symbol: "Es",

    name: "Einsteinium",

    period: 7,

    group: 13,

    category: "actinide",
  },

  {
    number: 100,

    symbol: "Fm",

    name: "Fermium",

    period: 7,

    group: 14,

    category: "actinide",
  },

  {
    number: 101,

    symbol: "Md",

    name: "Mendelevium",

    period: 7,

    group: 15,

    category: "actinide",
  },

  {
    number: 102,

    symbol: "No",

    name: "Nobelium",

    period: 7,

    group: 16,

    category: "actinide",
  },

  {
    number: 103,

    symbol: "Lr",

    name: "Lawrencium",

    period: 7,

    group: 17,

    category: "actinide",
  },

  {
    number: 104,

    symbol: "Rf",

    name: "Rutherfordium",

    period: 7,

    group: 4,

    category: "transition",
  },

  {
    number: 105,

    symbol: "Db",

    name: "Dubnium",

    period: 7,

    group: 5,

    category: "transition",
  },

  {
    number: 106,

    symbol: "Sg",

    name: "Seaborgium",

    period: 7,

    group: 6,

    category: "transition",
  },

  {
    number: 107,

    symbol: "Bh",

    name: "Bohrium",

    period: 7,

    group: 7,

    category: "transition",
  },

  {
    number: 108,

    symbol: "Hs",

    name: "Hassium",

    period: 7,

    group: 8,

    category: "transition",
  },

  {
    number: 109,

    symbol: "Mt",

    name: "Meitnerium",

    period: 7,

    group: 9,

    category: "transition",
  },

  {
    number: 110,

    symbol: "Ds",

    name: "Darmstadtium",

    period: 7,

    group: 10,

    category: "transition",
  },

  {
    number: 111,

    symbol: "Rg",

    name: "Roentgenium",

    period: 7,

    group: 11,

    category: "transition",
  },

  {
    number: 112,

    symbol: "Cn",

    name: "Copernicium",

    period: 7,

    group: 12,

    category: "transition",
  },

  {
    number: 113,

    symbol: "Nh",

    name: "Nihonium",

    period: 7,

    group: 13,

    category: "postmetal",
  },

  {
    number: 114,

    symbol: "Fl",

    name: "Flerovium",

    period: 7,

    group: 14,

    category: "postmetal",
  },

  {
    number: 115,

    symbol: "Mc",

    name: "Moscovium",

    period: 7,

    group: 15,

    category: "postmetal",
  },

  {
    number: 116,

    symbol: "Lv",

    name: "Livermorium",

    period: 7,

    group: 16,

    category: "postmetal",
  },

  {
    number: 117,

    symbol: "Ts",

    name: "Tennessine",

    period: 7,

    group: 17,

    category: "halogen",
  },

  {
    number: 118,

    symbol: "Og",

    name: "Oganesson",

    period: 7,

    group: 18,

    category: "noble",
  },
];

const BUBBLE_COLORS = [
  "#FF8A65",

  "#6C9EFF",

  "#B57BEE",

  "#32C99A",

  "#FFC857",

  "#F06C9B",
];

type Bubble = {
  id: number;

  symbol: string;

  correct: boolean;

  x: number;

  color: string;

  y: Animated.Value;

  scale: Animated.Value;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function makeBubbles(target: ElementData, fieldWidth: number): Bubble[] {
  const wrongElements = shuffle(
    ELEMENTS.filter((element) => element.number !== target.number),
  ).slice(0, 3);

  const choices = shuffle([target, ...wrongElements]);

  // Keep all four bubbles inside the measured play-field, including the last lane.

  const safeWidth = Math.max(220, fieldWidth);

  const bubbleSize = Math.max(48, Math.min(72, safeWidth / 5));

  const sidePadding = 8;

  const maxX = Math.max(sidePadding, safeWidth - bubbleSize - sidePadding);

  const laneWidth = (maxX - sidePadding) / 3;

  return choices.map((element, index) => {
    const laneStart = sidePadding + index * laneWidth;

    const jitter = Math.min(8, laneWidth * 0.12);

    const x = Math.max(
      sidePadding,

      Math.min(maxX, laneStart + (Math.random() * 2 - 1) * jitter),
    );

    return {
      id: Math.random(),

      symbol: element.symbol,

      correct: element.number === target.number,

      x,

      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],

      y: new Animated.Value(-70 - Math.random() * 100),
      scale: new Animated.Value(0.72),
    };
  });
}

export default function PeriodicTableGame() {
  const router = useRouter();

  const { width, height } = useWindowDimensions();

  const [gameState, setGameState] = useState<GameState>("ready");

  const [target, setTarget] = useState<ElementData>(ELEMENTS[0]);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  const [score, setScore] = useState(0);

  const [bestScore, setBestScore] = useState(0);

  const [fieldWidth, setFieldWidth] = useState(Math.max(280, width - 36));

  const [fieldHeight, setFieldHeight] = useState(Math.min(height * 0.56, 480));

  const [round, setRound] = useState(0);

  const scoreRef = useRef(0);

  const stateRef = useRef<GameState>("ready");

  const roundRef = useRef(0);

  const animationRef = useRef<Animated.CompositeAnimation[]>([]);

  const bubbleSize = Math.max(48, Math.min(72, Math.max(220, fieldWidth) / 5));

  useEffect(() => {
    let mounted = true;

    getAllProgress()
      .then((allProgress) => {
        if (mounted) setBestScore(allProgress["periodic-table"].highScore);
      })

      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const stopAnimations = useCallback(() => {
    animationRef.current.forEach((animation) => animation.stop());

    animationRef.current = [];
  }, []);

  useEffect(() => {
    return () => stopAnimations();
  }, [stopAnimations]);

  const endGame = useCallback(() => {
    if (stateRef.current !== "playing") return;

    stateRef.current = "gameOver";

    setGameState("gameOver");

    stopAnimations();

    const finalScore = scoreRef.current;

    const earnedStars = Math.min(3, Math.floor(finalScore / 100));

    const reachedLevel = Math.max(1, Math.floor(finalScore / 100) + 1);

    getAllProgress()
      .then(async (allProgress) => {
        const previous = allProgress["periodic-table"];

        await saveGameProgress("periodic-table", {
          ...previous,

          highScore: Math.max(previous.highScore, finalScore),

          currentLevel: Math.max(previous.currentLevel, reachedLevel),

          unlockedLevels: Math.max(
            previous.unlockedLevels,

            Math.min(10, reachedLevel + 1),
          ),

          stars: Math.max(previous.stars, earnedStars),
        });

        setBestScore((current) => Math.max(current, finalScore));
      })

      .catch((error) => {
        console.warn("Unable to save Periodic Table progress:", error);
      });
  }, [stopAnimations]);

  const startRound = useCallback(
    (currentScore: number) => {
      stopAnimations();

      const nextTarget = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];

      const nextBubbles = makeBubbles(nextTarget, fieldWidth);

      setTarget(nextTarget);

      setBubbles(nextBubbles);

      setScore(currentScore);

      scoreRef.current = currentScore;

      roundRef.current += 1;

      setRound(roundRef.current);
    },

    [fieldWidth, stopAnimations],
  );

  const startGame = useCallback(() => {
    stopAnimations();

    scoreRef.current = 0;

    roundRef.current = 0;

    stateRef.current = "playing";

    setScore(0);

    setGameState("playing");

    startRound(0);
  }, [startRound, stopAnimations]);

  useEffect(() => {
    if (gameState !== "playing" || bubbles.length !== 4) return;

    const animations = bubbles.map((bubble, index) =>
      Animated.parallel([
        // Animate top position on JS so Android touch targets follow the visible bubbles.
        Animated.timing(bubble.y, {
          toValue: Math.max(0, fieldHeight - bubbleSize - 44),
          duration: 6500 + index * 420 + Math.random() * 1200,
          useNativeDriver: false,
        }),
        Animated.spring(bubble.scale, {
          toValue: 1,
          friction: 6,
          tension: 95,
          // Keep this JS-driven too: the same animated view uses `top` for
          // falling, and native-driven transforms cannot be mixed with it.
          useNativeDriver: false,
        }),
      ]),
    );

    animationRef.current = animations;

    animations.forEach((animation, index) => {
      animation.start(({ finished }) => {
        if (
          finished &&
          stateRef.current === "playing" &&
          roundRef.current === round
        ) {
          endGame();
        }
      });
    });

    return () => animations.forEach((animation) => animation.stop());
  }, [bubbles, bubbleSize, endGame, fieldHeight, gameState, round]);

  const chooseBubble = useCallback(
    (bubble: Bubble) => {
      if (stateRef.current !== "playing") return;

      if (!bubble.correct) {
        endGame();

        return;
      }

      stopAnimations();

      const nextScore = scoreRef.current + 10;

      scoreRef.current = nextScore;

      setScore(nextScore);

      setBestScore((previous) => Math.max(previous, nextScore));

      startRound(nextScore);
    },

    [endGame, startRound, stopAnimations],
  );

  const resetToReady = () => {
    stopAnimations();

    stateRef.current = "ready";

    setGameState("ready");
  };

  const compact = height < 720;

  return (
    <View style={styles.screen}>
      <StatusBar hidden />

      {gameState === "ready" ? (
        <View style={styles.readyBackground}>
          <Pressable
            style={styles.settingsButton}
            onPress={() =>
              Alert.alert(
                "Periodic Table",

                "Choose the bubble with the correct chemical symbol. A wrong choice or a bubble reaching the ground ends the game.",
              )
            }
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>

          <View style={[styles.readyCard, compact && styles.readyCardCompact]}>
            <Text style={styles.readyIcon}>⚛️</Text>

            <Text style={styles.readyTitle}>PERIODIC TABLE</Text>

            <Text style={styles.readyHeading}>Catch the right element!</Text>

            <Text style={styles.readyDescription}>
              Read the full element name and tap its matching chemical symbol
              before any bubble hits the ground.
            </Text>

            <View style={styles.previewBubbles}>
              {["H", "O", "Na", "Fe"].map((symbol, index) => (
                <View
                  key={symbol}
                  style={[
                    styles.previewBubble,

                    { backgroundColor: BUBBLE_COLORS[index] },
                  ]}
                >
                  <Text style={styles.previewBubbleText}>{symbol}</Text>
                </View>
              ))}
            </View>

            <View style={styles.rulesCard}>
              <Text style={styles.ruleText}>
                🎯 Match the full name to its symbol
              </Text>

              <Text style={styles.ruleText}>
                🫧 Four colourful bubbles fall at once
              </Text>

              <Text style={styles.ruleText}>❌ Wrong answer = game over</Text>

              <Text style={styles.ruleText}>
                ⏱️ Bubble reaches the ground = game over
              </Text>
            </View>

            <Pressable style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>START GAME →</Text>
            </Pressable>

            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>BACK TO GAMES</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.gameScreen}>
          <View style={styles.gameHeader}>
            <Pressable
              style={styles.headerBack}
              onPress={() => {
                stopAnimations();

                stateRef.current = "ready";

                setGameState("ready");
              }}
            >
              <Text style={styles.headerBackText}>‹</Text>
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>PERIODIC TABLE</Text>

              <Text style={styles.headerSubtitle}>SCORE {score}</Text>
            </View>

            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>BEST {bestScore}</Text>
            </View>
          </View>

          <View style={styles.promptCard}>
            <Text style={styles.promptLabel}>FIND THIS ELEMENT</Text>

            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={styles.targetName}
            >
              {target.name}
            </Text>

            <Text style={styles.promptHint}>
              Tap the matching symbol bubble
            </Text>
          </View>

          <View
            style={styles.fallCard}
            onLayout={(event) => {
              const nextWidth = event.nativeEvent.layout.width;

              const nextHeight = event.nativeEvent.layout.height;

              if (Math.abs(nextWidth - fieldWidth) > 2)
                setFieldWidth(nextWidth);

              if (Math.abs(nextHeight - fieldHeight) > 2)
                setFieldHeight(nextHeight);
            }}
          >
            <View pointerEvents="none" style={styles.groundLine} />

            {bubbles.map((bubble) => (
              <Animated.View
                key={bubble.id}
                style={[
                  styles.bubblePosition,

                  {
                    left: bubble.x,
                    top: bubble.y,
                    width: bubbleSize,
                    height: bubbleSize,
                    transform: [{ scale: bubble.scale }],
                  },
                ]}
              >
                <Pressable
                  collapsable={false}
                  hitSlop={14}
                  pressRetentionOffset={{
                    top: 18,
                    right: 18,
                    bottom: 18,
                    left: 18,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${bubble.symbol}`}
                  onPress={() => chooseBubble(bubble)}
                  android_ripple={{
                    color: "rgba(255,255,255,0.28)",
                    borderless: false,
                  }}
                  style={({ pressed }) => [
                    styles.bubble,

                    {
                      backgroundColor: bubble.color,

                      width: bubbleSize,

                      height: bubbleSize,

                      borderRadius: bubbleSize / 2,
                    },

                    pressed && styles.bubblePressed,
                  ]}
                >
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={styles.bubbleText}
                  >
                    {bubble.symbol}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}

            <View pointerEvents="none" style={styles.groundLabel}>
              <Text style={styles.groundLabelText}>GROUND</Text>
            </View>
          </View>

          <Text style={styles.bottomHint}>
            Choose quickly — one mistake ends the run!
          </Text>

          {gameState === "gameOver" && (
            <View style={styles.overlay}>
              <View style={styles.gameOverCard}>
                <Text style={styles.gameOverEmoji}>🧪</Text>

                <Text style={styles.gameOverTitle}>GAME OVER</Text>

                <Text style={styles.gameOverScore}>Score: {score}</Text>

                <Text style={styles.gameOverDescription}>
                  {score === 0
                    ? "Keep practising element symbols!"
                    : "Great run! Can you beat your score?"}
                </Text>

                <Pressable style={styles.startButton} onPress={startGame}>
                  <Text style={styles.startButtonText}>PLAY AGAIN ↻</Text>
                </Pressable>

                <Pressable style={styles.backButton} onPress={resetToReady}>
                  <Text style={styles.backButtonText}>BACK TO MENU</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#DFF7D8" },

  readyBackground: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 16,

    paddingVertical: 8,
  },

  settingsButton: {
    position: "absolute",

    zIndex: 2,

    top: 8,

    right: 12,

    width: 48,

    height: 48,

    borderRadius: 24,

    backgroundColor: "#B9C7B7",

    alignItems: "center",

    justifyContent: "center",
  },

  settingsIcon: { fontSize: 25, color: "#FFFFFF" },

  readyCard: {
    width: "100%",

    maxWidth: 560,

    borderRadius: 30,

    backgroundColor: "#FFFFFF",

    paddingHorizontal: 24,

    paddingVertical: 24,

    alignItems: "center",

    elevation: 7,

    shadowColor: "#000",

    shadowOpacity: 0.14,

    shadowRadius: 10,

    shadowOffset: { width: 0, height: 5 },
  },

  readyCardCompact: {
    paddingHorizontal: 16,

    paddingVertical: 12,

    borderRadius: 24,
  },

  readyIcon: { fontSize: 48, marginBottom: 3 },

  readyTitle: {
    color: "#25202D",

    fontSize: 17,

    fontWeight: "900",

    letterSpacing: 1.7,

    textAlign: "center",
  },

  readyHeading: {
    color: "#25202D",

    fontSize: 25,

    fontWeight: "900",

    textAlign: "center",

    marginTop: 10,
  },

  readyDescription: {
    color: "#68717A",

    fontSize: 13,

    lineHeight: 19,

    textAlign: "center",

    marginTop: 8,
  },

  previewBubbles: { flexDirection: "row", gap: 10, marginVertical: 15 },

  previewBubble: {
    width: 52,

    height: 52,

    borderRadius: 26,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 3,

    borderColor: "rgba(255,255,255,0.7)",
  },

  previewBubbleText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },

  rulesCard: {
    width: "100%",

    backgroundColor: "#F4F7EA",

    borderRadius: 17,

    paddingHorizontal: 14,

    paddingVertical: 10,

    gap: 8,
  },

  ruleText: { color: "#36404A", fontSize: 12, fontWeight: "800" },

  startButton: {
    width: "100%",

    minHeight: 52,

    borderRadius: 16,

    backgroundColor: "#19A950",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 16,
  },

  startButtonText: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "900",

    letterSpacing: 0.7,
  },

  backButton: {
    width: "100%",

    minHeight: 44,

    borderRadius: 15,

    backgroundColor: "#F4F7EA",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 9,
  },

  backButtonText: {
    color: "#199A4A",

    fontSize: 12,

    fontWeight: "900",

    letterSpacing: 0.5,
  },

  gameScreen: {
    flex: 1,

    backgroundColor: "#F3F8EF",

    paddingHorizontal: 12,

    paddingTop: 42,

    paddingBottom: 8,
  },

  gameHeader: {
    height: 54,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  headerBack: {
    width: 38,

    height: 38,

    borderRadius: 19,

    backgroundColor: "#E1ECD9",

    alignItems: "center",

    justifyContent: "center",
  },

  headerBackText: {
    fontSize: 30,

    lineHeight: 33,

    color: "#28452D",

    marginTop: -3,
  },

  headerCenter: { alignItems: "center" },

  headerTitle: {
    fontSize: 12,

    fontWeight: "900",

    color: "#28452D",

    letterSpacing: 1,
  },

  headerSubtitle: {
    fontSize: 12,

    fontWeight: "800",

    color: "#159447",

    marginTop: 2,
  },

  bestBadge: {
    backgroundColor: "#FFFFFF",

    borderRadius: 12,

    paddingHorizontal: 9,

    paddingVertical: 8,
  },

  bestBadgeText: { fontSize: 10, fontWeight: "900", color: "#536258" },

  promptCard: {
    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    paddingHorizontal: 16,

    paddingVertical: 15,

    alignItems: "center",

    marginTop: 8,

    elevation: 2,
  },

  promptLabel: {
    color: "#159447",

    fontSize: 10,

    fontWeight: "900",

    letterSpacing: 1.4,
  },

  targetName: {
    color: "#243A29",

    fontSize: 30,

    fontWeight: "900",

    marginTop: 5,

    maxWidth: "100%",
  },

  promptHint: { color: "#7B8976", fontSize: 11, marginTop: 3 },

  fallCard: {
    flex: 1,

    marginTop: 12,

    marginBottom: 7,

    borderRadius: 22,

    backgroundColor: "#FFFFFF",

    borderWidth: 2,

    borderColor: "#DDEAD7",

    overflow: "hidden",

    position: "relative",
  },

  bubblePosition: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    zIndex: 3,
    elevation: 8,
  },

  bubble: {
    alignItems: "center",

    justifyContent: "center",

    borderWidth: 4,

    borderColor: "rgba(255,255,255,0.72)",

    elevation: 5,

    shadowColor: "#243A29",

    shadowOpacity: 0.18,

    shadowRadius: 5,

    shadowOffset: { width: 0, height: 3 },
  },

  bubblePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.92 }],
    borderColor: "#FFFFFF",
  },

  bubbleText: {
    color: "#FFFFFF",

    fontSize: 20,

    fontWeight: "900",

    textShadowColor: "rgba(0,0,0,0.15)",

    textShadowRadius: 2,
  },

  groundLine: {
    position: "absolute",

    bottom: 38,

    width: "100%",

    borderTopWidth: 3,

    borderStyle: "dashed",

    borderColor: "#F08C52",
  },

  groundLabel: {
    position: "absolute",

    bottom: 10,

    alignSelf: "center",

    backgroundColor: "#FFF0E5",

    paddingHorizontal: 14,

    paddingVertical: 5,

    borderRadius: 12,
  },

  groundLabelText: {
    color: "#D56C35",

    fontSize: 10,

    fontWeight: "900",

    letterSpacing: 1.2,
  },

  bottomHint: {
    color: "#71806D",

    fontSize: 11,

    fontWeight: "700",

    textAlign: "center",

    paddingBottom: 3,
  },

  overlay: {
    position: "absolute",

    top: 0,

    right: 0,

    bottom: 0,

    left: 0,

    backgroundColor: "rgba(26,42,30,0.45)",

    alignItems: "center",

    justifyContent: "center",

    padding: 20,

    zIndex: 10,
  },

  gameOverCard: {
    width: "100%",

    maxWidth: 360,

    backgroundColor: "#FFFFFF",

    borderRadius: 26,

    padding: 24,

    alignItems: "center",
  },

  gameOverEmoji: { fontSize: 44, marginBottom: 4 },

  gameOverTitle: { fontSize: 25, fontWeight: "900", color: "#263D2A" },

  gameOverScore: {
    fontSize: 20,

    fontWeight: "900",

    color: "#159447",

    marginTop: 10,
  },

  gameOverDescription: {
    fontSize: 12,

    color: "#74816F",

    textAlign: "center",

    marginTop: 5,
  },
});
