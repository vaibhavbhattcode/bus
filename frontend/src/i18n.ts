import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation dictionaries (in production, load these from JSON files via HttpBackend)
const resources = {
    en: {
        translation: {
            "nav": {
                "home": "Home",
                "search": "Search Routes",
                "about": "About",
                "login": "Login",
                "register": "Sign Up",
            },
            "hero": {
                "title": "Premium Intercity Travel",
                "subtitle": "Book luxury buses with real-time tracking and verified providers.",
                "searchPlaceholder": "Where to next?"
            }
        }
    },
    hi: {
        translation: {
            "nav": {
                "home": "मुख्य पृष्ठ",
                "search": "मार्ग खोजें",
                "about": "हमारे बारे में",
                "login": "लॉग इन करें",
                "register": "साइन अप करें",
            },
            "hero": {
                "title": "प्रीमियम इंटरसिटी यात्रा",
                "subtitle": "वास्तविक समय की ट्रैकिंग और सत्यापित प्रदाताओं के साथ लक्जरी बसें बुक करें।",
                "searchPlaceholder": "अगला गंतव्य?"
            }
        }
    },
    es: {
        translation: {
            "nav": {
                "home": "Inicio",
                "search": "Buscar Rutas",
                "about": "Acerca de",
                "login": "Iniciar Sesión",
                "register": "Regístrate",
            },
            "hero": {
                "title": "Viajes Interurbanos Premium",
                "subtitle": "Reserve autobuses de lujo con seguimiento en tiempo real.",
                "searchPlaceholder": "¿A dónde vas?"
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;
