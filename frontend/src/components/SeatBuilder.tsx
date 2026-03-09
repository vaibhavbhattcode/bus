import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sofa, KeySquare, Plus, Trash2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export interface SeatConfig {
    id: string;
    row: number;
    col: number;
    type: 'seater' | 'sleeper' | 'blank';
    number: string;
}

interface SeatBuilderProps {
    initialLayout?: SeatConfig[];
    onSave: (layout: SeatConfig[]) => void;
}

export default function SeatBuilder({ initialLayout, onSave }: SeatBuilderProps) {
    const [rows] = useState(12);
    const [cols] = useState(5); // Typical 2+2 with aisle

    // Initialize grid with blank or existing layout
    const [grid, setGrid] = useState<SeatConfig[]>(
        initialLayout || Array.from({ length: rows * cols }).map((_, i) => ({
            id: `seat-${i}`,
            row: Math.floor(i / cols),
            col: i % cols,
            type: (i % cols === 2) ? 'blank' : 'seater', // Default Aisle in middle
            number: (i % cols === 2) ? '' : `${Math.floor(i / cols) + 1}${String.fromCharCode(65 + (i > 2 ? i - 1 : i) % cols)}`,
        }))
    );

    const [paintMode, setPaintMode] = useState<'seater' | 'sleeper' | 'blank'>('seater');
    const [isPainting, setIsPainting] = useState(false);

    // Paint a specific cell
    const handleCellApply = (row: number, col: number) => {
        setGrid(prev => prev.map(cell => {
            if (cell.row === row && cell.col === col) {
                // Only generate a number if it's becoming a functional seat
                const willHaveNumber = paintMode !== 'blank';
                const newNumber = willHaveNumber ? `${row + 1}${String.fromCharCode(65 + col)}` : '';
                return { ...cell, type: paintMode, number: newNumber };
            }
            return cell;
        }));
    };

    const handleMouseDown = (row: number, col: number) => {
        setIsPainting(true);
        handleCellApply(row, col);
    };

    const handleMouseEnter = (row: number, col: number) => {
        if (isPainting) {
            handleCellApply(row, col);
        }
    };

    const handleMouseUp = () => {
        setIsPainting(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6" onMouseLeave={handleMouseUp} onMouseUp={handleMouseUp}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <KeySquare className="text-primary-600 h-6 w-6" />
                        Interactive Seat Builder
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Design your custom bus layout by painting seats across the grid.</p>
                </div>

                <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200/50 shadow-inner">
                    <button
                        onClick={() => setPaintMode('seater')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${paintMode === 'seater' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}
                    >
                        <Sofa className="h-4 w-4" /> Seater
                    </button>
                    <button
                        onClick={() => setPaintMode('sleeper')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${paintMode === 'sleeper' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}
                    >
                        <div className="w-5 h-3 border-2 rounded-sm border-current relative"><div className="absolute right-0 top-0 w-2 h-full bg-current"></div></div> Sleeper
                    </button>
                    <button
                        onClick={() => setPaintMode('blank')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${paintMode === 'blank' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}
                    >
                        <Trash2 className="h-4 w-4" /> Erase (Aisle/Space)
                    </button>
                </div>
            </div>

            <div className="flex gap-12 overflow-x-auto pb-4 custom-scrollbar select-none">
                {/* Steering Wheel Indicator */}
                <div className="flex flex-col justify-end pb-8">
                    <div className="w-16 h-16 rounded-full border-[6px] border-gray-300 flex items-center justify-center relative shadow-inner">
                        <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
                        <div className="absolute w-1.5 h-10 bg-gray-300 rounded-full"></div>
                    </div>
                    <p className="text-center text-xs font-bold text-gray-400 mt-2 tracking-widest uppercase">Front</p>
                </div>

                {/* Grid */}
                <div
                    className="inline-grid gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                    {grid.map((cell) => (
                        <motion.div
                            layout
                            key={`${cell.row}-${cell.col}`}
                            onMouseDown={() => handleMouseDown(cell.row, cell.col)}
                            onMouseEnter={() => handleMouseEnter(cell.row, cell.col)}
                            className={`
                   ${cell.type === 'seater' ? 'w-14 h-14 bg-white border-2 border-primary-200 text-primary-700 hover:bg-primary-50 hover:border-primary-400 cursor-pointer shadow-sm' : ''}
                   ${cell.type === 'sleeper' ? 'w-14 h-24 bg-indigo-50 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer shadow-sm' : ''}
                   ${cell.type === 'blank' ? 'w-14 h-14 border border-transparent hover:bg-red-50/50 hover:border-red-200 border-dashed cursor-pointer' : ''}
                   rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-colors
                `}
                        >
                            {cell.type !== 'blank' && (
                                <>
                                    <span className="text-[10px] text-opacity-50 mb-0.5">{cell.type === 'sleeper' ? 'SL' : 'ST'}</span>
                                    {cell.number}
                                </>
                            )}
                            {cell.type === 'blank' && <span className="opacity-0 hover:opacity-100 text-red-300"><Plus className="h-4 w-4" /></span>}
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center border-t border-gray-100 pt-6">
                <div className="text-sm font-bold text-gray-500">
                    Total Capacity: <span className="text-primary-600 text-xl">{grid.filter(c => c.type !== 'blank').length}</span> Seats
                </div>
                <button
                    onClick={() => {
                        toast.success("Layout configuration saved successfully.");
                        onSave(grid);
                    }}
                    className="btn btn-primary px-8"
                >
                    Save Configuration <ArrowRight className="h-4 w-4 ml-2" />
                </button>
            </div>
        </div>
    );
}
