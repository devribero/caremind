'use client';

import React, { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styles from './CompromissosCalendar.module.css';
import { Tables } from '@/types/supabase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Compromisso = Tables<'compromissos'>;
type ViewMode = 'month' | 'week' | 'day';

interface CompromissosCalendarProps {
  compromissos: Compromisso[];
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  onCompromissoClick?: (compromisso: Compromisso) => void;
}

export default function CompromissosCalendar({
  compromissos,
  selectedDate,
  onDateChange,
  onCompromissoClick,
}: CompromissosCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  // Criar um mapa de datas para compromissos
  const compromissosPorData = useMemo(() => {
    const map = new Map<string, Compromisso[]>();
    compromissos.forEach((comp) => {
      if (comp && comp.data_hora) {
        const date = new Date(comp.data_hora);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(comp);
      }
    });
    return map;
  }, [compromissos]);

  const getDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  // Função para marcar dias com compromissos
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    
    const compromissosDoDia = compromissosPorData.get(getDateKey(date)) || [];
    if (compromissosDoDia.length === 0) return null;

    const concluidos = compromissosDoDia.filter(c => c.concluido).length;
    const pendentes = compromissosDoDia.length - concluidos;

    return (
      <div className={styles.tileContent}>
        {pendentes > 0 && (
          <span className={styles.dotPendente}>{pendentes}</span>
        )}
        {concluidos > 0 && (
          <span className={styles.dotConcluido}>{concluidos}</span>
        )}
      </div>
    );
  };

  // Função para destacar dias com compromissos
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    
    const compromissosDoDia = compromissosPorData.get(getDateKey(date)) || [];
    if (compromissosDoDia.length === 0) return null;

    const temPendentes = compromissosDoDia.some(c => !c.concluido);
    return temPendentes ? styles.dayWithPendentes : styles.dayWithConcluidos;
  };

  // Compromissos do dia selecionado
  const compromissosDoDiaSelecionado = useMemo(() => {
    if (!selectedDate) return [];
    return compromissosPorData.get(getDateKey(selectedDate)) || [];
  }, [selectedDate, compromissosPorData]);

  // Compromissos da semana atual
  const compromissosDaSemana = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return weekDays.map(day => ({
      date: day,
      compromissos: compromissosPorData.get(getDateKey(day)) || []
    }));
  }, [currentDate, compromissosPorData]);

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    onDateChange(date);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const delta = direction === 'next' ? 1 : -1;

    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + delta);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (delta * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + delta);
    }
    
    setCurrentDate(newDate);
    onDateChange(newDate);
  };

  const renderCompromissoItem = (comp: Compromisso) => {
    const dataHora = new Date(comp.data_hora!);
    const isPassado = dataHora < new Date();

    return (
      <div
        key={comp.id}
        className={`${styles.compromissoItem} ${comp.concluido ? styles.concluido : ''} ${isPassado && !comp.concluido ? styles.passado : ''}`}
        onClick={() => onCompromissoClick?.(comp)}
      >
        <div className={styles.compromissoHeader}>
          <span className={styles.compromissoTime}>
            {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {comp.concluido && <span className={styles.badgeConcluido}>✓</span>}
          {isPassado && !comp.concluido && <span className={styles.badgePassado}>!</span>}
        </div>
        <h4 className={styles.compromissoTitulo}>{comp.titulo}</h4>
        {comp.descricao && <p className={styles.compromissoDescricao}>{comp.descricao}</p>}
        {comp.local && <p className={styles.compromissoLocal}>📍 {comp.local}</p>}
      </div>
    );
  };

  const renderDayView = () => {
    const dateToShow = selectedDate || currentDate;

    return (
      <div className={styles.dayView}>
        <div className={styles.dayHeader}>
          <button onClick={() => navigateDate('prev')} className={styles.navButton}>‹</button>
          <h2 className={styles.dayTitle}>
            {format(dateToShow, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
          <button onClick={() => navigateDate('next')} className={styles.navButton}>›</button>
        </div>
        <div className={styles.compromissosGrid}>
          {compromissosDoDiaSelecionado.length > 0 ? (
            compromissosDoDiaSelecionado
              .sort((a, b) => new Date(a.data_hora!).getTime() - new Date(b.data_hora!).getTime())
              .map(renderCompromissoItem)
          ) : (
            <div className={styles.emptyDay}>
              <p>Nenhum compromisso neste dia</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => (
    <div className={styles.weekView}>
      <div className={styles.weekHeader}>
        <button onClick={() => navigateDate('prev')} className={styles.navButton}>‹</button>
        <h2 className={styles.weekTitle}>
          {format(compromissosDaSemana[0].date, 'd MMM', { locale: ptBR })} - {format(compromissosDaSemana[6].date, 'd MMM', { locale: ptBR })}
        </h2>
        <button onClick={() => navigateDate('next')} className={styles.navButton}>›</button>
      </div>
      <div className={styles.weekGrid}>
        {compromissosDaSemana.map(({ date, compromissos: comps }) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = selectedDate && isSameDay(date, selectedDate);

          return (
            <div
              key={date.toISOString()}
              className={`${styles.weekDay} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleDateClick(date)}
            >
              <div className={styles.weekDayHeader}>
                <span className={styles.weekDayName}>{format(date, 'EEE', { locale: ptBR })}</span>
                <span className={styles.weekDayNumber}>{format(date, 'd')}</span>
                {comps.length > 0 && <span className={styles.weekDayCount}>{comps.length}</span>}
              </div>
              <div className={styles.weekDayCompromissos}>
                {comps.slice(0, 2).map((comp) => (
                  <div
                    key={comp.id}
                    className={`${styles.weekCompromissoItem} ${comp.concluido ? styles.concluido : ''}`}
                    onClick={(e) => { e.stopPropagation(); onCompromissoClick?.(comp); }}
                  >
                    <span className={styles.weekCompromissoTime}>{format(new Date(comp.data_hora!), 'HH:mm')}</span>
                    <span className={styles.weekCompromissoTitle}>{comp.titulo}</span>
                  </div>
                ))}
                {comps.length > 2 && (
                  <div className={styles.weekMoreCompromissos}>+{comps.length - 2} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMonthView = () => (
    <div className={styles.monthView}>
      <Calendar
        onChange={(value) => {
          if (value instanceof Date) {
            handleDateClick(value);
          } else if (Array.isArray(value) && value[0] instanceof Date) {
            handleDateClick(value[0]);
          }
        }}
        value={selectedDate || currentDate}
        tileContent={tileContent}
        tileClassName={tileClassName}
        className={styles.calendar}
        locale="pt-BR"
        calendarType="iso8601"
      />
    </div>
  );

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.viewToggle}>
        <button
          className={`${styles.viewButton} ${viewMode === 'month' ? styles.viewButtonActive : ''}`}
          onClick={() => setViewMode('month')}
        >
          📅 Mês
        </button>
        <button
          className={`${styles.viewButton} ${viewMode === 'week' ? styles.viewButtonActive : ''}`}
          onClick={() => setViewMode('week')}
        >
          📆 Semana
        </button>
        <button
          className={`${styles.viewButton} ${viewMode === 'day' ? styles.viewButtonActive : ''}`}
          onClick={() => {
            setViewMode('day');
            if (!selectedDate) {
              const today = new Date();
              setCurrentDate(today);
              onDateChange(today);
            }
          }}
        >
          📋 Dia
        </button>
      </div>

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Lista de compromissos abaixo do calendário no modo mês */}
      {viewMode === 'month' && selectedDate && (
        <div className={styles.compromissosList}>
          <h3 className={styles.listTitle}>
            {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className={styles.compromissosGrid}>
            {compromissosDoDiaSelecionado.length > 0 ? (
              compromissosDoDiaSelecionado
                .sort((a, b) => new Date(a.data_hora!).getTime() - new Date(b.data_hora!).getTime())
                .map(renderCompromissoItem)
            ) : (
              <div className={styles.emptyDay}>
                <p>Nenhum compromisso neste dia</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
