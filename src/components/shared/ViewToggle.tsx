'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import styles from './ViewToggle.module.css';

export type ViewMode = 'cards' | 'list';

interface ViewToggleProps {
    viewMode: ViewMode;
    onViewChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
    return (
        <div className={styles.viewToggle}>
            <button
                className={`${styles.viewButton} ${viewMode === 'cards' ? styles.active : ''}`}
                onClick={() => onViewChange('cards')}
                aria-pressed={viewMode === 'cards'}
                title="Visualizar em cards"
            >
                <LayoutGrid size={18} />
                <span className={styles.buttonText}>Cards</span>
            </button>
            <button
                className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => onViewChange('list')}
                aria-pressed={viewMode === 'list'}
                title="Visualizar em lista"
            >
                <List size={18} />
                <span className={styles.buttonText}>Lista</span>
            </button>
        </div>
    );
}
