'use client';

import React, { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styles from './CompromissosCalendar.module.css';
import { Tables } from '@/types/supabase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';
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
      if (comp.data_hora) {
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

  // Função para marcar dias com compromissos
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const compromissosDoDia = compromissosPorData.get(dateKey) || [];
      
      if (compromissosDoDia.length > 0) {
        const concluidos = compromissosDoDia.filter(c => c.concluido).length;
        const pendentes = compromissosDoDia.length - concluidos;
        
        return (
          <div className={styles.tileContent}>
            {pendentes > 0 && (
              <span className={styles.dotPendente} title={`${pendentes} pendente(s)`}>
                {pendentes}
              </span>
            )}
            {concluidos > 0 && (
              <span className={styles.dotConcluido} title={`${concluidos} concluído(s)`}>
                {concluidos}
              </span>
            )}
          </div>
        );
      }
    }
    return null;
  };

  // Função para destacar dias com compromissos
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const compromissosDoDia = compromissosPorData.get(dateKey) || [];
      
      if (compromissosDoDia.length > 0) {
        const temPendentes = compromissosDoDia.some(c => !c.concluido);
        return temPendentes ? styles.dayWithPendentes : styles.dayWithConcluidos;
      }
    }
    return null;
  };

  // Compromissos do dia selecionado
  const compromissosDoDiaSelecionado = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return compromissosPorData.get(dateKey) || [];
  }, [selectedDate, compromissosPorData]);

  // Compromissos da semana atual
  const compromissosDaSemana = useMemo(() => {
    if (viewMode !== 'week' || !currentDate) return [];
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return weekDays.map(day => {
      const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      return {
        date: day,
        compromissos: compromissosPorData.get(dateKey) || []
      };
    });
  }, [viewMode, currentDate, compromissosPorData]);

  // Compromissos do mês atual
  const compromissosDoMes = useMemo(() => {
    if (viewMode !== 'month' || !currentDate) return [];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return monthDays.map(day => {
      const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      return {
        date: day,
        compromissos: compromissosPorData.get(dateKey) || []
      };
    });
  }, [viewMode, currentDate, compromissosPorData]);

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    onDateChange(date);
    if (viewMode === 'month') {
      setViewMode('day');
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const renderDayView = () => {
    if (!selectedDate) return null;
    
    return (
      <div className={styles.dayView}>
        <div className={styles.dayHeader}>
          <button onClick={() => navigateDate('prev')} className={styles.navButton}>‹</button>
          <h2 className={styles.dayTitle}>
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <button onClick={() => navigateDate('next')} className={styles.navButton}>›</button>
        </div>
        <div className={styles.compromissosList}>
          {compromissosDoDiaSelecionado.length > 0 ? (
            <div className={styles.compromissosGrid}>
              {compromissosDoDiaSelecionado
                .sort((a, b) => {
                  const timeA = new Date(a.data_hora!).getTime();
                  const timeB = new Date(b.data_hora!).getTime();
                  return timeA - timeB;
                })
                .map((comp) => {
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
                        {comp.concluido && (
                          <span className={styles.badgeConcluido}>✓ Concluído</span>
                        )}
                        {isPassado && !comp.concluido && (
                          <span className={styles.badgePassado}>Atrasado</span>
                        )}
                      </div>
                      <h4 className={styles.compromissoTitulo}>{comp.titulo}</h4>
                      {comp.descricao && (
                        <p className={styles.compromissoDescricao}>{comp.descricao}</p>
                      )}
                      {comp.local && (
                        <p className={styles.compromissoLocal}>📍 {comp.local}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className={styles.emptyDay}>
              <p>Nenhum compromisso neste dia</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className={styles.weekView}>
        <div className={styles.weekHeader}>
          <button onClick={() => navigateDate('prev')} className={styles.navButton}>‹</button>
          <h2 className={styles.weekTitle}>
            {format(compromissosDaSemana[0]?.date || currentDate, 'd MMM', { locale: ptBR })} - {format(compromissosDaSemana[compromissosDaSemana.length - 1]?.date || currentDate, 'd MMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={() => navigateDate('next')} className={styles.navButton}>›</button>
        </div>
        <div className={styles.weekGrid}>
          {compromissosDaSemana.map(({ date, compromissos }) => {
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            
            return (
              <div
                key={date.toISOString()}
                className={`${styles.weekDay} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className={styles.weekDayHeader}>
                  <span className={styles.weekDayName}>
                    {format(date, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={styles.weekDayNumber}>{format(date, 'd')}</span>
                  {compromissos.length > 0 && (
                    <span className={styles.weekDayCount}>{compromissos.length}</span>
                  )}
                </div>
                <div className={styles.weekDayCompromissos}>
                  {compromissos.slice(0, 3).map((comp) => {
                    const dataHora = new Date(comp.data_hora!);
                    return (
                      <div
                        key={comp.id}
                        className={`${styles.weekCompromissoItem} ${comp.concluido ? styles.concluido : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompromissoClick?.(comp);
                        }}
                      >
                        <span className={styles.weekCompromissoTime}>
                          {format(dataHora, 'HH:mm')}
                        </span>
                        <span className={styles.weekCompromissoTitle}>{comp.titulo}</span>
                      </div>
                    );
                  })}
                  {compromissos.length > 3 && (
                    <div className={styles.weekMoreCompromissos}>
                      +{compromissos.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className={styles.monthView}>
        <Calendar
          onChange={(value) => {
            if (value instanceof Date) {
              handleDateClick(value);
            } else if (Array.isArray(value) && value[0] instanceof Date) {
              handleDateClick(value[0]);
            }
          }}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
          className={styles.calendar}
          locale="pt-BR"
          calendarType="iso8601"
          onClickDay={handleDateClick}
        />
      </div>
    );
  };

  return (
    <div className={styles.calendarContainer}>
      {/* Toggle de visualização */}
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

      {/* Renderizar view baseada no modo */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Lista de compromissos do dia selecionado (apenas no modo mês) */}
      {viewMode === 'month' && selectedDate && compromissosDoDiaSelecionado.length > 0 && (
        <div className={styles.compromissosList}>
          <h3 className={styles.listTitle}>
            Compromissos do dia {selectedDate.toLocaleDateString('pt-BR')}
          </h3>
          <div className={styles.compromissosGrid}>
            {compromissosDoDiaSelecionado.map((comp) => {
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
                    {comp.concluido && (
                      <span className={styles.badgeConcluido}>✓ Concluído</span>
                    )}
                    {isPassado && !comp.concluido && (
                      <span className={styles.badgePassado}>Atrasado</span>
                    )}
                  </div>
                  <h4 className={styles.compromissoTitulo}>{comp.titulo}</h4>
                  {comp.descricao && (
                    <p className={styles.compromissoDescricao}>{comp.descricao}</p>
                  )}
                  {comp.local && (
                    <p className={styles.compromissoLocal}>📍 {comp.local}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {viewMode === 'month' && selectedDate && compromissosDoDiaSelecionado.length === 0 && (
        <div className={styles.emptyDay}>
          <p>Nenhum compromisso neste dia</p>
        </div>
      )}
    </div>
  );
}

