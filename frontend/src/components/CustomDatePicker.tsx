import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export default function CustomDatePicker({ 
  selected, 
  onChange, 
  placeholder = "Select Date",
  className = "",
  minDate,
  maxDate
}: CustomDatePickerProps) {
  return (
    <div className={`relative custom-datepicker-container ${className}`}>
      <DatePicker
        selected={selected}
        onChange={onChange}
        placeholderText={placeholder}
        minDate={minDate}
        maxDate={maxDate}
        popperPlacement="bottom-start"
        customInput={<CustomInput placeholder={placeholder} />}
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="px-5 py-5 bg-white border-b border-gray-50 flex items-center justify-between rounded-t-[32px] min-h-[84px]">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 mb-1.5">
                 <div className="p-1 bg-indigo-50 rounded-md">
                    <Calendar className="h-3 w-3 text-indigo-600" />
                 </div>
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Journey Schedule</span>
              </div>
              <span className="text-base font-black text-gray-900 tracking-tight">
                {format(date, 'MMMM yyyy')}
              </span>
            </div>
            
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed group border border-gray-100 active:scale-90"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </button>
              <button
                type="button"
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed group border border-gray-100 active:scale-90"
              >
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            </div>
          </div>
        )}
      />
      
      <style>{`
        .react-datepicker-popper {
          z-index: 10000 !important;
          margin-top: 12px !important;
          margin-bottom: 12px !important;
        }
        .react-datepicker {
          font-family: inherit !important;
          border-radius: 32px !important;
          border: 1px solid #f1f5f9 !important;
          box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.2), 0 30px 60px -30px rgba(0, 0, 0, 0.1) !important;
          overflow: visible !important;
          background: white !important;
          padding: 0 !important;
          animation: calendarFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes calendarFadeIn {
          from { opacity: 0; transform: translateY(15px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .react-datepicker__triangle {
          display: none !important;
        }
        .react-datepicker__header {
          background: white !important;
          border-bottom: none !important;
          padding: 0 !important;
          border-radius: 32px 32px 0 0 !important;
        }
        .react-datepicker__month {
          margin: 1.25rem !important;
          margin-top: 0 !important;
        }
        .react-datepicker__day-names {
          padding: 1.25rem 1.75rem 0.5rem 1.75rem !important;
          display: flex;
          justify-content: space-between;
          background: white;
        }
        .react-datepicker__day-name {
          text-transform: uppercase;
          font-size: 10px !important;
          font-weight: 900 !important;
          letter-spacing: 0.15em;
          color: #94a3b8 !important;
          width: 2.6rem !important;
          margin: 0 !important;
          display: flex;
          justify-content: center;
        }
        .react-datepicker__week {
          display: flex;
          justify-content: space-between;
          padding: 0 0.5rem;
        }
        .react-datepicker__day {
          width: 2.6rem !important;
          line-height: 2.6rem !important;
          margin: 0.15rem 0 !important;
          border-radius: 14px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #475569 !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          position: relative;
        }
        .react-datepicker__day:hover:not(.react-datepicker__day--disabled) {
          background-color: #f1f5f9 !important;
          color: #4f46e5 !important;
          transform: scale(1.1);
          z-index: 10;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background: #4f46e5 !important;
          color: white !important;
          font-weight: 900 !important;
          box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.5) !important;
          transform: scale(1.1) translateY(-2px) !important;
          z-index: 20;
        }
        .react-datepicker__day--today {
          color: #4f46e5 !important;
          background: #eef2ff !important;
          font-weight: 900 !important;
        }
        .react-datepicker__day--today::after {
          content: "";
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 3px;
          background: #4f46e5;
          border-radius: 50%;
        }
        .react-datepicker__day--selected.react-datepicker__day--today::after {
          background: white;
        }
        .react-datepicker__day--outside-month {
          color: #cbd5e1 !important;
          opacity: 0.4;
        }
        .react-datepicker__day--disabled {
          color: #e2e8f0 !important;
          cursor: not-allowed !important;
          background: transparent !important;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

const CustomInput = forwardRef(({ value, onClick, placeholder }: any, ref: any) => (
  <motion.button
    ref={ref}
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.98 }}
    type="button"
    onClick={onClick}
    className="group w-full h-[54px] px-6 rounded-[22px] bg-white border-2 border-gray-100/80 hover:border-indigo-500/30 flex items-center justify-between text-left transition-all duration-300 outline-none hover:shadow-xl hover:shadow-indigo-500/5 focus:ring-4 focus:ring-indigo-500/10"
  >
    <div className="flex items-center gap-4">
      <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        <Calendar className="w-4 h-4" />
      </div>
      <span className={`text-sm font-black tracking-tight ${value ? 'text-gray-900' : 'text-gray-400'}`}>
        {value || placeholder}
      </span>
    </div>
  </motion.button>
));

CustomInput.displayName = 'CustomDatePickerInput';
