import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, RotateCcw } from 'lucide-react';

interface CircleState {
  row: number;
  col: number;
  value: number | null;
  claimedBy: 1 | 2 | null;
}

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

  const emptyCirclesCount = board.filter((c) => c.value === null).length;
  const isGameOver = emptyCirclesCount === 1;

  const handleCircleClick = (index: number) => {
    if (isGameOver || board[index].value !== null) return;

    const newBoard = [...board];
    const currentCounter = currentPlayer === 1 ? player1Counter : player2Counter;

    newBoard[index] = {
      ...newBoard[index],
      value: currentCounter,
      claimedBy: currentPlayer,
    };

    setBoard(newBoard);

    if (currentPlayer === 1) {
      setPlayer1Counter((prev) => prev + 1);
      setCurrentPlayer(2);
    } else {
      setPlayer2Counter((prev) => prev + 1);
      setCurrentPlayer(1);
    }
  };

  const resetGame = () => {
    setBoard(initialBoard);
    setCurrentPlayer(1);
    setPlayer1Counter(1);
    setPlayer2Counter(1);
  };

  // Group board into rows for rendering
  const rows = useMemo(() => {
    const result: CircleState[][] = [];
    for (let i = 0; i < TOTAL_ROWS; i++) {
      result.push(board.filter((c) => c.row === i));
    }
    return result;
  }, [board]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tighter mb-2 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent uppercase italic">
          Black Hole
        </h1>
        <p className="text-white/40 text-sm font-medium tracking-widest uppercase">
          Pyramid Strategy Game
        </p>
      </div>

      {/* Game Info Bar */}
      <div className="w-full max-w-xl grid grid-cols-3 gap-4 mb-12">
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${currentPlayer === 1 ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'bg-white/5 border-white/10'}`}>
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">Player 1</div>
          <div className="text-2xl font-black italic">#{player1Counter}</div>
        </div>

        <div className="flex flex-col items-center justify-center">
          {isGameOver ? (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="bg-white text-black p-3 rounded-full hover:bg-white/90 transition-colors"
                id="reset-button"
            >
              <RotateCcw size={20} />
            </motion.button>
          ) : (
             <div className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40 text-center">
                Turn<br />
                <span className={currentPlayer === 1 ? 'text-blue-500' : 'text-red-500'}>
                  Player {currentPlayer}
                </span>
             </div>
          )}
        </div>

        <div className={`p-4 rounded-2xl border text-right transition-all duration-300 ${currentPlayer === 2 ? 'bg-red-600/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10'}`}>
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">Player 2</div>
          <div className="text-2xl font-black italic">#{player2Counter}</div>
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-col items-center gap-4 py-8 relative">
        {/* Background decorative glow */}
        <div className="absolute inset-0 bg-blue-500/5 blur-[100px] pointer-events-none" />
        
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {row.map((circle) => {
              const boardIndex = board.findIndex(c => c.row === circle.row && c.col === circle.col);
              const isBlackHole = isGameOver && circle.value === null;
              
              return (
                <motion.button
                  key={`${circle.row}-${circle.col}`}
                  whileHover={!circle.value && !isGameOver ? { scale: 1.1 } : {}}
                  whileTap={!circle.value && !isGameOver ? { scale: 0.9 } : {}}
                  onClick={() => handleCircleClick(boardIndex)}
                  disabled={circle.value !== null || isGameOver}
                  className={`
                    w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl font-black transition-all duration-300
                    ${circle.claimedBy === 1 ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] border-2 border-blue-400' : ''}
                    ${circle.claimedBy === 2 ? 'bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] border-2 border-red-400' : ''}
                    ${!circle.value && !isGameOver ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 cursor-pointer' : ''}
                    ${isBlackHole ? 'bg-transparent border-2 border-dashed border-white/20 animate-pulse' : ''}
                    ${!circle.value && isGameOver && !isBlackHole ? 'bg-white/5 border border-white/5' : ''}
                    disabled:cursor-default
                  `}
                  id={`circle-${circle.row}-${circle.col}`}
                >
                  <AnimatePresence mode="wait">
                    {circle.value && (
                      <motion.span
                        key="value"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="italic"
                      >
                        {circle.value}
                      </motion.span>
                    )}
                    {isBlackHole && (
                      <motion.div
                        key="hole"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-4 h-4 bg-black rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / Status */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="mt-12 p-6 bg-white rounded-3xl text-black flex items-center gap-4 shadow-2xl"
          >
            <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">!</div>
            <div>
              <div className="font-black italic text-xl uppercase leading-none">Game Over</div>
              <div className="text-black/60 text-xs font-medium tracking-tight mt-1">The Black Hole has been isolated.</div>
            </div>
            <button 
              onClick={resetGame}
              className="ml-4 px-6 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-black/80 transition-colors"
                id="play-again-button"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-12 flex items-center gap-2 text-white/20 text-[10px] font-bold uppercase tracking-widest leading-none">
        <Info size={12} />
        Last circle remaining becomes the Black Hole
      </div>
    </div>
  );
}
