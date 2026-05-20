import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, RotateCcw, Trophy, Eye, User, Users } from 'lucide-react';

interface CircleState {
  row: number;
  col: number;
  value: number | null;
  claimedBy: number | null;
}

type GameStatus = 'playing' | 'finished' | 'revealed';

interface BoardConfig {
  id: string;
  rows: number;
  players: number;
  turnsPerPlayer: number;
  status: 'Active' | 'Dormant';
  label: string;
}

const BOARD_CONFIGS: BoardConfig[] = [
  // 6 Rows (21 circles, 20 playable)
  { id: 'R6_P2', rows: 6, players: 2, turnsPerPlayer: 10, status: 'Active', label: '2P Standard' },
  { id: 'R6_P4', rows: 6, players: 4, turnsPerPlayer: 5, status: 'Active', label: '4P Sprint' },

  // 7 Rows (28 circles, 27 playable)
  { id: 'R7_P3', rows: 7, players: 3, turnsPerPlayer: 9, status: 'Active', label: '3P Standard' },
  { id: 'R7_P9', rows: 7, players: 9, turnsPerPlayer: 3, status: 'Dormant', label: 'Chaos' },

  // 8 Rows (36 circles, 35 playable)
  { id: 'R8_P5', rows: 8, players: 5, turnsPerPlayer: 7, status: 'Active', label: '5P Pro' },
  { id: 'R8_P7', rows: 8, players: 7, turnsPerPlayer: 5, status: 'Dormant', label: 'Brawl' },

  // 9 Rows (45 circles, 44 playable)
  { id: 'R9_P4', rows: 9, players: 4, turnsPerPlayer: 11, status: 'Dormant', label: 'Marathon' },
  { id: 'R9_P11', rows: 9, players: 11, turnsPerPlayer: 4, status: 'Dormant', label: 'Mob' },

  // 10 Rows (55 circles, 54 playable)
  { id: 'R10_P6', rows: 10, players: 6, turnsPerPlayer: 9, status: 'Active', label: '6P Mountain' },
  { id: 'R10_P9', rows: 10, players: 9, turnsPerPlayer: 6, status: 'Dormant', label: 'Chaos' }
];

const PLAYER_PALETTE = [
  '#00E5FF', // P1: Electric Cyan
  '#FF0055', // P2: Crimson Pink
  '#00FF66', // P3: Hyper Mint Green
  '#FF9900', // P4: Plasma Amber
  '#BD00FF', // P5: Quantum Violet
  '#FFFF00', // P6: Laser Yellow
  '#FF33CC', // P7: Hot Magenta
  '#00FA9A', // P8: Medium Spring Green (Radioactive Green)
  '#FF4500', // P9: Orange Red (Solar Flare)
  '#8A2BE2', // P10: Deep Blue Violet
  '#FFFFFF'  // P11: Blinding White (Starlight Node)
];

const getPlayerColor = (player: number): string => {
  const index = player - 1;
  if (index >= 0 && index < PLAYER_PALETTE.length) {
    return PLAYER_PALETTE[index];
  }
  return '#64748B'; // slate gray default fallback
};

// Multi-pass random number generator with seed shift / mid-square-like mixing
let entropySeed = Date.now() ^ Math.floor(Math.random() * 1000000);

export function getScrubbedRandom(): number {
  entropySeed = (entropySeed * 1664525 + 1013904223) % 4294967296;
  const r1 = entropySeed / 4294967296;
  const mix = (r1 + Math.random()) % 1.0;
  return mix;
}

export function generateVibeHand(
  turnsPerPlayer: number,
  options?: {
    minPos?: number;
    maxPos?: number;
    minNeg?: number;
    maxNeg?: number;
    useExtended?: boolean;
    extendedMin?: number;
    extendedMax?: number;
  }
): number[] {
  const minP = options?.minPos ?? 1;
  const maxP = options?.maxPos ?? turnsPerPlayer;
  const minN = options?.minNeg ?? -turnsPerPlayer;
  const maxN = options?.maxNeg ?? -1;

  const extMin = options?.extendedMin ?? -50;
  const extMax = options?.extendedMax ?? 99;

  const hand: number[] = [];
  let negativeCount = 0;
  let consecutiveNegatives = 0;

  for (let i = 0; i < turnsPerPlayer; i++) {
    const maxNegAllowedRatio = 0.25;
    const canBeNegative = 
      consecutiveNegatives < 2 && 
      ((negativeCount + 1) / turnsPerPlayer <= maxNegAllowedRatio);

    const randomRoll = getScrubbedRandom();
    const isNegative = canBeNegative && (randomRoll < 0.20);

    let val: number;
    if (isNegative) {
      const negRandom = getScrubbedRandom();
      val = Math.floor(negRandom * (maxN - minN + 1)) + minN;
      negativeCount++;
      consecutiveNegatives++;
    } else {
      const posRandom = getScrubbedRandom();
      val = Math.floor(posRandom * (maxP - minP + 1)) + minP;
      consecutiveNegatives = 0;
    }
    
    if (options?.useExtended) {
      if (val < 0) {
        const ratio = (val - minN) / (maxN - minN || 1);
        val = Math.round(extMin + ratio * (-1 - extMin));
      } else {
        const ratio = (val - minP) / (maxP - minP || 1);
        val = Math.round(1 + ratio * (extMax - 1));
      }
    }

    hand.push(val);
  }

  for (let i = hand.length - 1; i > 0; i--) {
    const shuffleRoll = getScrubbedRandom();
    const j = Math.floor(shuffleRoll * (i + 1));
    const temp = hand[i];
    hand[i] = hand[j];
    hand[j] = temp;
  }

  let verifiedNegCount = 0;
  let consecCount = 0;
  for (let i = 0; i < hand.length; i++) {
    if (hand[i] < 0) {
      const allowedCount = Math.floor(turnsPerPlayer * 0.25);
      if (verifiedNegCount >= allowedCount || consecCount >= 1) {
        const posRandom = getScrubbedRandom();
        hand[i] = Math.floor(posRandom * (maxP - minP + 1)) + minP;
        consecCount = 0;
      } else {
        verifiedNegCount++;
        consecCount++;
      }
    } else {
      consecCount = 0;
    }
  }

  return hand;
}


