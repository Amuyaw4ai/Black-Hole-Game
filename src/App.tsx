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
  { id: 'R6_P2', rows: 6, players: 2, turnsPerPlayer: 10, status: 'Active', label: 'Standard' },
  { id: 'R6_P4', rows: 6, players: 4, turnsPerPlayer: 5, status: 'Active', label: 'Sprint' },

  // 7 Rows (28 circles, 27 playable)
  { id: 'R7_P3', rows: 7, players: 3, turnsPerPlayer: 9, status: 'Active', label: 'Standard' },
  { id: 'R7_P9', rows: 7, players: 9, turnsPerPlayer: 3, status: 'Dormant', label: 'Chaos' },

  // 8 Rows (36 circles, 35 playable)
  { id: 'R8_P5', rows: 8, players: 5, turnsPerPlayer: 7, status: 'Active', label: 'Tournament Pro' },
  { id: 'R8_P7', rows: 8, players: 7, turnsPerPlayer: 5, status: 'Dormant', label: 'Brawl' },

  // 9 Rows (45 circles, 44 playable)
  { id: 'R9_P4', rows: 9, players: 4, turnsPerPlayer: 11, status: 'Dormant', label: 'Marathon' },
  { id: 'R9_P11', rows: 9, players: 11, turnsPerPlayer: 4, status: 'Dormant', label: 'Mob' },

  // 10 Rows (55 circles, 54 playable)
  { id: 'R10_P6', rows: 10, players: 6, turnsPerPlayer: 9, status: 'Active', label: 'The Mountain' },
  { id: 'R10_P9', rows: 10, players: 9, turnsPerPlayer: 6, status: 'Dormant', label: 'Chaos' }
];

