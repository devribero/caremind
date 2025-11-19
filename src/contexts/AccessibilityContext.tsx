'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type FontSize = 'normal' | 'large' | 'extra-large';

interface AccessibilityPreferences {
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
}

interface AccessibilityContextType {
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
  setFontSize: (size: FontSize) => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'caremind_accessibility_preferences';

const defaultPreferences: AccessibilityPreferences = {
  fontSize: 'normal',
  highContrast: false,
  reducedMotion: false,
};

function loadPreferences(): AccessibilityPreferences {
  if (typeof window === 'undefined') {
    return defaultPreferences;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AccessibilityPreferences>;
      return {
        fontSize: parsed.fontSize || defaultPreferences.fontSize,
        highContrast: parsed.highContrast ?? defaultPreferences.highContrast,
        reducedMotion: parsed.reducedMotion ?? defaultPreferences.reducedMotion,
      };
    }
  } catch (error) {
    console.error('Erro ao carregar preferências de acessibilidade:', error);
  }

  return defaultPreferences;
}

function savePreferences(prefs: AccessibilityPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Erro ao salvar preferências de acessibilidade:', error);
  }
}

function applyAccessibilityClasses(prefs: AccessibilityPreferences): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;

  // Remover classes anteriores
  html.classList.remove('font-size-normal', 'font-size-large', 'font-size-extra-large');
  html.classList.remove('high-contrast');
  html.classList.remove('reduced-motion');

  // Aplicar classes baseadas nas preferências
  html.classList.add(`font-size-${prefs.fontSize}`);
  
  if (prefs.highContrast) {
    html.classList.add('high-contrast');
  }

  if (prefs.reducedMotion) {
    html.classList.add('reduced-motion');
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar preferências na inicialização
  useEffect(() => {
    const loaded = loadPreferences();
    setPreferences(loaded);
    applyAccessibilityClasses(loaded);
    setIsInitialized(true);
  }, []);

  // Aplicar classes sempre que as preferências mudarem
  useEffect(() => {
    if (isInitialized) {
      applyAccessibilityClasses(preferences);
      savePreferences(preferences);
    }
  }, [preferences, isInitialized]);

  const setFontSize = useCallback((size: FontSize) => {
    setPreferences((prev) => ({ ...prev, fontSize: size }));
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, highContrast: enabled }));
  }, []);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, reducedMotion: enabled }));
  }, []);

  const value: AccessibilityContextType = {
    fontSize: preferences.fontSize,
    highContrast: preferences.highContrast,
    reducedMotion: preferences.reducedMotion,
    setFontSize,
    setHighContrast,
    setReducedMotion,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility deve ser usado dentro de um AccessibilityProvider');
  }
  return context;
}

