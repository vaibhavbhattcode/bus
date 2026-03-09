import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface CustomDatePickerProps {
  label?: string;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  className?: string;
  wrapperClassName?: string;
  placement?: "bottom" | "bottom-start" | "bottom-end";
}

// Professional Custom Input with all props passed to ensure perfect positioning
const CustomInput = forwardRef<HTMLButtonElement, any>(({ value, onClick, placeholder, className, ...props }, ref) => (
  <button
    type="button"
    {...props}
    className={`w-full h-[44px] pl-[3rem] pr-4 rounded-xl border flex items-center text-left transition-all outline-none focus:ring-2 focus:ring-primary-500/20 active:scale-[0.98] ${className || 'bg-white border-gray-100 shadow-sm hover:border-primary-200'}`}
    onClick={onClick}
    ref={ref}
  >
    <span className={`text-[13px] font-semibold truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
      {value || placeholder}
    </span>
  </button>
));

const CustomDatePicker = ({
  label,
  selected,
  onChange,
  placeholder = "Select Date",
  minDate,
  className,
  wrapperClassName,
  placement = "bottom-start"
}: CustomDatePickerProps) => {
  
  return (
    <div className={`flex flex-col w-full ${wrapperClassName || ''}`}>
      {label && <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-primary-50/80 rounded-lg text-primary-600 z-10 pointer-events-none ring-1 ring-primary-100/50">
          <CalendarIcon className="h-3.5 w-3.5" />
        </div>
        <DatePicker
          selected={selected}
          onChange={onChange}
          minDate={minDate}
          dateFormat="dd-MM-yyyy"
          customInput={<CustomInput placeholder={placeholder} className={className} />}
          popperClassName="datepicker-popper-professional"
          popperPlacement={placement as any}
          popperModifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 6],
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 8
              },
            },
            {
              name: 'flip',
              options: {
                altBoundary: true,
                rootBoundary: 'viewport',
                padding: 8,
                fallbackPlacements: ['bottom-end', 'bottom-start'],
              },
            },
          ] as any}
          renderCustomHeader={({
            date,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-50 rounded-t-2xl">
              <span className="text-[13px] font-bold text-gray-800 tracking-tight uppercase">
                {format(date, 'MMMM yyyy')}
              </span>
              <div className="flex space-x-0.5">
                <button
                  onClick={decreaseMonth}
                  disabled={prevMonthButtonDisabled}
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-primary-600 transition-all disabled:opacity-20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={increaseMonth}
                  disabled={nextMonthButtonDisabled}
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-primary-600 transition-all disabled:opacity-20"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          formatWeekDay={(nameOfDay) => nameOfDay.substr(0, 1)}
          dayClassName={() =>
            "font-semibold text-[12px] rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all m-0.5"
          }
          calendarClassName="!font-sans !border-0 !shadow-[0_15px_45px_rgba(0,0,0,0.12)] !rounded-2xl !p-0.5 !bg-white !z-[9999]"
        />
      </div>
    </div>
  );
};

export default CustomDatePicker;
