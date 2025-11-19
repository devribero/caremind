'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiClock, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import styles from './TimePicker.module.css';

interface TimePickerProps {
  value: string; // formato HH:MM
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  id?: string;
}

export function TimePicker({
  value,
  onChange,
  onKeyDown,
  className = '',
  ariaInvalid = false,
  ariaDescribedBy,
  id,
}: TimePickerProps) {
  const [hours, setHours] = useState(() => {
    if (value) {
      const [h] = value.split(':');
      return parseInt(h) || 0;
    }
    return 0;
  });

  const [minutes, setMinutes] = useState(() => {
    if (value) {
      const [, m] = value.split(':');
      return parseInt(m) || 0;
    }
    return 0;
  });

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincroniza o valor externo com o estado interno
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      const newHours = parseInt(h) || 0;
      const newMinutes = parseInt(m) || 0;
      if (newHours !== hours || newMinutes !== minutes) {
        setHours(newHours);
        setMinutes(newMinutes);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);


  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const updateTime = (newHours: number, newMinutes: number) => {
    setHours(newHours);
    setMinutes(newMinutes);
    const formatted = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    onChange(formatted);
  };

  const incrementHours = () => {
    const newHours = hours >= 23 ? 0 : hours + 1;
    updateTime(newHours, minutes);
  };

  const decrementHours = () => {
    const newHours = hours <= 0 ? 23 : hours - 1;
    updateTime(newHours, minutes);
  };

  const incrementMinutes = () => {
    const newMinutes = minutes + 15 >= 60 ? 0 : minutes + 15;
    updateTime(hours, newMinutes);
  };

  const decrementMinutes = () => {
    const newMinutes = minutes - 15 < 0 ? 45 : minutes - 15;
    updateTime(hours, newMinutes);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    if (val >= 0 && val <= 23) {
      updateTime(val, minutes);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    if (val >= 0 && val <= 59) {
      updateTime(hours, val);
    }
  };

  const hasValue = !!value;
  const displayText = value || 'Selecione o horário';

  return (
    <div ref={containerRef} className={`${styles.timePickerContainer} ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.timePickerButton} ${ariaInvalid ? styles.error : ''} ${isOpen ? styles.open : ''}`}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-label={hasValue ? `Selecionar horário. Atual: ${value}` : 'Selecionar horário'}
        onKeyDown={onKeyDown}
      >
        <FiClock className={styles.clockIcon} />
        <span className={`${styles.timeDisplay} ${!hasValue ? styles.placeholder : ''}`}>
          {displayText}
        </span>
      </button>

      {isOpen && (
        <div className={styles.timePickerDropdown}>
          <div className={styles.timePickerContent}>
            <div className={styles.timeSection}>
              <label className={styles.timeLabel}>Horas</label>
              <div className={styles.timeControls}>
                <button
                  type="button"
                  onClick={incrementHours}
                  className={styles.timeButton}
                  aria-label="Aumentar horas"
                >
                  <FiChevronUp />
                </button>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={handleHoursChange}
                  className={styles.timeInput}
                  aria-label="Horas"
                />
                <button
                  type="button"
                  onClick={decrementHours}
                  className={styles.timeButton}
                  aria-label="Diminuir horas"
                >
                  <FiChevronDown />
                </button>
              </div>
            </div>

            <div className={styles.timeSeparator}>:</div>

            <div className={styles.timeSection}>
              <label className={styles.timeLabel}>Minutos</label>
              <div className={styles.timeControls}>
                <button
                  type="button"
                  onClick={incrementMinutes}
                  className={styles.timeButton}
                  aria-label="Aumentar minutos"
                >
                  <FiChevronUp />
                </button>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={handleMinutesChange}
                  className={styles.timeInput}
                  aria-label="Minutos"
                />
                <button
                  type="button"
                  onClick={decrementMinutes}
                  className={styles.timeButton}
                  aria-label="Diminuir minutos"
                >
                  <FiChevronDown />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.timePickerFooter}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.confirmButton}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

