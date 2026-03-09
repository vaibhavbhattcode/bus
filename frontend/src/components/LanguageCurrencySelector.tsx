import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
    { code: 'en', label: 'English (US)' },
    { code: 'hi', label: 'हिंदी (IN)' },
    { code: 'es', label: 'Español (ES)' }
];

const CURRENCIES = [
    { code: 'INR', symbol: '₹' },
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' }
];

export default function LanguageCurrencySelector() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [currency, setCurrency] = useState('INR');

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors"
            >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{currentLang.code.toUpperCase()}</span>
                <span className="text-gray-300 mx-1">|</span>
                <span>{currency}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-64 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 p-4 z-50"
                        >
                            <div className="mb-4">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Language</p>
                                <div className="space-y-1">
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => changeLanguage(lang.code)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-colors ${i18n.language === lang.code
                                                    ? 'bg-primary-50 text-primary-600'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {lang.label}
                                            {i18n.language === lang.code && <Check className="h-4 w-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Currency</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {CURRENCIES.map((curr) => (
                                        <button
                                            key={curr.code}
                                            onClick={() => {
                                                setCurrency(curr.code);
                                                setIsOpen(false);
                                            }}
                                            className={`py-2 rounded-xl text-sm font-bold transition-all ${currency === curr.code
                                                    ? 'bg-gray-900 text-white shadow-md'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/50'
                                                }`}
                                        >
                                            {curr.symbol} {curr.code}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