// Lobby Filtering Logic prepared for future UI
export default function App() {
  const [playerCount, setPlayerCount] = useState<number>(2);
  
  const activeConfig = useMemo(() => {
    // Select the first 'Active' config for the current player count
    return BOARD_CONFIGS.find(c => c.players === playerCount && c.status === 'Active') || 
           BOARD_CONFIGS.find(c => c.players === playerCount);
  }, [playerCount]);

  const formatDisplayLabel = useMemo(() => {
    if (!activeConfig) return '';
    const parts = activeConfig.label.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} (${parts[1]})`;
    }
    return activeConfig.label;
  }, [activeConfig]);

  const totalRows = useMemo(() => {
    return activeConfig?.rows || 6;
  }, [activeConfig]);

  const maxTurnsPerPlayer = useMemo(() => {
    return activeConfig?.turnsPerPlayer || 5;
  }, [activeConfig]);
  const [hoveredCircle, setHoveredCircle] = useState<number | null>(null);

  const generateInitialBoard = (rows: number) => {
    const board: CircleState[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= r; c++) {
        board.push({
          row: r,
          col: c,
          value: null,
          claimedBy: null,
        });
      }
    }
    return board;
  };

  const [board, setBoard] = useState<CircleState[]>(() => generateInitialBoard(6));
  const [currentPlayer, setCurrentPlayer] = useState<number>(1);
  const [player1Counter, setPlayer1Counter] = useState(1);
  const [player2Counter, setPlayer2Counter] = useState(1);
  const [player3Counter, setPlayer3Counter] = useState(1);
  const [player4Counter, setPlayer4Counter] = useState(1);
  const [player5Counter, setPlayer5Counter] = useState(1);
  const [player6Counter, setPlayer6Counter] = useState(1);

  // Volatile Pool hands state
  const [player1Hand, setPlayer1Hand] = useState<number[]>(() => generateVibeHand(10));
  const [player2Hand, setPlayer2Hand] = useState<number[]>(() => generateVibeHand(10));
  const [player3Hand, setPlayer3Hand] = useState<number[]>(() => generateVibeHand(10));
  const [player4Hand, setPlayer4Hand] = useState<number[]>(() => generateVibeHand(10));
  const [player5Hand, setPlayer5Hand] = useState<number[]>(() => generateVibeHand(10));
  const [player6Hand, setPlayer6Hand] = useState<number[]>(() => generateVibeHand(10));

  const getPlayerActiveValue = useCallback((p: number, counter: number) => {
    const hand = 
      p === 1 ? player1Hand : 
      p === 2 ? player2Hand : 
      p === 3 ? player3Hand : 
      p === 4 ? player4Hand : 
      p === 5 ? player5Hand : player6Hand;
    const val = hand[counter - 1];
    return val !== undefined ? val : counter;
  }, [player1Hand, player2Hand, player3Hand, player4Hand, player5Hand, player6Hand]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [showStrategy, setShowStrategy] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);

  const emptyCirclesCount = board.filter((c) => c.value === null).length;
  const isGameOver = emptyCirclesCount === 1;

  if (isGameOver && gameStatus === 'playing') {
    setGameStatus('finished');
  }

  const getNeighbors = (r: number, c: number) => {
    const potentials = [
      [r, c - 1], [r, c + 1],
      [r - 1, c - 1], [r - 1, c],
      [r + 1, c], [r + 1, c + 1]
    ];
    return potentials.filter(([nr, nc]) => 
      nr >= 0 && nr < totalRows && nc >= 0 && nc <= nr
    );
  };

  const scores = useMemo(() => {
    if (gameStatus !== 'revealed') return { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 };
    const blackHole = board.find(c => c.value === null);
    if (!blackHole) return { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 };
    const neighborCoords = getNeighbors(blackHole.row, blackHole.col);
    let p1Sum = 0;
    let p2Sum = 0;
    let p3Sum = 0;
    let p4Sum = 0;
    let p5Sum = 0;
    let p6Sum = 0;
    neighborCoords.forEach(([nr, nc]) => {
      const neighbor = board.find(c => c.row === nr && c.col === nc);
      if (neighbor && neighbor.value !== null) {
        if (neighbor.claimedBy === 1) p1Sum += neighbor.value;
        if (neighbor.claimedBy === 2) p2Sum += neighbor.value;
        if (neighbor.claimedBy === 3) p3Sum += neighbor.value;
        if (neighbor.claimedBy === 4) p4Sum += neighbor.value;
        if (neighbor.claimedBy === 5) p5Sum += neighbor.value;
        if (neighbor.claimedBy === 6) p6Sum += neighbor.value;
      }
    });
    return { p1: p1Sum, p2: p2Sum, p3: p3Sum, p4: p4Sum, p5: p5Sum, p6: p6Sum };
  }, [board, gameStatus, totalRows]);

  const pulsingNeighbors = useMemo(() => {
    if (hoveredCircle === null || gameStatus !== 'playing') return [];
    const circle = board[hoveredCircle];
    const neighborCoords = getNeighbors(circle.row, circle.col);
    return neighborCoords.map(([nr, nc]) => board.findIndex(b => b.row === nr && b.col === nc)).filter(i => i !== -1);
  }, [hoveredCircle, board, gameStatus, totalRows]);

  const blackHoleNeighbors = useMemo(() => {
    if (gameStatus !== 'revealed' && gameStatus !== 'finished') return [];
    const bh = board.find(c => c.value === null);
    if (!bh) return [];
    const neighborCoords = getNeighbors(bh.row, bh.col);
    return neighborCoords.map(([nr, nc]) => board.findIndex(b => b.row === nr && b.col === nc)).filter(i => i !== -1);
  }, [board, gameStatus, totalRows]);

  const scoringCircles = useMemo(() => {
    if (gameStatus === 'playing') return [];
    const bhIndex = board.findIndex(c => c.value === null);
    if (bhIndex === -1) return [];
    return [bhIndex, ...blackHoleNeighbors];
  }, [board, gameStatus, blackHoleNeighbors]);

  const handleCircleClick = (index: number) => {
    if (gameStatus !== 'playing' || board[index].value !== null) return;
    const newBoard = [...board];
    const currentCounter = 
      currentPlayer === 1 ? player1Counter : 
      currentPlayer === 2 ? player2Counter : 
      currentPlayer === 3 ? player3Counter : 
      currentPlayer === 4 ? player4Counter : 
      currentPlayer === 5 ? player5Counter : player6Counter;
      
    const valToPlace = getPlayerActiveValue(currentPlayer, currentCounter);
    newBoard[index] = { ...newBoard[index], value: valToPlace, claimedBy: currentPlayer };
    setBoard(newBoard);
    
    if (currentPlayer === 1) {
      setPlayer1Counter((prev) => prev + 1);
      if (player1Counter >= maxTurnsPerPlayer && allPlayersReachedMax(1)) {
        // This shouldn't happen if turn logic is correct, but safety
      }
      setCurrentPlayer(2);
    } else if (currentPlayer === 2) {
      setPlayer2Counter((prev) => prev + 1);
      setCurrentPlayer(playerCount >= 3 ? 3 : 1);
    } else if (currentPlayer === 3) {
      setPlayer3Counter((prev) => prev + 1);
      setCurrentPlayer(playerCount >= 4 ? 4 : 1);
    } else if (currentPlayer === 4) {
      setPlayer4Counter((prev) => prev + 1);
      setCurrentPlayer(playerCount >= 5 ? 5 : 1);
    } else if (currentPlayer === 5) {
      setPlayer5Counter((prev) => prev + 1);
      setCurrentPlayer(playerCount >= 6 ? 6 : 1);
    } else {
      setPlayer6Counter((prev) => prev + 1);
      setCurrentPlayer(1);
    }
  };

  const allPlayersReachedMax = (lastPlayer: number) => {
    const counts = [player1Counter, player2Counter, player3Counter, player4Counter, player5Counter, player6Counter];
    return counts.slice(0, playerCount).every((c, i) => i + 1 === lastPlayer ? c >= maxTurnsPerPlayer : c > maxTurnsPerPlayer);
  };

  const revealScores = () => setGameStatus('revealed');
  
  const resetGame = () => {
    setPlayerCount(2);
    setBoard(generateInitialBoard(6));
    setCurrentPlayer(1);
    setPlayer1Counter(1);
    setPlayer2Counter(1);
    setPlayer3Counter(1);
    setPlayer4Counter(1);
    setPlayer5Counter(1);
    setPlayer6Counter(1);
    setPlayer1Hand(generateVibeHand(10));
    setPlayer2Hand(generateVibeHand(10));
    setPlayer3Hand(generateVibeHand(10));
    setPlayer4Hand(generateVibeHand(10));
    setPlayer5Hand(generateVibeHand(10));
    setPlayer6Hand(generateVibeHand(10));
    setGameStatus('playing');
  };

  const selectConfig = (config: BoardConfig) => {
    setPlayerCount(config.players);
    setBoard(generateInitialBoard(config.rows));
    setCurrentPlayer(1);
    setPlayer1Counter(1);
    setPlayer2Counter(1);
    setPlayer3Counter(1);
    setPlayer4Counter(1);
    setPlayer5Counter(1);
    setPlayer6Counter(1);
    setPlayer1Hand(generateVibeHand(config.turnsPerPlayer));
    setPlayer2Hand(generateVibeHand(config.turnsPerPlayer));
    setPlayer3Hand(generateVibeHand(config.turnsPerPlayer));
    setPlayer4Hand(generateVibeHand(config.turnsPerPlayer));
    setPlayer5Hand(generateVibeHand(config.turnsPerPlayer));
    setPlayer6Hand(generateVibeHand(config.turnsPerPlayer));
    setGameStatus('playing');
    setIsFormatModalOpen(false);
  };

  const rows = useMemo(() => {
    const result: CircleState[][] = [];
    for (let i = 0; i < totalRows; i++) {
      result.push(board.filter((c) => i === c.row));
    }
    return result;
  }, [board, totalRows]);

  const scoresList = 
    playerCount === 2 ? [scores.p1, scores.p2] : 
    playerCount === 3 ? [scores.p1, scores.p2, scores.p3] : 
    playerCount === 4 ? [scores.p1, scores.p2, scores.p3, scores.p4] :
    playerCount === 5 ? [scores.p1, scores.p2, scores.p3, scores.p4, scores.p5] :
    [scores.p1, scores.p2, scores.p3, scores.p4, scores.p5, scores.p6];
    
  const minScore = Math.min(...scoresList);
  const winners = [];
  if (scores.p1 === minScore) winners.push(1);
  if (scores.p2 === minScore) winners.push(2);
  if (playerCount >= 3 && scores.p3 === minScore) winners.push(3);
  if (playerCount >= 4 && scores.p4 === minScore) winners.push(4);
  if (playerCount >= 5 && scores.p5 === minScore) winners.push(5);
  if (playerCount === 6 && scores.p6 === minScore) winners.push(6);

  const winner = winners.length === 1 ? winners[0] : 0;
  const isDraw = gameStatus === 'revealed' && winners.length > 1;

  // DYNAMIC SCALING ENGINE
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const circleSize = useMemo(() => {
    if (containerHeight === 0 || containerWidth === 0) return 60;
    
    // Dynamic Gap - smaller on mobile
    const isMobile = containerWidth < 640;
    const GAP = isMobile ? 4 : 8;
    const totalGaps = totalRows - 1;
    
    // Height-based calculation
    const isRevealed = gameStatus === 'revealed';
    const wingBuffer = isRevealed ? (containerWidth < 640 ? 60 : 80) : 0;
    const safetyHeight = (containerHeight - wingBuffer) * 0.85; // 15% safety gutter for height
    const availableHeight = safetyHeight - (totalGaps * GAP);
    const sizeFromHeight = availableHeight / totalRows;
    
    // Width-based calculation (widest row has totalRows circles)
    const safetyWidth = containerWidth * 0.98; // Maximizing width for 8-row layout
    const availableWidth = safetyWidth - (totalGaps * GAP);
    const sizeFromWidth = availableWidth / totalRows;
    
    // Take the smaller of the two to guarantee fit, but allow up to 80px (w-20) on desktop
    const calculated = Math.floor(Math.min(sizeFromHeight, sizeFromWidth));
    const baseLimit = containerWidth > 1024 ? 80 : 64;
    
    // Scale up circles specifically for 2-player and 4-player modes on desktop layouts
    let upperLimit = baseLimit;
    if (containerWidth > 1024) {
      if (playerCount === 2 && totalRows === 6) {
        upperLimit = 120; // Beautifully larger size for 2-player mode (6-row) on desktop
      } else if (playerCount === 4 && totalRows === 6) {
        upperLimit = 96;
      }
    }
    
    return Math.max(16, Math.min(upperLimit, calculated));
  }, [containerHeight, containerWidth, totalRows, gameStatus, playerCount]);

  const currentCPCounter = useMemo(() => {
    return currentPlayer === 1 ? player1Counter : 
           currentPlayer === 2 ? player2Counter : 
           currentPlayer === 3 ? player3Counter : 
           currentPlayer === 4 ? player4Counter : 
           currentPlayer === 5 ? player5Counter : player6Counter;
  }, [currentPlayer, player1Counter, player2Counter, player3Counter, player4Counter, player5Counter, player6Counter]);

  const currentCPNextValue = useMemo(() => {
    return getPlayerActiveValue(currentPlayer, currentCPCounter);
  }, [currentPlayer, currentCPCounter, getPlayerActiveValue]);

  return (
    <div 
      className="h-screen bg-[#010101] text-white font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden relative"
      style={{ 
        '--h-height': '3rem', 
        '--f-height': '1.25rem',
        ...({ '--h-height-lg': '5rem', '--f-height-lg': '2rem' } as any)
      } as any}
    >
      <div className="fixed inset-0 bg-[#000000] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#091121_0%,#000000_100%)] pointer-events-none opacity-90" />
      <div className="fixed inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* RE-ARCHITECTED COMPACT HEADER */}
      <header className="h-[var(--h-height)] lg:h-[var(--h-height-lg)] shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-3 sm:px-8 relative z-50 transition-all duration-300">
        {/* LEFT: LOGO */}
        <div className="flex-none flex items-center gap-2 sm:gap-3 lg:w-48">
          <div className="hidden sm:block">
            <h1 className="text-xl lg:text-2xl font-black italic tracking-tight uppercase leading-none bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">Black Hole</h1>
            <p className="text-[7px] uppercase tracking-[0.8em] font-bold opacity-30 mt-1">V3.0 - FLEXIBLE MATRIX</p>
          </div>
          <div className="sm:hidden w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center font-black italic text-[10px]">BH</div>
        </div>

        {/* CENTER: DESKTOP AND MOBILE HEADER ELEMENTS */}
        {/* Desktop-Only Centered System State & Format Selection */}
        <div className="hidden lg:flex justify-center items-center gap-6 w-full max-w-2xl mx-auto flex-1 h-full">
          <ActiveTurnDisplay 
            player={currentPlayer} 
            counter={currentCPCounter} 
            value={currentCPNextValue}
            gameStatus={gameStatus}
            className="px-4 py-2"
          />
          <button 
            onClick={() => setIsFormatModalOpen(true)}
            className={`transition-all duration-200 ease-in-out hover:bg-opacity-80 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-xl group shrink-0 h-[42px]
              ${gameStatus !== 'playing' ? 'bg-white/5 border-white/10 text-white/50' : 'bg-white/5 border-white/20 text-white'}
            `}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-white/75 group-hover:text-white whitespace-nowrap">
              {formatDisplayLabel}
            </span>
          </button>
        </div>

        {/* Mobile-Only Centered Active Player Ribbon (APR) + Format Badge (Side-by-side) */}
        <div className="flex lg:hidden items-center justify-center gap-2 shrink-0 max-w-[220px] xs:max-w-[280px] sm:max-w-[360px] w-full mx-auto">
          <ActiveTurnDisplay 
            player={currentPlayer} 
            counter={currentCPCounter} 
            value={currentCPNextValue}
            gameStatus={gameStatus}
            className="px-3 py-1.5"
          />

          {/* Compact Mobile Format Badge */}
          <button 
            onClick={() => setIsFormatModalOpen(true)}
            className={`transition-all duration-200 ease-in-out hover:bg-opacity-80 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 border rounded-xl group shrink-0 h-[34px]
              ${gameStatus !== 'playing' ? 'bg-white/5 border-white/10 text-white/50' : 'bg-white/5 border-white/20 text-white'}
            `}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-white/80 group-hover:text-white whitespace-nowrap">
              {formatDisplayLabel.split(' ')[0]}
            </span>
          </button>
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="flex-none lg:w-48 flex items-center justify-end gap-2 h-full relative z-10">
          {/* Minimal Eye/Info Ribbon popover button */}
          <div className="relative">
            <button 
              onClick={() => setShowStrategy(!showStrategy)}
              onMouseEnter={() => setShowStrategy(true)}
              onMouseLeave={() => setShowStrategy(false)}
              className={`p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-95 flex items-center justify-center relative group
                ${showStrategy ? 'text-blue-400 bg-white/10' : 'text-white/40'}
              `}
              title="Strategy Tips"
            >
              <Info size={14} className={showStrategy ? 'text-blue-400' : 'text-white/50'} />
            </button>

            <AnimatePresence>
              {showStrategy && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-64 p-5 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] text-left"
                >
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Strategic Intel</h3>
                  </div>
                  <div className="space-y-4">
                   {[
                     "Target neighbors of the hole.",
                     "Minimize your total value.",
                     "Block your opponent's low plays."
                   ].map((tip, i) => (
                     <div key={i} className="flex gap-3">
                       <span className="text-[8px] font-black opacity-20 mt-0.5">0{i+1}</span>
                       <p className="text-[10px] text-white/50 leading-relaxed font-bold uppercase tracking-wide">{tip}</p>
                     </div>
                   ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT GRID */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px] landscape:short:grid-cols-[1fr_180px] h-full relative z-10 transition-all duration-500">
        
        {/* PYRAMID MAIN AREA */}
        <main className="flex-1 flex flex-col relative min-h-0 overflow-hidden lg:overflow-visible p-4 sm:p-6 lg:p-8 justify-center">
          
          {/* Post-game elements rendered inside the main play area */}
          <AnimatePresence>
            {gameStatus === 'revealed' && (
              <>
                {/* Mobile Left Flank (Resolution Badge) - placed at top just below the header */}
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className={`absolute left-3 sm:left-6 top-3 sm:top-6 lg:hidden pointer-events-auto z-40 p-2.5 sm:p-3.5 rounded-2xl border backdrop-blur-md flex flex-col items-center justify-center w-[94px] sm:w-[124px] text-center shadow-2xl gap-1
                    ${isDraw ? 'bg-white/5 border-white/10 text-white' : 'bg-white text-black border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.15)]'}
                  `}
                >
                  <Trophy size={14} className={isDraw ? 'text-white/40' : 'text-blue-600'} />
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] opacity-40">Result</span>
                  <span className="text-xs sm:text-base font-black italic uppercase leading-none mt-0.5">
                    {isDraw ? "DRAW" : `P${winner}`}
                  </span>
                  {!isDraw && (
                    <span className="text-[6px] sm:text-[8px] font-bold opacity-50 mt-1">
                      SUM: {minScore}
                    </span>
                  )}
                </motion.div>

                {/* Mobile Symmetrical Center CTA: Easy-to-tap reset play again, centered between the top ribbons */}
                <motion.button
                  onClick={resetGame}
                  initial={{ scale: 0.8, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -20 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 lg:hidden pointer-events-auto py-2 px-3 sm:py-3 sm:px-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] sm:text-[11px] uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400 z-50 flex items-center justify-center gap-1.5 h-[38px] sm:h-[46px] whitespace-nowrap"
                >
                  <RotateCcw size={12} className="animate-spin-slow" />
                  <span>Play Again</span>
                </motion.button>

                {/* Mobile Right Flank (Tournament Tally scores) - placed at top just below the header */}
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="absolute right-3 sm:right-6 top-3 sm:top-6 lg:hidden pointer-events-auto z-40 p-2.5 sm:p-3.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-[94px] sm:w-[124px] flex flex-col gap-1.5"
                >
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.15em] opacity-30 text-center mb-0.5">Tally</span>
                  <div className="flex flex-col gap-1 sm:gap-1.5">
                    {[1, 2, 3, 4, 5, 6].filter(p => p <= playerCount).map(p => {
                      const isWinnerP = winners.includes(p);
                      const color = getPlayerColor(p);
                      return (
                        <div 
                          key={p} 
                          className={`flex items-center justify-between px-1.5 py-0.5 sm:py-1 rounded-lg transition-all
                            ${isWinnerP ? 'bg-white/5 border border-white/10' : 'opacity-45'}
                          `}
                        >
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-[7px] sm:text-[9px] font-black">P{p}</span>
                          </div>
                          <span className="text-[8px] sm:text-[10px] font-black" style={isWinnerP ? { color } : {}}>
                            {scores[`p${p}` as keyof typeof scores]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div 
            ref={containerRef}
            className="flex-1 w-full h-full max-h-[85vh] flex items-center justify-center overflow-visible lg:overflow-visible relative"
          >
            {/* Symmetrical Pascal Architecture with Convergence Entry */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeConfig?.id || 'default'}
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex items-center justify-center w-full h-full"
              >
                <div className="relative">
                  {/* Desktop wings rendered symmetrically on left and right of the apex level */}
                  <AnimatePresence>
                    {gameStatus === 'revealed' && (
                      <>
                        {/* Desktop Left Wing (xl screens only): Victory Badge */}
                        <motion.div 
                          initial={{ opacity: 0, x: -30, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -30, scale: 0.9 }}
                          className={`absolute bottom-[calc(100%+2rem)] xl:right-[calc(100%+32px)] hidden xl:flex flex-col justify-center gap-0.5 p-3.5 rounded-2xl border backdrop-blur-md w-[200px] h-[58px] shadow-2xl transition-all pointer-events-auto z-40
                            ${isDraw ? 'bg-white/5 border-white/10 text-white' : 'bg-white text-black border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.15)]'}
                          `}
                        >
                          <div className="flex items-center gap-1.5 leading-none">
                            {!isDraw && <Trophy className="text-blue-600 animate-bounce w-3.5 h-3.5" />}
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Resolution</span>
                          </div>
                          <div className="flex flex-col leading-tight mt-0.5">
                            <span className="text-xs font-black italic uppercase tracking-tight">
                              {isDraw ? "SUDDEN DRAW" : `PLAYER ${winner}`}
                            </span>
                            {!isDraw && (
                              <span className="text-[7px] font-black opacity-50 uppercase tracking-widest leading-none mt-0.5">
                                BEST SUM: {minScore}
                              </span>
                            )}
                          </div>
                        </motion.div>

                        {/* Desktop Right Wing (xl screens only): Contextual Reset Board */}
                        <motion.div 
                          initial={{ opacity: 0, x: 30, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 30, scale: 0.9 }}
                          className="absolute bottom-[calc(100%+2rem)] xl:left-[calc(100%+32px)] hidden xl:flex pointer-events-auto z-40 w-[200px]"
                        >
                          <button 
                            onClick={resetGame}
                            className="flex items-center gap-2.5 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_30px_rgba(37,99,235,0.3)] border border-blue-400/50 w-full h-[58px] justify-center transition-all"
                          >
                            <RotateCcw className="animate-spin-slow w-3.5 h-3.5" />
                            <span>Reset Board</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  <div 
                    className="flex flex-col items-center relative z-10 transition-all duration-500 max-w-full"
                    style={{ gap: `${containerWidth < 1024 ? (containerWidth < 640 ? 4 : 8) : 16}px` }}
                  >
                    {rows.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex touch-none" style={{ gap: `${containerWidth < 1024 ? (containerWidth < 640 ? 4 : 8) : 16}px` }}>
                        {row.map((circle) => {
                          const boardIndex = board.findIndex(c => c.row === circle.row && c.col === circle.col);
                          const isBlackHole = circle.value === null;
                          const isPulsing = pulsingNeighbors.includes(boardIndex);
                          const isScoring = scoringCircles.includes(boardIndex);

                          const playerColor = getPlayerColor(currentPlayer);
                          
                          return (
                            <motion.button
                              key={`${circle.row}-${circle.col}`}
                              id={`circle-${circle.row}-${circle.col}`}
                              animate={{
                                opacity: gameStatus !== 'playing' && !isScoring ? 0.2 : 1,
                                scale: isScoring ? [1, 1.05, 1] : 1,
                              }}
                              transition={{
                                scale: isScoring ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: 0.3 }
                              }}
                              onMouseEnter={() => setHoveredCircle(boardIndex)}
                              onMouseLeave={() => setHoveredCircle(null)}
                              onTouchStart={() => setHoveredCircle(boardIndex)}
                              onTouchEnd={() => setHoveredCircle(null)}
                              whileHover={!circle.value && gameStatus === 'playing' ? { scale: 1.15 } : {}}
                              whileTap={!circle.value && gameStatus === 'playing' ? { scale: 0.9 } : {}}
                              onClick={() => handleCircleClick(boardIndex)}
                              disabled={circle.value !== null || gameStatus !== 'playing'}
                              className={`
                                compact-circle rounded-full flex items-center justify-center font-black transition-all duration-300 relative touch-manipulation will-change-transform
                                ${!circle.value && gameStatus === 'playing' ? 'bg-white/5 border border-white/10 hover:bg-white/20 active:bg-white/30 cursor-pointer shadow-inner' : ''}
                                ${circle.value === null && gameStatus !== 'playing' ? 'bg-gradient-to-br from-black via-gray-900 to-black border-2 border-dashed border-white/40 shadow-[0_0_70px_rgba(255,255,255,0.2)] pulse-ring' : ''}
                                ${!circle.value && gameStatus !== 'playing' && circle.value !== null ? 'grayscale' : ''}
                                ${isPulsing ? 'scale-110 z-20' : ''}
                                ${isScoring ? 'border-2 border-blue-500 shadow-[0_0_30px_rgba(30,144,255,1)] z-30 transition-none' : ''}
                              `}
                              style={{ 
                                width: `${circleSize}px`, 
                                height: `${circleSize}px`,
                                fontSize: `${circleSize * 0.45}px`,
                                ...(circle.claimedBy ? {
                                  backgroundColor: getPlayerColor(circle.claimedBy),
                                  border: `2px solid ${getPlayerColor(circle.claimedBy)}`,
                                  boxShadow: `0 5px 25px ${getPlayerColor(circle.claimedBy)}66`,
                                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                } : {})
                              }}
                            >
                              {/* LONG-PRESS PULSE: 15% Opacity Halo */}
                              <AnimatePresence>
                                {isPulsing && (
                                  <motion.div 
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1.6, opacity: 0.12 }}
                                    exit={{ scale: 2.2, opacity: 0 }}
                                    className="absolute inset-0 rounded-full pointer-events-none"
                                    style={{ backgroundColor: playerColor, filter: 'blur(10px)' }}
                                  />
                                )}
                              </AnimatePresence>
                              {isBlackHole && gameStatus !== 'playing' && (
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                  transition={{ repeat: Infinity, duration: 4 }}
                                  className="absolute inset-[-4px] bg-white/5 rounded-full blur-xl pointer-events-none"
                                />
                              )}
                              <AnimatePresence mode="wait">
                                {circle.value && (
                                  <motion.span
                                    key="val"
                                    initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="italic drop-shadow-md z-10 text-black font-black"
                                >
                                  {circle.value}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

            {/* REVEAL OVERLAY OVERLAYS ONLY THE PYRAMID */}
            <AnimatePresence>
              {gameStatus === 'finished' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-[#020202]/60 backdrop-blur-sm"
                >
                  <motion.button
                    initial={{ y: 20, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={revealScores}
                    className="flex flex-col items-center gap-3 py-6 px-10 lg:py-8 lg:px-12 bg-white text-black rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl active:scale-95"
                    id="reveal-btn-main"
                  >
                    <div className="bg-black text-white p-3 lg:p-4 rounded-full"><Eye size={24} className="lg:w-6 lg:h-6" /></div>
                    <div className="text-center">
                      <div className="text-lg lg:text-2xl font-black uppercase italic leading-none tracking-tight">Reveal Standings</div>
                      <p className="text-[7px] lg:text-[8px] font-black opacity-30 mt-1 uppercase tracking-[0.4em] italic">Tournament Tally</p>
                    </div>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* SIDEBAR Info - RIGHT Offloaded Panel (Hidden on Short Landscape, Visible on Desktop lg) */}
        <aside className="hidden lg:flex border-l border-white/5 p-6 flex-col gap-6 justify-between bg-white/[0.01] h-full overflow-y-auto">
          
          <div className="space-y-6">
            {/* Integrated Post-Game Ribbons for Landscape Tablets/Smaller Desktops to prevent clipping/overlap */}
            {gameStatus === 'revealed' && (
              <div className="flex flex-col gap-3 xl:hidden">
                {/* Integrated Resolution Ribbon */}
                <div className={`p-3.5 rounded-xl border backdrop-blur-md flex flex-col justify-center gap-1 shadow-xl transition-all
                  ${isDraw ? 'bg-white/5 border-white/10 text-white' : 'bg-white text-black border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.15)]'}
                `}>
                  <div className="flex items-center gap-1.5 leading-none">
                    {!isDraw && <Trophy size={14} className="text-blue-600 animate-bounce" />}
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Resolution</span>
                  </div>
                  <div className="flex flex-col leading-tight mt-1">
                    <span className="text-xs font-black italic uppercase tracking-tight leading-none">
                      {isDraw ? "SUDDEN DRAW" : `PLAYER ${winner}`}
                    </span>
                    {!isDraw && (
                      <span className="text-[7.5px] font-black opacity-50 uppercase tracking-widest leading-none mt-1">
                        BEST SUM: {minScore}
                      </span>
                    )}
                  </div>
                </div>

                {/* Integrated Reset Ribbon */}
                <button 
                  onClick={resetGame}
                  className="w-full h-[44px] flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg border border-blue-400/50 transition-all active:scale-95 duration-200"
                >
                  <RotateCcw size={12} className="animate-spin-slow" />
                  <span>Reset Board</span>
                </button>
              </div>
            )}

            {/* HIGH-DENSITY SCOREBOARD (VISIBLE STARTING FROM GAME BOOT) */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Tournament Tally</h2>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6].filter(p => p <= playerCount).map(p => {
                  const color = getPlayerColor(p);
                  const isWinnerP = gameStatus === 'revealed' && winners.includes(p);
                  const scoreVal = scores[`p${p}` as keyof typeof scores];
                  const counter = 
                    p === 1 ? player1Counter : 
                    p === 2 ? player2Counter : 
                    p === 3 ? player3Counter : 
                    p === 4 ? player4Counter : 
                    p === 5 ? player5Counter : player6Counter;
                  const progressText = `${counter - 1}/${maxTurnsPerPlayer} Claims`;
                  const isActive = currentPlayer === p && gameStatus === 'playing';

                  return (
                    <div 
                      key={p} 
                      style={isWinnerP ? {
                        borderColor: `${color}44`,
                        backgroundColor: `${color}1A`,
                      } : isActive ? {
                        borderColor: `${color}33`,
                        backgroundColor: `${color}0D`,
                      } : {
                        borderColor: 'rgba(255,255,255,0.05)',
                        backgroundColor: 'rgba(255,255,255,0.01)'
                      }}
                      className={`flex flex-col p-3 rounded-xl border transition-all duration-300 
                        ${gameStatus === 'revealed' ? (isWinnerP ? 'opacity-100 scale-100' : 'opacity-40 grayscale scale-95') : (isActive ? 'opacity-100 scale-[1.02]' : 'opacity-65 scale-95')}
                      `}
                    >
                      <div className="flex items-center gap-1.5 mb-1 justify-between">
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'animate-ping' : 'animate-pulse'}`} style={{ backgroundColor: color }} />
                          <span className="text-[8px] font-black tracking-wider opacity-40">PLAYER {p}</span>
                        </div>
                        {isActive && <span className="text-[6px] font-black bg-white/10 text-white/90 px-1 rounded-sm uppercase tracking-wide">Turn</span>}
                      </div>

                      <div className="flex items-baseline justify-between mt-1">
                        <span 
                          className="text-lg font-black italic tracking-tighter"
                          style={{ color: (gameStatus === 'revealed' && isWinnerP) ? color : isActive ? color : 'inherit' }}
                        >
                          {gameStatus === 'revealed' ? scoreVal : 0}
                        </span>
                        <div className="flex flex-col items-end leading-none">
                          <span className="text-[7px] font-black opacity-30 uppercase tracking-widest">{progressText}</span>
                          {gameStatus === 'playing' && (
                            <span className="text-[8px] font-black opacity-80 text-cyan-400 mt-1">
                              NEXT: {getPlayerActiveValue(p, counter) >= 0 ? `+${getPlayerActiveValue(p, counter)}` : getPlayerActiveValue(p, counter)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PERSISTENT ACTION RESET BUTTONS AT BOTTOM OF SIDEBAR */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <button 
              onClick={resetGame}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black hover:bg-white/90 active:scale-95 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
            >
              <RotateCcw size={12} /> Reset Board
            </button>
            <div className="text-center">
              <span className="text-[6px] font-black uppercase tracking-[0.2em] opacity-25">Tournament Operations Active</span>
            </div>
          </div>
        </aside>

        {/* SIDEBAR FOR LANDSCAPE SHORT DEVICE ORIENTATION (OFF-CENTER) */}
        <aside className="hidden landscape:short:flex border-l border-white/5 p-4 flex-col gap-4 overflow-y-auto bg-black/50">
           <div className="flex flex-col gap-2">
              <CompactPlayerHeader 
                player={1} 
                counter={player1Counter} 
                value={getPlayerActiveValue(1, player1Counter)}
                isActive={currentPlayer === 1 && gameStatus === 'playing'} 
                isRevealed={gameStatus === 'revealed'}
              />
              <CompactPlayerHeader 
                player={2} 
                counter={player2Counter} 
                value={getPlayerActiveValue(2, player2Counter)}
                isActive={currentPlayer === 2 && gameStatus === 'playing'} 
                isRevealed={gameStatus === 'revealed'}
              />
              {playerCount >= 3 && (
                <CompactPlayerHeader 
                  player={3} 
                  counter={player3Counter} 
                  value={getPlayerActiveValue(3, player3Counter)}
                  isActive={currentPlayer === 3 && gameStatus === 'playing'} 
                  isRevealed={gameStatus === 'revealed'}
                />
              )}
              {playerCount >= 4 && (
                <CompactPlayerHeader 
                  player={4} 
                  counter={player4Counter} 
                  value={getPlayerActiveValue(4, player4Counter)}
                  isActive={currentPlayer === 4 && gameStatus === 'playing'} 
                  isRevealed={gameStatus === 'revealed'}
                />
              )}
              {playerCount >= 5 && (
                <CompactPlayerHeader 
                  player={5} 
                  counter={player5Counter} 
                  value={getPlayerActiveValue(5, player5Counter)}
                  isActive={currentPlayer === 5 && gameStatus === 'playing'} 
                  isRevealed={gameStatus === 'revealed'}
                />
              )}
              {playerCount >= 6 && (
                <CompactPlayerHeader 
                  player={6} 
                  counter={player6Counter} 
                  value={getPlayerActiveValue(6, player6Counter)}
                  isActive={currentPlayer === 6 && gameStatus === 'playing'} 
                  isRevealed={gameStatus === 'revealed'}
                />
              )}
           </div>
           <div className="mt-auto flex flex-col gap-2">
              <button 
                onClick={resetGame}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white text-black rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                <RotateCcw size={10} /> Reset
              </button>
           </div>
        </aside>
      </div>

      {/* COMPACT LOW-PROFILE FOOTER */}
      <footer className="h-[var(--f-height)] lg:h-[var(--f-height-lg)] shrink-0 border-t border-white/5 bg-black/60 backdrop-blur-xl flex items-center justify-between px-6 sm:px-8 relative z-50 transition-all duration-300">
         <div className="text-[6px] lg:text-[7px] font-black uppercase tracking-[0.4em] opacity-20 italic">VOID_STRAT SYSTEM</div>
         <div className="flex items-center gap-4">
            <span className="text-[6px] lg:text-[7px] font-black uppercase tracking-[0.2em] opacity-10">© 2024</span>
            <div className="w-1 h-1 bg-white/10 rounded-full" />
            <span className="text-[6px] lg:text-[7px] font-black uppercase tracking-[0.2em] opacity-10 font-mono">STABLE_REL</span>
         </div>
      </footer>

      <style>{`
        @media (max-height: 500px) {
          .landscape\\:short\\:hidden { display: none !important; }
          .landscape\\:short\\:flex { display: flex !important; }
        }
        @media (min-width: 400px) and (max-width: 639px) {
           .xs\\:scale-\\[0\\.85\\] { transform: scale(0.85); }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .pulse-ring { animation: pulse-ring 2.5s infinite; }
      `}</style>
      <AnimatePresence>
        {isFormatModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFormatModalOpen(false)}
            className="fixed inset-0 z-[100] bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/10 p-5 sm:p-6 md:p-6 rounded-[2rem] w-[90vw] h-[112vw] md:w-full md:h-auto max-w-xl md:aspect-square md:max-h-[480px] md:max-w-[480px] flex flex-col justify-between shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="text-center mb-3 md:mb-4">
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase text-center">Select Format</h2>
                <p className="text-[7px] sm:text-[8px] tracking-[0.4em] font-black opacity-30 mt-1 uppercase text-center">Lobby Archive V1</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4 overflow-y-auto py-1 pr-1 flex-1">
                {BOARD_CONFIGS.filter(c => c.status === 'Active').map((config) => {
                  let title = '';
                  let pTag = `${config.players}P`;
                  
                  if (config.id === 'R6_P2') {
                    title = 'STANDARD';
                  } else if (config.id === 'R7_P3') {
                    title = 'TRIAL SHOGUN';
                  } else if (config.id === 'R6_P4') {
                    title = 'SPRINT';
                  } else if (config.id === 'R8_P5') {
                    title = 'TOURNAMENT PRO';
                  } else if (config.id === 'R10_P6') {
                    title = 'THE MARATHON';
                  } else {
                    title = config.label.replace(/^\d+P\s+/, '').toUpperCase();
                  }

                  return (
                    <button
                      key={config.id}
                      onClick={() => selectConfig(config)}
                      className="group flex flex-col justify-between p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] cursor-pointer text-left h-[82px] sm:h-[84px] md:h-[78px] select-none"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] sm:text-xs md:text-xs lg:text-sm font-black text-white uppercase italic tracking-tight truncate mr-1.5">{title}</span>
                        <span className="text-[8px] sm:text-[9.5px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md shrink-0">{pTag}</span>
                      </div>
                      <div className="w-full mt-1.5 sm:mt-2.5 flex items-end justify-between">
                        <div className="flex flex-col md:flex-row md:items-center md:gap-1.5">
                          <span className="text-[7.5px] sm:text-[9px] md:text-[9.5px] font-bold text-white/40 uppercase tracking-wider leading-none">{config.rows} Rows</span>
                          <div className="h-[1px] w-6 bg-white/10 my-[3px] md:hidden"></div>
                          <span className="hidden md:inline text-white/20 text-[9.5px] select-none">|</span>
                          <span className="text-[7.5px] sm:text-[9px] md:text-[9.5px] font-bold text-white/40 uppercase tracking-wider leading-none">{config.turnsPerPlayer} Turns</span>
                        </div>
                        <span className="text-[7px] sm:text-[8px] font-black tracking-[0.15em] text-white/15 group-hover:text-white/40 transition-colors uppercase select-none">LAUNCH</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setIsFormatModalOpen(false)}
                className="w-full mt-3 md:mt-4 py-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActiveTurnDisplay({ 
  player, 
  counter, 
  value,
  gameStatus,
  className = ""
}: { 
  player: number; 
  counter: number; 
  value: number;
  gameStatus: GameStatus;
  className?: string;
}) {
  const isPlaying = gameStatus === 'playing';
  const color = getPlayerColor(player);
  
  return (
    <motion.div 
      initial={false}
      animate={{ scale: isPlaying ? 1 : 0.95 }}
      style={isPlaying ? {
        borderColor: `${color}88`,
        backgroundColor: `${color}1A`,
        boxShadow: `0 0 20px ${color}33`
      } : {
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
      }}
      className={`
        flex items-center gap-1.5 sm:gap-3 rounded-full border transition-all duration-500 shrink-0
        ${!isPlaying ? 'text-white/40' : 'text-white'}
        ${className || 'px-2 sm:px-6 md:px-3 py-0.5 sm:py-2'}
      `}
    >
      <div className="flex flex-col items-start leading-none gap-0.5">
        <span className="text-[6px] sm:text-[8px] uppercase font-black tracking-widest opacity-60">Active Turn</span>
        <span className="text-[10px] sm:text-xs font-black italic tracking-tighter uppercase leading-tight">Player {player}</span>
      </div>
      
      <div className="h-4 sm:h-5 w-px bg-white/20" />
      
      <div className="flex flex-col items-center leading-none gap-0.5">
        <span className="text-[6px] sm:text-[8px] uppercase font-black opacity-40">Claim</span>
        <span className="text-xs sm:text-sm font-black italic tracking-tighter leading-none">#{counter}</span>
      </div>

      <div className="h-4 sm:h-5 w-px bg-white/20" />

      <div className="flex flex-col items-center leading-none gap-0.5">
        <span className="text-[6px] sm:text-[8px] uppercase font-black opacity-40">Value</span>
        <span className="text-xs sm:text-sm font-black italic tracking-tighter leading-none text-cyan-400">
          {value >= 0 ? `+${value}` : value}
        </span>
      </div>
    </motion.div>
  );
}

function CompactPlayerHeader({ 
  player, 
  counter, 
  value,
  isActive, 
  isRevealed 
}: { 
  player: number; 
  counter: number; 
  value: number;
  isActive: boolean;
  isRevealed: boolean;
}) {
  const color = getPlayerColor(player);
  return (
    <div 
      style={isActive ? {
        borderColor: `${color}88`,
        backgroundColor: `${color}1A`
      } : {}}
      className={`
        flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded-full border transition-all duration-300
        ${!isActive ? 'bg-white/5 border-white/5 opacity-40' : 'text-white'}
        ${isRevealed ? 'opacity-20 scale-90 grayscale' : 'opacity-100'}
      `}
    >
      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full flex items-center justify-center bg-black/30">
        <User size={8} className="text-white/50" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] sm:text-[12px] lg:text-[16px] font-black italic tracking-tighter leading-none">
          #{counter} ({value >= 0 ? `+${value}` : value})
        </span>
        <span className="text-[5px] uppercase font-bold opacity-30 tracking-[0.1em] hidden lg:block">P{player}</span>
      </div>
    </div>
  );
}

function CompactStandingItem({ 
  player, 
  score, 
  isWinner, 
  compact = false 
}: { 
  player: number; 
  score: number; 
  isWinner: boolean;
  compact?: boolean;
}) {
  const color = getPlayerColor(player);
  return (
    <div 
      style={isWinner ? {
        borderColor: `${color}33`,
        backgroundColor: `${color}1A`,
        boxShadow: `0 0 15px ${color}11`
      } : {}}
      className={`
        flex-1 border transition-all duration-500
        ${compact ? 'p-1 sm:px-2.5 text-center min-w-[60px] sm:min-w-[80px]' : 'p-2 sm:p-2.5 lg:p-4'}
        ${compact ? 'rounded-lg' : 'rounded-[0.8rem] sm:rounded-[1rem] lg:rounded-[1.2rem]'}
        ${isWinner ? 'opacity-100' : 'bg-white/[0.02] border-white/5 opacity-30 shadow-none'}
      `}
    >
      <div className={`font-black uppercase opacity-40 tracking-[0.1em] ${compact ? 'text-[4px] sm:text-[5px]' : 'text-[5px] sm:text-[6px] lg:text-[7px] mb-0.5'}`}>
        P{player} Sum
      </div>
      <div 
        className={`font-black italic tracking-tighter ${compact ? 'text-xs sm:text-base leading-none font-bold' : 'text-base sm:text-lg lg:text-2xl'}`}
        style={isWinner ? { color } : {}}
      >
        {score}
      </div>
    </div>
  );
}
