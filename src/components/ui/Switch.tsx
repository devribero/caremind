'use client';

import { forwardRef } from 'react';
import styles from './Switch.module.css';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  disabled?: boolean;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, label, className, disabled, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy, id, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        onCheckedChange(!checked);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onCheckedChange(!checked);
      }
    };

    return (
      <div className={styles.switchContainer}>
        {label && (
          <label
            htmlFor={id}
            className={styles.label}
          >
            {label}
          </label>
        )}
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={ariaLabel || label || 'Toggle switch'}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={`${styles.switch} ${checked ? styles.switchChecked : styles.switchUnchecked} ${disabled ? styles.switchDisabled : ''} ${className || ''}`}
          {...props}
        >
          <span
            className={`${styles.switchThumb} ${checked ? styles.switchThumbChecked : styles.switchThumbUnchecked}`}
          />
        </button>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
