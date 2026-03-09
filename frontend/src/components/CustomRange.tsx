interface CustomRangeProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export default function CustomRange({ min, max, step = 1, value, onChange, className = "" }: CustomRangeProps) {
  // Calculate percentage for background gradient
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`relative w-full h-6 flex items-center ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
      />
      <div className="w-full h-2 bg-gray-200 rounded-lg overflow-hidden relative">
        <div 
          className="h-full bg-primary-600 rounded-lg transition-all duration-100 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div 
        className="absolute h-5 w-5 bg-white border-2 border-primary-600 rounded-full shadow-md pointer-events-none transition-all duration-100 ease-out transform -translate-x-1/2 left-0"
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
}
