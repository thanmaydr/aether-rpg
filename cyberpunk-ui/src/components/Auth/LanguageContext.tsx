import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Language = 'en' | 'hi';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple dictionary for static UI elements
// In a real app, this would be in separate JSON files
const translations: Record<Language, Record<string, string>> = {
    en: {
        'nav.dashboard': 'DASHBOARD',
        'nav.quests': 'QUESTS',
        'nav.squads': 'SQUADS',
        'nav.puzzles': 'PUZZLES',
        'profile.title': 'OPERATIVE_PROFILE',
        'profile.tabs.achievements': 'ACHIEVEMENTS',
        'profile.tabs.settings': 'SETTINGS',
        'profile.tabs.operatives': 'OPERATIVES',
        'settings.language': 'INTERFACE_LANGUAGE',
        'settings.language.desc': 'Select your preferred neural interface language',
        'quest.uplink': 'UPLINK_ESTABLISHED',
        'quest.archives': 'ARCHIVES',
        'quest.input.placeholder': 'Explain the concept to the Guardian...',
        'quest.sending': 'TRANSMITTING',
        'quest.stable': 'STABLE',
    },
    hi: {
        'nav.dashboard': 'डैशबोर्ड',
        'nav.quests': 'क्वेस्ट्स',
        'nav.squads': 'दस्ते (SQUADS)',
        'nav.puzzles': 'पहेलियाँ',
        'profile.title': 'ऑपरेटिव प्रोफाइल',
        'profile.tabs.achievements': 'उपलब्धियाँ',
        'profile.tabs.settings': 'सेटिंग्स',
        'profile.tabs.operatives': 'ऑपरेटिव्स',
        'settings.language': 'इंटरफ़ेस भाषा',
        'settings.language.desc': 'अपनी पसंदीदा भाषा चुनें',
        'quest.uplink': 'संपर्क स्थापित',
        'quest.archives': 'अभिलेखागार',
        'quest.input.placeholder': 'गार्जियन को अवधारणा समझाएं...',
        'quest.sending': 'भेजा जा रहा है',
        'quest.stable': 'स्थिर',
    }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
        const stored = localStorage.getItem('language');
        return (stored === 'en' || stored === 'hi') ? stored : 'en';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
