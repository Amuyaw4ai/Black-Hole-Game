import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, RotateCcw, Trophy, Eye, User } from 'lucide-react';

interface CircleState {
  row: number;
  col: number;
  value: number | null;
  claimedBy: 1 | 2 | null;
}

type GameStatus = 'playing' | 'finished' | 'revealed';

const TOTAL_ROWS = 6;

export default function App() {
  const initialBoard = useMemo(() => {
    const board: CircleState[] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
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
  }, []);

  const [board, setBoard] = useState<CircleState[]>(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [player1Counter, setPlayer1Counter] = useState(1);
  const [player2Counter, setPlayer2Counter] = useState(1);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');

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
      nr >= 0 && nr < TOTAL_ROWS && nc >= 0 && nc <= nr
    );
  };

  const scores = useMemo(() => {
    if (gameStatus !== 'revealed') return { p1: 0, p2: 0 };
    const blackHole = board.find(c => c.value === null);
    if (!blackHole) return { p1: 0, p2: 0 };
    const neighborCoords = getNeighbors(blackHole.row, blackHole.col);
    let p1Sum = 0;
    let p2Sum = 0;
    neighborCoords.forEach(([nr, nc]) => {
      const neighbor = board.find(c => c.row === nr && c.col === nc);
      if (neighbor && neighbor.value !== null) {
        if (neighbor.claimedBy === 1) p1Sum += neighbor.value;
        if (neighbor.claimedBy === 2) p2Sum += neighbor.value;
      }
    });
    return { p1: p1Sum, p2: p2Sum };
  }, [board, gameStatus]);

  const handleCircleClick = (index: number) => {
    if (gameStatus !== 'playing' || board[index].value !== null) return;
    const newBoard = [...board];
    const currentCounter = currentPlayer === 1 ? player1Counter : player2Counter;
    newBoard[index] = { ...newBoard[index], value: currentCounter, claimedBy: currentPlayer };
    setBoard(newBoard);
    if (currentPlayer === 1) {
      setPlayer1Counter((prev) => prev + 1);
      setCurrentPlayer(2);
    } else {
      setPlayer2Counter((prev) => prev + 1);
      setCurrentPlayer(1);
    }
  };

  const revealScores = () => setGameStatus('revealed');
  const resetGame = () => {
    setBoard(initialBoard);
    setCurrentPlayer(1);
    setPlayer1Counter(1);
    setPlayer2Counter(1);
    setGameStatus('playing');
  };

  const rows = useMemo(() => {
    const result: CircleState[][] = [];
    for (let i = 0; i < TOTAL_ROWS; i++) {
      result.push(board.filter((c) => i === c.row));
    }
    return result;
  }, [board]);

  const winner = scores.p1 < scores.p2 ? 1 : scores.p2 < scores.p1 ? 2 : 0;
  const isDraw = gameStatus === 'revealed' && scores.p1 === scores.p2;

  return (
    <div className="h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#0f172a_0%,#020202_100%)] opacity-40 pointer-events-none" />

      {/* COMPACT TOP HEADER */}
      <header className="h-20 sm:h-24 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 relative z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">Black Hole</h1>
            <p className="text-[7px] uppercase tracking-[0.4em] font-bold opacity-20 mt-1">Tourney v2</p>
          </div>
          <div className="sm:hidden w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-black italic text-xs">BH</div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6 flex-1 justify-center max-w-2xl mx-4">
          <CompactPlayerHeader 
            player={1} 
            counter={player1Counter} 
            isActive={currentPlayer === 1 && gameStatus === 'playing'} 
            isRevealed={gameStatus === 'revealed'}
          />
          
          <button 
            onClick={resetGame}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all active:scale-90 hover:rotate-180"
            id="reset-center"
          >
            <RotateCcw size={16} />
          </button>

          <CompactPlayerHeader 
            player={2} 
            counter={player2Counter} 
            isActive={currentPlayer === 2 && gameStatus === 'playing'} 
            isRevealed={gameStatus === 'revealed'}
          />
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[8px] font-bold opacity-10 uppercase tracking-widest">
          <Info size={10} />
          <span>v2.01</span>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[20%_1fr_20%] h-full relative z-10 transition-all duration-500">
        
        {/* LEFT COMPONENT (Info / Legend) */}
        <aside className="hidden lg:flex border-r border-white/5 p-6 flex-col gap-6 justify-center">
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">Strategy</h2>
            <div className="space-y-3">
              {[
                "Target neighbors of the hole.",
                "Minimize your total value.",
                "Block your opponent's low plays."
              ].map((tip, i) => (
                <div key={i} className="flex gap-3 text-[10px] text-white/40 leading-relaxed font-bold uppercase">
                  <span className="text-white/20">0{i+1}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER COMPONENT (Pyramid) */}
        <main className="flex items-center justify-center p-4 sm:p-8 relative min-h-0">
          <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center overflow-visible">
            <div className="flex flex-col items-center gap-2 sm:gap-4 relative z-10 scale-[0.75] sm:scale-90 md:scale-95 lg:scale-100 transition-transform duration-500">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 sm:gap-4">
                  {row.map((circle) => {
                    const boardIndex = board.findIndex(c => c.row === circle.row && c.col === circle.col);
                    const isBlackHole = circle.value === null;
                    
                    return (
                      <motion.button
                        key={`${circle.row}-${circle.col}`}
                        whileHover={!circle.value && gameStatus === 'playing' ? { scale: 1.1 } : {}}
                        whileTap={!circle.value && gameStatus === 'playing' ? { scale: 0.9 } : {}}
                        onClick={() => handleCircleClick(boardIndex)}
                        disabled={circle.value !== null || gameStatus !== 'playing'}
                        className={`
                          w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-base sm:text-xl font-black transition-all duration-500 relative
                          ${circle.claimedBy === 1 ? 'bg-blue-600 shadow-[0_10px_20px_rgba(37,99,235,0.3)] border-2 border-blue-400' : ''}
                          ${circle.claimedBy === 2 ? 'bg-red-600 shadow-[0_10px_20px_rgba(239,68,68,0.3)] border-2 border-red-400' : ''}
                          ${!circle.value && gameStatus === 'playing' ? 'bg-white/5 border border-white/10 hover:bg-white/20 hover:border-white/40 cursor-pointer shadow-inner' : ''}
                          ${isBlackHole && gameStatus !== 'playing' ? 'bg-gradient-to-r from-black via-gray-900 to-black border-2 border-dashed border-white/30 shadow-[0_0_80px_rgba(255,255,255,0.1)] scale-110 sm:scale-125 z-20' : ''}
                          ${!circle.value && gameStatus !== 'playing' && !isBlackHole ? 'opacity-5 scale-90 blur-sm grayscale' : ''}
                        `}
                        id={`circle-${circle.row}-${circle.col}`}
                      >
                        {isBlackHole && gameStatus !== 'playing' && (
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                            className="absolute inset-0 bg-white/10 rounded-full blur-2xl"
                          />
                        )}
                        <AnimatePresence mode="wait">
                          {circle.value && (
                            <motion.span
                              key="val"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="italic drop-shadow-md"
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

            {/* REVEAL OVERLAY */}
            <AnimatePresence>
              {gameStatus === 'finished' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-[#020202]/60 backdrop-blur-sm"
                >
                  <motion.button
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={revealScores}
                    className="flex flex-col items-center gap-4 py-8 px-12 bg-white text-black rounded-[3rem] shadow-2xl active:scale-95"
                    id="reveal-btn"
                  >
                    <div className="bg-black text-white p-5 rounded-full"><Eye size={36} /></div>
                    <div className="text-center">
                      <div className="text-2xl font-black uppercase italic tracking-tighter">Reveal Final Standings</div>
                      <p className="text-[10px] font-black opacity-30 mt-1 uppercase tracking-widest italic">Lowest Total Wins</p>
                    </div>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* RIGHT COMPONENT (Standings) */}
        <aside className="border-l border-white/5 p-6 lg:p-10 flex flex-col items-center justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            {gameStatus === 'revealed' ? (
              <motion.div 
                key="revealed"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full space-y-8"
              >
                <div className={`p-8 rounded-[2.5rem] border transition-colors ${isDraw ? 'bg-white/5 border-white/20' : 'bg-white border-white text-black'}`}>
                   <div className="flex flex-col items-center gap-4">
                     {winner !== 0 && (
                        <div className="bg-black text-white p-3 rounded-2xl animate-bounce">
                          <Trophy size={32} />
                        </div>
                     )}
                     <div className="text-center">
                       <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2 ${isDraw ? 'text-white' : 'text-black'}`}>Resolution</h3>
                       <div className="text-3xl font-black italic uppercase leading-none tracking-tighter">
                         {isDraw ? "Sudden Draw" : `P${winner} Victory`}
                       </div>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  <CompactStandingItem player={1} score={scores.p1} isWinner={winner === 1} />
                  <CompactStandingItem player={2} score={scores.p2} isWinner={winner === 2} />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.1 }}
                className="flex flex-col items-center gap-6 text-center"
              >
                <Trophy size={48} strokeWidth={1} />
                <p className="text-[10px] uppercase font-black tracking-[0.4em]">Awaiting Outcome</p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      {/* MOBILE TURN BANNER (Bottom) */}
      <div className="lg:hidden h-14 bg-black/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-center gap-8 px-8 shrink-0 relative z-50">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30 italic">Black Hole v2.01</div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${currentPlayer === 1 ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`} />
           <span className="text-[10px] font-black uppercase tracking-widest italic opacity-60">P{currentPlayer} Turn</span>
        </div>
      </div>
    </div>
  );
}

function CompactPlayerHeader({ 
  player, 
  counter, 
  isActive, 
  isRevealed 
}: { 
  player: 1 | 2; 
  counter: number; 
  isActive: boolean;
  isRevealed: boolean;
}) {
  const pColor = player === 1 ? 'blue' : 'red';
  return (
    <div className={`
      flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 rounded-full border transition-all duration-500
      ${isActive ? (player === 1 ? 'bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.4)]' : 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)]') : 'bg-white/[0.03] border-white/5'}
      ${isRevealed ? 'opacity-40 grayscale' : 'opacity-100'}
    `}>
      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-black/20 text-[10px] font-black ${isActive ? 'text-white' : 'text-white/20'}`}>
        <User size={12} />
      </div>
      <div className="flex flex-col">
        <span className={`text-xs sm:text-2xl font-black italic tracking-tighter leading-none ${isActive ? 'text-white' : 'opacity-20'}`}>#{counter}</span>
        <span className="text-[7px] sm:text-[9px] uppercase font-black opacity-30 tracking-widest hidden sm:block">Next Value</span>
      </div>
    </div>
  );
}

function CompactStandingItem({ player, score, isWinner }: { player: 1 | 2; score: number; isWinner: boolean }) {
  return (
    <div className={`p-4 rounded-3xl border transition-all duration-500 ${isWinner ? 'bg-white/10 border-white/20 scale-105 shadow-xl' : 'bg-white/[0.02] border-white/5 opacity-30 shadow-none'}`}>
      <div className="text-[8px] font-black uppercase opacity-40 mb-1 tracking-widest">Player {player}</div>
      <div className="text-2xl font-black italic tracking-tighter">{score}</div>
      <div className="text-[7px] font-bold opacity-30 mt-1 uppercase leading-none">Void Tally</div>
    </div>
  );
}