// Lobby Filtering Logic prepared for future UI
export default function App() {
  const [playerCount, setPlayerCount] = useState<number>(4);
  
  const activeConfig = useMemo(() => {
    // Select the first 'Active' config for the current player count
    return BOARD_CONFIGS.find(c => c.players === playerCount && c.status === 'Active') || 
           BOARD_CONFIGS.find(c => c.players === playerCount);
  }, [playerCount]);

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
      
    newBoard[index] = { ...newBoard[index], value: currentCounter, claimedBy: currentPlayer };
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
    setBoard(generateInitialBoard(totalRows));
    setCurrentPlayer(1);
    setPlayer1Counter(1);
    setPlayer2Counter(1);
    setPlayer3Counter(1);
    setPlayer4Counter(1);
    setPlayer5Counter(1);
    setPlayer6Counter(1);
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
    // Scale up for 4P Knife Fight (6 rows)
    const upperLimit = (playerCount === 4 && totalRows === 6) ? (containerWidth > 1024 ? 96 : 80) : baseLimit;
    
    return Math.max(16, Math.min(upperLimit, calculated));
  }, [containerHeight, containerWidth, totalRows, gameStatus, playerCount]);

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
        <div className="flex-1 flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <h1 className="text-xl lg:text-2xl font-black italic tracking-tight uppercase leading-none bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">Black Hole</h1>
            <p className="text-[7px] uppercase tracking-[0.8em] font-bold opacity-30 mt-1">V3.0 - FLEXIBLE MATRIX</p>
          </div>
          <div className="sm:hidden w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center font-black italic text-[10px]">BH</div>
        </div>

        {/* CENTER: TURN DISPLAY (Safely centered without absolute if possible, or with min-width guard) */}
        <div className="px-2 flex-none flex justify-center">
          <ActiveTurnDisplay 
            player={currentPlayer} 
            counter={
              currentPlayer === 1 ? player1Counter : 
              currentPlayer === 2 ? player2Counter : 
              currentPlayer === 3 ? player3Counter : 
              currentPlayer === 4 ? player4Counter : 
              currentPlayer === 5 ? player5Counter : player6Counter
            } 
            gameStatus={gameStatus}
          />
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="flex-1 flex items-center justify-end gap-1 sm:gap-4 h-full relative z-10 md:justify-between md:flex-wrap md:gap-4">
          <div className="flex items-center gap-1">
            <div className="hidden md:flex items-center mr-4">
              <button 
                onClick={() => setIsFormatModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-95 group shrink-0"
              >
                <Users size={14} className="text-white/40 group-hover:text-white transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">Format: {activeConfig?.label || 'Custom'}</span>
              </button>
            </div>
              
              <div className="md:hidden flex items-center px-1">
                 <button 
                  onClick={() => setIsFormatModalOpen(true)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-white/40 transition-all active:scale-95 flex items-center gap-1"
                  title="Format Selection"
                >
                  <Users size={12} />
                  <span className="text-[9px] font-black">{playerCount}P</span>
                </button>
              </div>

              <div className="w-px h-4 bg-white/10 mx-0.5" />
            </div>

          <div className="flex items-center gap-1.5 ml-2">
             <div 
              onMouseEnter={() => setShowStrategy(true)}
              onMouseLeave={() => setShowStrategy(false)}
              onClick={() => setShowStrategy(!showStrategy)}
              className={`flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-full cursor-pointer transition-all border border-white/10 relative group`}
             >
               <Info size={12} className={showStrategy ? 'text-blue-400' : 'text-white/40'} />
               <span className="hidden md:inline text-white/60">Strategy</span>
               
               {/* STRATEGY POPOVER */}
               <AnimatePresence>
                 {showStrategy && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     className="absolute top-full right-0 mt-3 w-64 p-5 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] text-left"
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
             {/* Mobile Turn Indicator */}
             <div className="flex lg:hidden items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded-full border border-white/10">
                <div className={`w-1 h-1 rounded-full ${
                  currentPlayer === 1 ? 'bg-blue-500' : 
                  currentPlayer === 2 ? 'bg-red-500' : 
                  currentPlayer === 3 ? 'bg-emerald-500' : 
                  currentPlayer === 4 ? 'bg-purple-500' : 
                  currentPlayer === 5 ? 'bg-amber-500' : 'bg-blue-400'
                } animate-pulse`} />
                <span className="text-[7px] font-black uppercase italic opacity-60">P{currentPlayer}</span>
             </div>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT GRID */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[200px_1fr] landscape:short:grid-cols-[180px_1fr] h-full relative z-10 transition-all duration-500">
        
        {/* SIDEBAR Info (Hidden on Short Landscape) */}
        <aside className="hidden lg:flex border-r border-white/5 p-6 flex-col gap-6 justify-center bg-white/[0.01]">
          <AnimatePresence mode="wait">
            {gameStatus === 'revealed' ? (
              <motion.div 
                key="scoreboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* BOLD VICTOR BADGE */}
                <div className="space-y-2">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">Resolution</h2>
                  <div className={`p-5 rounded-2xl border-2 transition-all ${isDraw ? 'bg-white/5 border-white/10 text-white' : 'bg-white text-black border-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.2)]'}`}>
                    <div className="flex items-center gap-3">
                      {!isDraw && <Trophy size={20} className="text-blue-600" />}
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-black italic uppercase tracking-tight leading-none">
                          {isDraw ? "SUDDEN DRAW" : `P${winner} VICTOR`}
                        </span>
                        {!isDraw && <span className="text-[8px] font-black opacity-40 uppercase tracking-widest mt-1.5">BEST SUM: {minScore}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* HIGH-DENSITY SCOREBOARD */}
                <div className="space-y-3">
                  <h3 className="text-[8px] font-black uppercase tracking-[0.2em] opacity-25">Tournament Tally</h3>
                  <div className="grid gap-2">
                    {[1, 2, 3, 4, 5, 6].filter(p => p <= playerCount).map(p => (
                      <div 
                        key={p} 
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${winners.includes(p) ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-white/5 opacity-40 grayscale'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            p === 1 ? 'bg-blue-500' : 
                            p === 2 ? 'bg-red-500' : 
                            p === 3 ? 'bg-emerald-500' : 
                            p === 4 ? 'bg-purple-500' : 
                            p === 5 ? 'bg-amber-500' : 'bg-blue-400'
                          } ${winners.includes(p) ? 'shadow-[0_0_10px_currentColor]' : ''}`} />
                          <span className="text-[10px] font-black tracking-wider opacity-60">PLAYER {p}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-black italic tracking-tighter">{scores[`p${p}` as keyof typeof scores]}</span>
                           {winners.includes(p) && <Trophy size={10} className="text-white/40" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="strategy-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center opacity-10 space-y-6"
              >
                <Trophy size={48} strokeWidth={1} className="mx-auto" />
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.5em]">Tournament Active</p>
                  <p className="text-[6px] font-black uppercase tracking-[0.2em] opacity-40">Tallying Data...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* SIDEBAR FOR LANDSCAPE SHORT DEVICE ORIENTATION */}
        <aside className="hidden landscape:short:flex border-r border-white/5 p-4 flex-col gap-4 overflow-y-auto">
           <div className="flex flex-col gap-2">
              <CompactPlayerHeader 
                player={1} 
                counter={player1Counter} 
                isActive={currentPlayer === 1 && gameStatus === 'playing'} 
                isRevealed={gameStatus === 'revealed'}
              />
              <CompactPlayerHeader 
                player={2} 
                counter={player2Counter} 
                isActive={currentPlayer === 2 && gameStatus === 'playing'} 
                isRevealed={gameStatus === 'revealed'}
              />
              {playerCount >= 3 && (
                <CompactPlayerHeader 
                  player={3} 
                  counter={player3Counter} 
                  isActive={currentPlayer === 3 && gameStatus === 'playing'} 
                  isRevealed={gameStatus === 'revealed'}
                />
              )}
              {playerCount >= 4 && (
                <CompactPlayerHeader 
                  player={4} 
                  counter={player4Counter} 
                  isActive={currentPlayer === 4 && gameStatus === 'playing'} 
                  isRevealed={gameStatus === 'revealed'}
                />
              )}
              {playerCount === 5 && (
                <CompactPlayerHeader 
                  player={5} 
                  counter={player5Counter} 
                  isActive={currentPlayer === 5 && gameStatus === 'playing'} 
                  isRevealed={gameStatus === 'revealed'}
                />
              )}
           </div>
           <div className="mt-auto flex flex-col gap-2">
              <button 
                onClick={() => setIsFormatModalOpen(true)}
                className="w-full py-2 bg-white/5 text-white/40 border border-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest"
              >
                Switch Player Mode
              </button>
              <button 
                onClick={resetGame}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
              >
                <RotateCcw size={12} /> Reset
              </button>
           </div>
        </aside>

        {/* PYRAMID MAIN AREA */}
        <main className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
          <AnimatePresence>
            {gameStatus === 'revealed' && (
              <motion.div 
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="absolute top-4 sm:top-6 left-2 right-2 z-40 flex items-center justify-center gap-x-4 pointer-events-none lg:hidden"
              >
                {/* LEFT WING - THE VICTOR */}
                <div className={`
                  pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all shadow-[0_20px_60px_rgba(0,0,0,0.6)] shrink-0
                  ${isDraw ? 'bg-gray-800 border-white/20 text-white' : 'bg-white border-blue-600 text-black shadow-blue-500/40'}
                `}>
                  {!isDraw && <Trophy size={18} className="text-blue-600 fill-blue-600/10" />}
                  <div className="flex flex-col leading-none">
                    <span className="text-xs sm:text-sm font-black italic tracking-tight uppercase">
                      {isDraw ? "DRAW" : `P${winner}`}
                    </span>
                  </div>
                </div>

                {/* CENTRAL ACTION HUB - PLAY AGAIN */}
                <motion.button
                  onClick={resetGame}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: 1
                  }}
                  whileTap={{ scale: 0.9 }}
                  transition={{
                    scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    opacity: { duration: 0.3 }
                  }}
                  className={`
                    pointer-events-auto w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg border-2 z-50
                    ${isDraw ? 'bg-white text-black border-white' : 
                      winner === 1 ? 'bg-blue-600 border-blue-400 shadow-blue-500/50' :
                      winner === 2 ? 'bg-red-600 border-red-400 shadow-red-500/50' :
                      winner === 3 ? 'bg-emerald-600 border-emerald-400 shadow-emerald-500/50' :
                      winner === 4 ? 'bg-purple-600 border-purple-400 shadow-purple-500/50' :
                      'bg-amber-500 border-amber-400 shadow-amber-500/50'}
                  `}
                  title="Play Again"
                >
                  <RotateCcw size={20} className="text-white fill-white/10" />
                </motion.button>

                {/* RIGHT WING - STANDINGS BADGE (Square Badge) */}
                <div className="pointer-events-auto bg-gray-800/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 shadow-2xl w-[90px] sm:w-[110px] shrink-0">
                  <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
                    {[1, 2, 3, 4, 5, 6].filter(p => p <= playerCount).map(p => (
                      <div key={p} className="flex items-center gap-1">
                         <div className={`w-1.5 h-1.5 rounded-full ${
                           p === 1 ? 'bg-blue-500' : 
                           p === 2 ? 'bg-red-500' : 
                           p === 3 ? 'bg-emerald-500' : 
                           p === 4 ? 'bg-purple-500' : 
                           p === 5 ? 'bg-amber-500' : 'bg-blue-400'
                         } ${winners.includes(p) ? 'shadow-[0_0_8px_currentColor]' : 'opacity-20'}`} />
                         <span className={`text-[10px] font-black leading-none ${winners.includes(p) ? 'text-white' : 'text-white/20'}`}>
                           {scores[`p${p}` as keyof typeof scores]}
                         </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            ref={containerRef}
            className="flex-1 w-full h-full max-h-[85vh] flex items-center justify-center overflow-hidden pt-12 sm:pt-0 relative"
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

                        const playerColor = 
                          currentPlayer === 1 ? 'rgba(37,99,235,1)' : 
                          currentPlayer === 2 ? 'rgba(239,68,68,1)' : 
                          currentPlayer === 3 ? 'rgba(16,185,129,1)' : 
                          currentPlayer === 4 ? 'rgba(147,51,234,1)' : 'rgba(245,158,11,1)';
                        
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
                              ${circle.claimedBy === 1 ? 'bg-blue-600 shadow-[0_5px_25px_rgba(37,99,235,0.4)] border-2 border-blue-400' : ''}
                              ${circle.claimedBy === 2 ? 'bg-red-600 shadow-[0_5px_25px_rgba(239,68,68,0.4)] border-2 border-red-400' : ''}
                              ${circle.claimedBy === 3 ? 'bg-emerald-600 shadow-[0_5px_25px_rgba(16,185,129,0.4)] border-2 border-emerald-400' : ''}
                              ${circle.claimedBy === 4 ? 'bg-purple-600 shadow-[0_5px_25px_rgba(147,51,234,0.4)] border-2 border-purple-400' : ''}
                              ${circle.claimedBy === 5 ? 'bg-amber-500 shadow-[0_5px_30px_rgba(245,158,11,0.6)] border-2 border-amber-300' : ''}
                              ${circle.claimedBy === 6 ? 'bg-blue-400 shadow-[0_5px_30px_rgba(96,165,250,0.6)] border-2 border-blue-200' : ''}
                              ${!circle.value && gameStatus === 'playing' ? 'bg-white/5 border border-white/10 hover:bg-white/20 active:bg-white/30 cursor-pointer shadow-inner' : ''}
                              ${circle.value === null && gameStatus !== 'playing' ? 'bg-gradient-to-br from-black via-gray-900 to-black border-2 border-dashed border-white/40 shadow-[0_0_70px_rgba(255,255,255,0.2)] pulse-ring' : ''}
                              ${!circle.value && gameStatus !== 'playing' && circle.value !== null ? 'grayscale' : ''}
                              ${isPulsing ? 'scale-110 z-20' : ''}
                              ${isScoring ? 'border-2 border-blue-500 shadow-[0_0_30px_rgba(30,144,255,1)] z-30 transition-none' : ''}
                            `}
                            style={{ 
                              width: `${circleSize}px`, 
                              height: `${circleSize}px`,
                              fontSize: `${circleSize * 0.45}px`
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
                                  className="italic drop-shadow-md z-10"
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
            className="fixed inset-0 z-[100] bg-gray-950/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gray-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black italic tracking-tight text-white uppercase italic text-center">Select Format</h2>
                <p className="text-[8px] tracking-[0.4em] font-black opacity-30 mt-2 uppercase text-center">Lobby Archive V1</p>
              </div>
              
              <div className="grid gap-4">
                {BOARD_CONFIGS.filter(c => c.status === 'Active').map((config) => (
                  <button
                    key={config.id}
                    onClick={() => selectConfig(config)}
                    className="group flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl transition-all active:scale-[0.98]"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{config.players} Players</span>
                      <span className="text-sm font-black text-white uppercase italic">{config.label}</span>
                    </div>
                    <div className="flex flex-col items-end opacity-40">
                      <span className="text-[10px] font-black uppercase tracking-widest">{config.rows} Rows</span>
                      <span className="text-[10px] font-black">{config.turnsPerPlayer} Turns</span>
                    </div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setIsFormatModalOpen(false)}
                className="w-full mt-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors"
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
  gameStatus 
}: { 
  player: number; 
  counter: number; 
  gameStatus: GameStatus;
}) {
  const isPlaying = gameStatus === 'playing';
  
  const getColors = () => {
    if (!isPlaying) return 'bg-white/5 border-white/5 opacity-40';
    if (player === 1) return 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]';
    if (player === 2) return 'bg-red-600 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
    if (player === 3) return 'bg-emerald-600 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
    if (player === 4) return 'bg-purple-600 border-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.4)]';
    return 'bg-amber-500 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]';
  };
  
  return (
    <motion.div 
      initial={false}
      animate={{ scale: isPlaying ? 1 : 0.95 }}
      className={`
        flex items-center gap-1.5 sm:gap-4 md:gap-2 px-2 sm:px-6 md:px-3 py-0.5 sm:py-2 rounded-full border transition-all duration-500
        ${getColors()}
        ${!isPlaying ? 'grayscale' : ''}
      `}
    >
      <div className="flex flex-col items-start leading-none gap-0.5">
        <span className="text-[5px] sm:text-[8px] uppercase font-black tracking-widest opacity-60">Active Turn</span>
        <span className="text-[9px] sm:text-[14px] font-black italic tracking-tighter uppercase leading-tight">Player {player}</span>
      </div>
      
      <div className="h-4 sm:h-6 w-px bg-white/20 mx-0.5 sm:mx-1" />
      
      <div className="flex flex-col items-center leading-none gap-0.5">
        <span className="text-[5px] sm:text-[8px] uppercase font-black opacity-40">Next</span>
        <span className="text-xs sm:text-xl font-black italic tracking-tighter leading-none">#{counter}</span>
      </div>
    </motion.div>
  );
}

function CompactPlayerHeader({ 
  player, 
  counter, 
  isActive, 
  isRevealed 
}: { 
  player: number; 
  counter: number; 
  isActive: boolean;
  isRevealed: boolean;
}) {
  const getColors = () => {
    if (!isActive) return 'bg-white/5 border-white/5 opacity-40';
    if (player === 1) return 'bg-blue-600 border-blue-400';
    if (player === 2) return 'bg-red-600 border-red-400';
    if (player === 3) return 'bg-emerald-600 border-emerald-400';
    if (player === 4) return 'bg-purple-600 border-purple-400';
    if (player === 5) return 'bg-amber-500 border-amber-400';
    return 'bg-blue-400 border-blue-300';
  };
  
  return (
    <div className={`
      flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded-full border transition-all duration-300
      ${getColors()}
      ${isRevealed ? 'opacity-20 scale-90 grayscale' : 'opacity-100'}
    `}>
      <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full flex items-center justify-center bg-black/30`}>
        <User size={8} className="text-white/50" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] sm:text-[12px] lg:text-[16px] font-black italic tracking-tighter leading-none">#{counter}</span>
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
  const getAccent = () => {
    if (player === 1) return 'border-blue-400/20 shadow-blue-500/10';
    if (player === 2) return 'border-red-400/20 shadow-red-500/10';
    if (player === 3) return 'border-emerald-400/20 shadow-emerald-500/10';
    if (player === 4) return 'border-purple-400/20 shadow-purple-500/10';
    if (player === 5) return 'border-amber-400/20 shadow-amber-500/10';
    return 'border-blue-300/20 shadow-blue-400/10';
  };
  return (
    <div className={`
      flex-1 border transition-all duration-500
      ${compact ? 'p-1 sm:px-2.5 text-center min-w-[60px] sm:min-w-[80px]' : 'p-2 sm:p-2.5 lg:p-4'}
      ${compact ? 'rounded-lg' : 'rounded-[0.8rem] sm:rounded-[1rem] lg:rounded-[1.2rem]'}
      ${isWinner ? `bg-white/10 ${getAccent()} shadow-lg` : 'bg-white/[0.02] border-white/5 opacity-30 shadow-none'}
    `}>
      <div className={`font-black uppercase opacity-40 tracking-[0.1em] ${compact ? 'text-[4px] sm:text-[5px]' : 'text-[5px] sm:text-[6px] lg:text-[7px] mb-0.5'}`}>
        P{player} Sum
      </div>
      <div className={`font-black italic tracking-tighter ${compact ? 'text-xs sm:text-base leading-none text-white' : 'text-base sm:text-lg lg:text-2xl'}`}>
        {score}
      </div>
    </div>
  );
}
