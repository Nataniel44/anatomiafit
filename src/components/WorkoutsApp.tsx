import React, { useState, useMemo, useEffect } from 'react';
import rawExercises from '../data/exercises_raw.json';
import { translateCategory, translateLevel, translateEquipment, translateMuscle } from '../data/exercises';
import { pb, getCurrentUser } from '../lib/pb';

interface Exercise {
  id: string;
  nombre: string;
  nombre_en?: string;
  fuerza: string;
  nivel: string;
  'mecánico': string | null;
  equipo: string | null;
  'músculos primarios': string[];
  'músculossecundarios'?: string[];
  'músculos secundarios'?: string[];
  instrucciones: string[];
  categoría: string;
  imágenes: string[];
}

interface Routine {
  id: string;
  name: string;
  muscles: string[];
  exercises: string[];
  exerciseNames: string[];
  createdAt: string;
  intensity: string;
  duration: number;
  scheduledDays: string[];
  weeklySchedule: WeekSchedule[];
  lastCompleted?: string;
}

const DAYS_SHORT_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_SHORT_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const muscleGroups = [
  { id: 'pecho', name: 'Pecho', icon: 'fitness_center', color: 'from-blue-500 to-cyan-500' },
  { id: 'espalda', name: 'Espalda', icon: 'accessibility', color: 'from-emerald-500 to-teal-500' },
  { id: 'hombros', name: 'Hombros', icon: 'sports_gymnastics', color: 'from-orange-500 to-amber-500' },
  { id: 'biceps', name: 'Bíceps', icon: 'front_hand', color: 'from-purple-500 to-pink-500' },
  { id: 'triceps', name: 'Tríceps', icon: 'sports_mma', color: 'from-red-500 to-rose-500' },
  { id: 'piernas', name: 'Piernas', icon: 'directions_run', color: 'from-yellow-400 to-orange-400' },
  { id: 'core', name: 'Abs', icon: 'self_improvement', color: 'from-indigo-500 to-blue-500' },
];

const DAY_KEYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface DayStatus {
  completed: boolean;
  skipped: boolean;
  routineId: string | null;
  completedAt?: string;
}

interface WeekSchedule {
  weekStart: string;
  days: Record<string, DayStatus>;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(date: Date, idioma: 'es' | 'en'): string {
  const start = new Date(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString(idioma === 'es' ? 'es-ES' : 'en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString(idioma === 'es' ? 'es-ES' : 'en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

function getTodayDayKey(): string {
  const today = new Date().getDay();
  const dayMap: Record<number, string> = {
    0: 'Dom',
    1: 'Lun',
    2: 'Mar',
    3: 'Mié',
    4: 'Jue',
    5: 'Vie',
    6: 'Sáb'
  };
  return dayMap[today] || 'Lun';
}

export default function WorkoutsApp() {
  const [idioma, setIdioma] = useState<'es' | 'en'>('es');
  const [view, setView] = useState<'main' | 'create' | 'preview' | 'history'>('main');
  const [viewingRoutine, setViewingRoutine] = useState<Routine | null>(null);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  
  const [selectedMuscles, setSelectedMuscles] = useState<Set<string>>(new Set());
  const [generatedRoutine, setGeneratedRoutine] = useState<Exercise[]>([]);
  const [savedRoutines, setSavedRoutines] = useState<Routine[]>([]);
  
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showDaySelector, setShowDaySelector] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [routineDuration, setRoutineDuration] = useState(45);
  const [routineIntensity, setRoutineIntensity] = useState('Intermedio');
  
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [weekSchedules, setWeekSchedules] = useState<Record<string, Record<string, DayStatus>>>({});
  
  const exercises = useMemo(() => rawExercises as Exercise[], []);

  const fetchRoutines = async () => {
    console.log('fetchRoutines called');
    console.log('localStorage myRoutines:', localStorage.getItem('myRoutines'));
    
    try {
      const user = getCurrentUser();
      console.log('Current user:', user);
      if (user) {
        const records = await pb.collection('routines').getFullList({
          filter: `user = "${user.id}"`,
          sort: '-created',
        });
        
        console.log('Records from PB:', records);
        
        console.log('=== RAW RECORDS ===');
        records.forEach(r => {
          console.log(`ID: ${r.id}, Name: ${r.name}`);
          console.log('  weeklySchedule:', JSON.stringify(r.weeklySchedule));
        });
        
        const mapped = records.map(r => ({
          id: r.id,
          name: r.name || '',
          muscles: r.muscles || [],
          exercises: r.exercises || [],
          exerciseNames: r.exerciseNames || [],
          createdAt: r.created,
          intensity: r.intensity || 'Intermedio',
          scheduledDays: r.scheduledDays || [],
          duration: r.duration || 45,
          weeklySchedule: r.weeklySchedule || []
        }));
        setSavedRoutines(mapped as Routine[]);
        console.log('Mapped routines:', mapped);
        
        if (!mapped.length) {
          console.log('No routines, skipping schedule build');
          setWeekSchedules({});
          return;
        }
        
        const schedules: Record<string, Record<string, DayStatus>> = {};
        mapped.forEach(r => {
          console.log('=== Processing routine ===', r.id, r.name);
          if (r.weeklySchedule && r.weeklySchedule.length > 0) {
            r.weeklySchedule.forEach((ws: WeekSchedule) => {
              console.log('--- WeekStart:', ws.weekStart, 'Days keys:', Object.keys(ws.days || {}));
              if (!schedules[ws.weekStart]) {
                schedules[ws.weekStart] = {};
              }
              Object.keys(ws.days || {}).forEach(day => {
                const dayStatus = ws.days[day];
                const storedRoutineId = dayStatus?.routineId?.trim();
                const currentId = r.id.trim();
                console.log(`Day ${day}: routineId="${storedRoutineId}" (len=${storedRoutineId?.length}) vs r.id="${currentId}" (len=${currentId.length}) => match: ${storedRoutineId === currentId}`);
                if (storedRoutineId === currentId) {
                  schedules[ws.weekStart][day] = dayStatus;
                  console.log(`  -> ADDED ${day} to schedules[${ws.weekStart}]`);
                }
              });
            });
          }
        });
        console.log('Final schedules:', schedules);
        setWeekSchedules(schedules);
        return;
      }
    } catch (e) {
      console.error("Error loading from PB", e);
    }
    
    const local = localStorage.getItem('myRoutines');
    console.log('Loading from localStorage:', local);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        console.log('Parsed from localStorage:', parsed);
        setSavedRoutines(parsed);
        
        const schedules: Record<string, Record<string, DayStatus>> = {};
        parsed.forEach((r: Routine) => {
          if (r.weeklySchedule && r.weeklySchedule.length > 0) {
            r.weeklySchedule.forEach((ws: WeekSchedule) => {
              if (!schedules[ws.weekStart]) {
                schedules[ws.weekStart] = {};
              }
              Object.keys(ws.days || {}).forEach(day => {
                const dayStatus = ws.days[day];
                if (dayStatus?.routineId?.trim() === r.id.trim()) {
                  schedules[ws.weekStart][day] = dayStatus;
                }
              });
            });
          }
        });
        console.log('Loaded schedules from localStorage:', schedules);
        setWeekSchedules(schedules);
      } catch (e) {
        console.error('Error parsing localStorage', e);
      }
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    let isMounted = true;
    const handleClickOutside = (e: MouseEvent) => {
      if (!isMounted) return;
      const target = e.target as HTMLElement;
      if (!target.closest('[data-day-selector]')) {
        setShowDaySelector(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    isMounted = false;
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMuscle = (id: string) => {
    const newSet = new Set(selectedMuscles);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMuscles(newSet);
  };

  const toggleDay = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newDays);
  };

  const getExercisesForMuscles = (muscles: string[], count = 6) => {
    const selectedExs: Exercise[] = [];
    muscles.forEach(muscle => {
      let keywords: string[] = [];
      switch(muscle) {
        case 'pecho': keywords = ['pecho', 'pectoral']; break;
        case 'espalda': keywords = ['espalda', 'lats', 'dorsal', 'trapecio', 'romboides']; break;
        case 'hombros': keywords = ['deltoides', 'hombro', 'tríceps']; break;
        case 'biceps': keywords = ['bíceps', 'bicep']; break;
        case 'triceps': keywords = ['tríceps', 'tricep']; break;
        case 'piernas': keywords = ['cuádriceps', 'cuadríceps', 'isquiotibiales', 'glúteos', 'gemelos', 'pantorrilla', 'femoral']; break;
        case 'core': keywords = ['abdominales', 'abs', 'abdomen', 'espalda baja', 'lumbar']; break;
      }
      
      const filtered = exercises.filter(ex => {
        const primary = (ex['músculos primarios'] || []).map(m => m.toLowerCase());
        const secondary = (ex['músculossecundarios'] || ex['músculos secundarios'] || []).map(m => m.toLowerCase());
        const allMuscles = [...primary, ...secondary];
        return keywords.some(k => allMuscles.some(m => m.includes(k)));
      });
      selectedExs.push(...filtered.slice(0, Math.ceil(count / muscles.length)));
    });
    
    const unique = selectedExs.filter((ex, i, arr) => arr.findIndex(e => e.id === ex.id) === i);
    return unique.sort(() => Math.random() - 0.5).slice(0, count);
  };

  const handleGenerate = () => {
    if (selectedMuscles.size === 0) return;
    const routine = getExercisesForMuscles(Array.from(selectedMuscles), 8);
    setGeneratedRoutine(routine);
    setView('preview');
  };

  const handleRegenerate = () => {
    const routine = getExercisesForMuscles(Array.from(selectedMuscles), 8);
    setGeneratedRoutine(routine);
  };

  const saveRoutine = async () => {
    console.log('=== SAVE ROUTINE CALLED ===');
    console.log('selectedDays:', selectedDays);
    console.log('currentWeekStart:', currentWeekStart.toISOString());
    
    const user = getCurrentUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    console.log('weekStartKey:', weekStartKey);
    
    const weekSchedule: WeekSchedule = {
      weekStart: weekStartKey,
      days: {}
    };
    
    selectedDays.forEach(day => {
      weekSchedule.days[day] = {
        completed: false,
        skipped: false,
        routineId: 'temp'
      };
      console.log('Adding day to weekSchedule:', day);
    });

    const payload = {
      name: routineName || `Rutina de ${Array.from(selectedMuscles).map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}`,
      muscles: Array.from(selectedMuscles),
      exercises: generatedRoutine.map(e => e.id),
      exerciseNames: generatedRoutine.map(e => e.nombre),
      intensity: routineIntensity,
      scheduledDays: selectedDays,
      duration: routineDuration,
      weeklySchedule: [weekSchedule],
      user: user.id
    };
    
    try {
      console.log('Creating record in PB...');
      const record = await pb.collection('routines').create(payload);
      console.log('Record created:', record);
      
      const newSchedule: WeekSchedule = {
        weekStart: weekStartKey,
        days: {}
      };
      selectedDays.forEach(day => {
        newSchedule.days[day] = {
          completed: false,
          skipped: false,
          routineId: record.id
        };
        console.log('Updated day with real routineId:', day, record.id);
      });

      console.log('Updating PB with corrected schedule...');
      await pb.collection('routines').update(record.id, {
        weeklySchedule: [newSchedule]
      });
      console.log('PB updated with real routineIds');

      const newRoutine: Routine = {
        id: record.id,
        name: record.name,
        muscles: record.muscles,
        exercises: record.exercises,
        exerciseNames: record.exerciseNames,
        createdAt: record.created,
        intensity: record.intensity,
        scheduledDays: selectedDays,
        duration: routineDuration,
        weeklySchedule: [newSchedule]
      };
      
      console.log('New routine to save:', newRoutine);
      
      const allRoutines = [newRoutine, ...savedRoutines];
      console.log('All routines:', allRoutines);
      
      setSavedRoutines(allRoutines);
      
      const updatedSchedules = { ...weekSchedules };
      console.log('Before update, weekSchedules:', updatedSchedules);
      
      if (!updatedSchedules[weekStartKey]) {
        updatedSchedules[weekStartKey] = {};
      }
      selectedDays.forEach(day => {
        updatedSchedules[weekStartKey][day] = {
          completed: false,
          skipped: false,
          routineId: record.id
        };
        console.log('Added day to schedules:', day, 'with routineId:', record.id);
      });
      
      console.log('After update, updatedSchedules:', updatedSchedules);
      setWeekSchedules(updatedSchedules);
      
      localStorage.setItem('myRoutines', JSON.stringify(allRoutines));
      console.log('Saved to localStorage');
      
      resetForm();
      setView('main');
      console.log('=== SAVE COMPLETE ===');
    } catch (e) {
      console.error("Error saving routine to PB", e);
      alert('Error al guardar la rutina. Asegúrate de que la colección "routines" exista.');
    }
  };

  const resetForm = (preSelectedDays?: string[]) => {
    setSelectedMuscles(new Set());
    setGeneratedRoutine([]);
    setSelectedDays(preSelectedDays || []);
    setRoutineName('');
    setRoutineDuration(45);
    setRoutineIntensity('Intermedio');
  };

  const deleteRoutine = async (id: string) => {
    try {
      if (id.length > 10) {
        await pb.collection('routines').delete(id);
      }
      const newRoutines = savedRoutines.filter(r => r.id !== id);
      setSavedRoutines(newRoutines);
      
      const weekStartKey = currentWeekStart.toISOString().split('T')[0];
      const updatedSchedules = { ...weekSchedules };
      if (updatedSchedules[weekStartKey]) {
        DAY_KEYS.forEach(day => {
          if (updatedSchedules[weekStartKey][day]?.routineId === id) {
            delete updatedSchedules[weekStartKey][day];
          }
        });
      }
      setWeekSchedules(updatedSchedules);
      
      localStorage.setItem('myRoutines', JSON.stringify(newRoutines));
      setViewingRoutine(null);
    } catch (e) {
      console.error("Error deleting from PB", e);
      alert('Hubo un error al eliminarla.');
    }
  };

  const markDayComplete = (day: string, routineId: string, completed: boolean) => {
    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    const updatedSchedules = { ...weekSchedules };
    
    if (!updatedSchedules[weekStartKey]) {
      updatedSchedules[weekStartKey] = {};
    }
    
    updatedSchedules[weekStartKey][day] = {
      ...updatedSchedules[weekStartKey][day],
      completed,
      skipped: false,
      completedAt: completed ? new Date().toISOString() : undefined
    };
    
    setWeekSchedules(updatedSchedules);
    
    const routineIndex = savedRoutines.findIndex(r => r.id === routineId);
    if (routineIndex !== -1) {
      const updatedRoutines = [...savedRoutines];
      let scheduleIndex = updatedRoutines[routineIndex].weeklySchedule.findIndex(
        (ws: WeekSchedule) => ws.weekStart === weekStartKey
      );
      
      if (scheduleIndex === -1) {
        updatedRoutines[routineIndex].weeklySchedule.push({
          weekStart: weekStartKey,
          days: { [day]: updatedSchedules[weekStartKey][day] }
        });
      } else {
        updatedRoutines[routineIndex].weeklySchedule[scheduleIndex].days[day] = 
          updatedSchedules[weekStartKey][day];
      }
      
      setSavedRoutines(updatedRoutines);
      localStorage.setItem('myRoutines', JSON.stringify(updatedRoutines));
      
      if (routineId.length > 10) {
        pb.collection('routines').update(routineId, {
          weeklySchedule: updatedRoutines[routineIndex].weeklySchedule
        }).catch(e => console.error("Error updating PB", e));
      }
    }
  };

  const skipDay = (day: string, routineId: string) => {
    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    const updatedSchedules = { ...weekSchedules };
    
    if (!updatedSchedules[weekStartKey]) {
      updatedSchedules[weekStartKey] = {};
    }
    
    updatedSchedules[weekStartKey][day] = {
      ...updatedSchedules[weekStartKey][day],
      skipped: true,
      completed: false
    };
    
    setWeekSchedules(updatedSchedules);
    
    const routineIndex = savedRoutines.findIndex(r => r.id === routineId);
    if (routineIndex !== -1) {
      const updatedRoutines = [...savedRoutines];
      let scheduleIndex = updatedRoutines[routineIndex].weeklySchedule.findIndex(
        (ws: WeekSchedule) => ws.weekStart === weekStartKey
      );
      
      if (scheduleIndex !== -1) {
        updatedRoutines[routineIndex].weeklySchedule[scheduleIndex].days[day] = 
          updatedSchedules[weekStartKey][day];
        setSavedRoutines(updatedRoutines);
        localStorage.setItem('myRoutines', JSON.stringify(updatedRoutines));
      }
    }
  };

  const removeRoutineFromDay = (day: string) => {
    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    const updatedSchedules = { ...weekSchedules };
    
    if (updatedSchedules[weekStartKey] && updatedSchedules[weekStartKey][day]) {
      delete updatedSchedules[weekStartKey][day];
    }
    setWeekSchedules(updatedSchedules);
    
    const routineId = weekSchedules[weekStartKey]?.[day]?.routineId;
    if (routineId) {
      const routineIndex = savedRoutines.findIndex(r => r.id.trim() === routineId.trim());
      if (routineIndex !== -1) {
        const updatedRoutines = [...savedRoutines];
        const scheduleIndex = updatedRoutines[routineIndex].weeklySchedule.findIndex(
          (ws: WeekSchedule) => ws.weekStart === weekStartKey
        );
        if (scheduleIndex !== -1 && updatedRoutines[routineIndex].weeklySchedule[scheduleIndex].days[day]) {
          delete updatedRoutines[routineIndex].weeklySchedule[scheduleIndex].days[day];
          setSavedRoutines(updatedRoutines);
          localStorage.setItem('myRoutines', JSON.stringify(updatedRoutines));
          
          if (routineId.length > 10) {
            pb.collection('routines').update(routineId, {
              weeklySchedule: updatedRoutines[routineIndex].weeklySchedule
            }).catch(e => console.error("Error updating PB", e));
          }
        }
      }
    }
  };

  const resetWeek = () => {
    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    const updatedSchedules = { ...weekSchedules };
    
    if (updatedSchedules[weekStartKey]) {
      DAY_KEYS.forEach(day => {
        if (updatedSchedules[weekStartKey][day]) {
          updatedSchedules[weekStartKey][day] = {
            ...updatedSchedules[weekStartKey][day],
            completed: false,
            skipped: false,
            completedAt: undefined
          };
        }
      });
    }
    
    setWeekSchedules(updatedSchedules);
    
    const updatedRoutines = savedRoutines.map(r => {
      const scheduleIndex = r.weeklySchedule.findIndex(
        (ws: WeekSchedule) => ws.weekStart === weekStartKey
      );
      if (scheduleIndex !== -1) {
        const updatedSchedule = [...r.weeklySchedule];
        DAY_KEYS.forEach(day => {
          if (updatedSchedule[scheduleIndex].days[day]) {
            updatedSchedule[scheduleIndex].days[day] = {
              ...updatedSchedule[scheduleIndex].days[day],
              completed: false,
              skipped: false,
              completedAt: undefined
            };
          }
        });
        return { ...r, weeklySchedule: updatedSchedule };
      }
      return r;
    });
    
    setSavedRoutines(updatedRoutines);
    localStorage.setItem('myRoutines', JSON.stringify(updatedRoutines));
  };

  const navigateWeek = (direction: number) => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newWeekStart);
  };

  const getWeekStats = () => {
    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    const schedule = weekSchedules[weekStartKey] || {};
    let total = 0, completed = 0, skipped = 0;
    
    DAY_KEYS.forEach(day => {
      if (schedule[day]?.routineId) {
        total++;
        if (schedule[day].completed) completed++;
        else if (schedule[day].skipped) skipped++;
      }
    });
    
    return { total, completed, skipped, pending: total - completed - skipped };
  };

  const getRoutineForDay = (day: string): Routine | null => {
    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    const schedule = weekSchedules[weekStartKey] || {};
    const dayStatus = schedule[day];
    
    if (dayStatus?.routineId) {
      return savedRoutines.find(r => r.id.trim() === dayStatus.routineId.trim()) || null;
    }
    
    return null;
  };

  const getDayStatus = (day: string): DayStatus | null => {
    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    return weekSchedules[weekStartKey]?.[day] || null;
  };

  const assignRoutineToDay = (routine: Routine, day: string) => {
    const weekStartKey = currentWeekStart.toISOString().split('T')[0];
    const updatedSchedules = { ...weekSchedules };
    
    if (!updatedSchedules[weekStartKey]) {
      updatedSchedules[weekStartKey] = {};
    }
    
    updatedSchedules[weekStartKey][day] = {
      completed: false,
      skipped: false,
      routineId: routine.id
    };
    
    setWeekSchedules(updatedSchedules);
    
    const routineIndex = savedRoutines.findIndex(r => r.id === routine.id);
    if (routineIndex !== -1) {
      const updatedRoutines = [...savedRoutines];
      let scheduleIndex = updatedRoutines[routineIndex].weeklySchedule.findIndex(
        (ws: WeekSchedule) => ws.weekStart === weekStartKey
      );
      
      if (scheduleIndex === -1) {
        updatedRoutines[routineIndex].weeklySchedule.push({
          weekStart: weekStartKey,
          days: { [day]: updatedSchedules[weekStartKey][day] }
        });
      } else {
        updatedRoutines[routineIndex].weeklySchedule[scheduleIndex].days[day] = 
          updatedSchedules[weekStartKey][day];
      }
      
      setSavedRoutines(updatedRoutines);
      localStorage.setItem('myRoutines', JSON.stringify(updatedRoutines));
      
      if (routine.id.length > 10) {
        pb.collection('routines').update(routine.id, {
          weeklySchedule: updatedRoutines[routineIndex].weeklySchedule
        }).catch(e => console.error("Error updating PB", e));
      }
    }
  };

  const getHistoricalWeeks = () => {
    const weeks: Date[] = [];
    const today = new Date();
    const currentWeek = getWeekStart(new Date());
    
    for (let i = 1; i <= 4; i++) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weeks.push(weekStart);
    }
    
    return weeks;
  };

  const renderExerciseName = (ex: Exercise) => idioma === 'en' ? (ex.nombre_en || ex.nombre) : ex.nombre;
  const getFullExercisesFromIds = (ids: string[]) => {
    return ids.map(id => exercises.find(e => e.id === id)).filter(Boolean) as Exercise[];
  };

  const daysShort = idioma === 'es' ? DAYS_SHORT_ES : DAYS_SHORT_EN;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 py-6 pb-32 lg:pb-8 h-full flex flex-col font-sans">
      
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(78,222,163,0.3); }
          50% { box-shadow: 0 0 25px rgba(78,222,163,0.5); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline font-black text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
            {idioma === 'es' ? 'Mis Workouts' : 'My Workouts'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {idioma === 'es' ? 'Planifica y gestiona tus rutinas' : 'Plan and manage your routines'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setView('create'); resetForm([getTodayDayKey()]); }}
            className="px-4 py-2 bg-primary text-background rounded-full text-sm font-bold hover:scale-105 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            {idioma === 'es' ? 'Nueva' : 'New'}
          </button>
          
          <div className="flex bg-surface-container-high rounded-full p-1 border border-white/5">
            <button
              onClick={() => setIdioma('es')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${idioma === 'es' ? 'bg-primary text-background' : 'text-slate-400 hover:text-white'}`}
            >
              ES
            </button>
            <button
              onClick={() => setIdioma('en')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${idioma === 'en' ? 'bg-primary text-background' : 'text-slate-400 hover:text-white'}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Main View - Planner + Routines combined */}
      {view === 'main' && !viewingRoutine && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
          {/* Week Navigation */}
          <div className="bg-surface-container-low rounded-3xl p-4 mb-6 border border-white/5">
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <h2 className="font-headline font-black text-xl text-on-surface">
                  {formatWeekRange(currentWeekStart, idioma)}
                </h2>
                <p className="text-slate-400 text-sm">{new Date(currentWeekStart).getFullYear()}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>{idioma === 'es' ? 'Progreso semanal' : 'Weekly progress'}</span>
                <span className="font-bold text-primary">{getWeekStats().completed}/{getWeekStats().total}</span>
              </div>
              <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                  style={{ width: `${getWeekStats().total > 0 ? (getWeekStats().completed / getWeekStats().total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-container-high/50 rounded-xl p-3 text-center">
                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <p className="text-2xl font-black text-primary mt-1">{getWeekStats().completed}</p>
                <p className="text-xs text-slate-400">{idioma === 'es' ? 'Completadas' : 'Completed'}</p>
              </div>
              <div className="bg-surface-container-high/50 rounded-xl p-3 text-center">
                <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                <p className="text-2xl font-black text-secondary mt-1">{getWeekStats().pending}</p>
                <p className="text-xs text-slate-400">{idioma === 'es' ? 'Pendientes' : 'Pending'}</p>
              </div>
              <div className="bg-surface-container-high/50 rounded-xl p-3 text-center">
                <span className="material-symbols-outlined text-slate-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                <p className="text-2xl font-black text-slate-400 mt-1">{getWeekStats().skipped}</p>
                <p className="text-xs text-slate-400">{idioma === 'es' ? 'Saltadas' : 'Skipped'}</p>
              </div>
            </div>
          </div>

          {/* Horizontal Day Cards */}
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-3 min-w-max">
              {DAY_KEYS.map((day, index) => {
                const dayRoutine = getRoutineForDay(day);
                const dayStatus = getDayStatus(day);
                const isToday = new Date().toDateString() === new Date(currentWeekStart.getTime() + index * 86400000).toDateString();
                const isPast = new Date(currentWeekStart.getTime() + index * 86400000) < new Date(new Date().setHours(0,0,0,0));
                
                return (
                  <div 
                    key={day}
                    className={`w-[160px] flex-shrink-0 rounded-2xl border transition-all duration-300 ${
                      dayRoutine 
                        ? dayStatus?.completed 
                          ? 'bg-gradient-to-b from-primary/20 to-surface-container-low border-primary/30' 
                          : dayStatus?.skipped 
                            ? 'bg-surface-container-low border-slate-500/30 opacity-60'
                            : 'bg-surface-container-low border-white/10 hover:border-primary/30'
                        : 'bg-surface-container-low/30 border-dashed border-white/5 hover:border-white/10'
                    } ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold text-xs ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                          {daysShort[index]}
                        </span>
                        {isToday && (
                          <span className="text-[10px] bg-primary text-background px-2 py-0.5 rounded-full font-bold">
                            {idioma === 'es' ? 'HOY' : 'TODAY'}
                          </span>
                        )}
                      </div>
                      
                      {dayRoutine ? (
                        <div className="space-y-2">
                          <div 
                            className="bg-surface-container-high/50 rounded-xl p-2 cursor-pointer hover:bg-surface-container-high transition-all"
                            onClick={() => setViewingRoutine(dayRoutine)}
                          >
                            <h4 className="font-bold text-sm text-on-surface line-clamp-2 leading-tight">
                              {dayRoutine.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {dayRoutine.duration} min • {dayRoutine.exercises.length} exs
                            </p>
                          </div>
                          
                          <div className="flex gap-1">
                            {!dayStatus?.completed && !dayStatus?.skipped && (
                              <button
                                onClick={() => markDayComplete(day, dayRoutine.id, true)}
                                className="flex-1 py-1.5 bg-primary/20 text-primary rounded-lg text-xs font-bold hover:bg-primary/30 transition-all flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                {idioma === 'es' ? 'Listo' : 'Done'}
                              </button>
                            )}
                            {dayStatus?.completed && (
                              <button
                                onClick={() => markDayComplete(day, dayRoutine.id, false)}
                                className="flex-1 py-1.5 bg-primary text-background rounded-lg text-xs font-bold flex items-center justify-center gap-1 animate-pulse-glow"
                              >
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                {idioma === 'es' ? 'Hecho' : 'Done'}
                              </button>
                            )}
                            {!dayStatus?.skipped && (
                              <button
                                onClick={() => skipDay(day, dayRoutine.id)}
                                className="py-1.5 px-2 bg-surface-container-high rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            )}
                            <button
                              onClick={() => removeRoutineFromDay(day)}
                              className="py-1.5 px-2 bg-surface-container-high rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                              title={idioma === 'es' ? 'Quitar' : 'Remove'}
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                            {dayStatus?.skipped && (
                              <span className="flex-1 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm">cancel</span>
                                {idioma === 'es' ? 'Saltada' : 'Skipped'}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="relative group">
                          <button
                            type="button"
                            className="bg-surface-container-high/30 rounded-xl p-3 text-center cursor-pointer hover:bg-surface-container-high/50 transition-all border border-dashed border-white/5 w-full"
                            onClick={(e) => { e.stopPropagation(); setShowDaySelector(showDaySelector === day ? null : day); }}
                          >
                            <span className="material-symbols-outlined text-slate-600 text-2xl">add</span>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {idioma === 'es' ? 'Agregar' : 'Add'}
                            </p>
                          </button>
                          {showDaySelector === day && (
                            <div className="fixed bottom-24 left-4 right-4 bg-surface-container-low border border-white/10 rounded-xl p-2 z-[100] max-h-64 overflow-y-auto" data-day-selector>
                              <div className="text-xs font-bold text-primary px-3 py-2 border-b border-white/10 mb-2">
                                {idioma === 'es' ? 'Asignar a' : 'Assign to'} {day}
                              </div>
                              {savedRoutines.map(routine => (
                                <button
                                  key={routine.id}
                                  onClick={() => { assignRoutineToDay(routine, day); setShowDaySelector(null); }}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-surface-container-high hover:text-white transition-all flex flex-col"
                                >
                                  <span className="font-bold truncate">{routine.name}</span>
                                  <span className="text-[10px] text-slate-500">{routine.duration} min • {routine.exercises.length} exs</span>
                                </button>
                              ))}
                              <button
                                onClick={() => { setView('create'); resetForm([day]); setShowDaySelector(null); }}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-primary hover:bg-surface-container-high transition-all flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                {idioma === 'es' ? 'Nueva rutina' : 'New routine'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button 
              onClick={resetWeek}
              className="flex-1 py-3 bg-surface-container-high border border-white/10 rounded-2xl text-slate-300 font-bold hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">restart_alt</span>
              {idioma === 'es' ? 'Reiniciar Semana' : 'Reset Week'}
            </button>
            <button 
              onClick={() => setView('create')}
              className="flex-1 py-3 bg-primary text-background font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_task</span>
              {idioma === 'es' ? 'Crear Rutina' : 'Create Routine'}
            </button>
          </div>

          {/* Quick Access to Routines */}
          {savedRoutines.length > 0 && (
            <div className="mt-6">
              <h3 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-3">
                {idioma === 'es' ? 'Asignar rutina a un día' : 'Assign routine to a day'}
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {savedRoutines.map(routine => (
                  <button
                    key={routine.id}
                    onClick={() => setViewingRoutine(routine)}
                    className="flex-shrink-0 bg-surface-container-low border border-white/5 rounded-xl px-4 py-2 hover:border-primary/30 transition-all"
                  >
                    <span className="text-sm font-bold text-on-surface">{routine.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saved Routines List */}
          <div className="mt-8">
            <h3 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">
              {idioma === 'es' ? 'Mis Rutinas' : 'My Routines'}
            </h3>
            
            {savedRoutines.length === 0 ? (
              <div className="bg-surface-container-low/50 backdrop-blur-sm border border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-5xl text-slate-600 mb-3" style={{ fontVariationSettings: "'FILL' 0" }}>inventory_2</span>
                <h4 className="font-headline font-bold text-lg text-slate-300">{idioma === 'es' ? 'Aún no tienes rutinas' : 'No routines yet'}</h4>
                <p className="text-slate-500 text-sm max-w-sm mt-2">{idioma === 'es' ? 'Crea tu primera rutina con el botón de arriba' : 'Create your first routine with the button above'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedRoutines.map(routine => (
                  <div 
                    key={routine.id}
                    onClick={() => setViewingRoutine(routine)}
                    className="bg-surface-container-low p-4 rounded-2xl border border-white/5 cursor-pointer hover:border-primary/30 hover:bg-surface-container-high transition-all flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-headline font-bold text-base text-on-surface">{routine.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-surface-container-highest text-slate-400 uppercase">
                        {routine.duration} min
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {routine.exercises.length} exs
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary/10 text-secondary">
                        {routine.intensity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create View */}
      {view === 'create' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
          <button 
            onClick={() => { setView('main'); resetForm(); }}
            className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-6 w-fit bg-surface-container-low px-4 py-2 rounded-full border border-white/5"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span> {idioma === 'es' ? 'Volver' : 'Back'}
          </button>
          
          <h2 className="font-headline font-black text-2xl mb-2 text-on-surface">{idioma === 'es' ? 'Selecciona tus músculos' : 'Select your muscles'}</h2>
          <p className="text-slate-400 mb-6">{idioma === 'es' ? 'Elige qué grupos musculares quieres trabajar' : 'Choose muscle groups to work'}</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {muscleGroups.map(m => {
              const selected = selectedMuscles.has(m.id);
              return (
                <button 
                  key={m.id}
                  onClick={() => toggleMuscle(m.id)}
                  className={`relative p-5 rounded-3xl border transition-all duration-300 text-left overflow-hidden group ${selected ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(78,222,163,0.15)] scale-[1.02]' : 'border-white/5 bg-surface-container-low hover:bg-surface-container-high hover:border-white/10'}`}
                >
                  {selected && <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${m.color} blur-[30px] opacity-40`}></div>}
                  {selected && (
                    <div className="absolute top-3 right-3 text-primary">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-2xl mb-3 flex items-center justify-center transition-colors ${selected ? 'bg-primary text-background' : 'bg-surface-container-highest text-slate-400 group-hover:text-white'}`}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                  </div>
                  <span className={`font-headline font-bold text-lg block transition-colors ${selected ? 'text-primary' : 'text-on-surface'}`}>{m.name}</span>
                </button>
              );
            })}
          </div>

          <button 
            onClick={handleGenerate}
            disabled={selectedMuscles.size === 0}
            className="w-full py-4 bg-primary text-background font-black text-lg rounded-2xl hover:scale-[1.01] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            {idioma === 'es' ? 'Generar Rutina' : 'Generate Routine'}
          </button>
        </div>
      )}

      {/* Preview View */}
      {view === 'preview' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative flex-1">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setView('create')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined">arrow_back</span> {idioma === 'es' ? 'Modificar' : 'Modify'}
            </button>
          </div>

          {/* Routine Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-400 mb-2">{idioma === 'es' ? 'Nombre de la rutina' : 'Routine name'}</label>
            <input
              type="text"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder={idioma === 'es' ? `Rutina de ${Array.from(selectedMuscles).join(', ')}` : `Routine for ${Array.from(selectedMuscles).join(', ')}`}
              className="w-full bg-surface-container-low border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder:text-slate-500 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Duration Selector */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-400 mb-2">{idioma === 'es' ? 'Duración estimada' : 'Estimated duration'}</label>
            <div className="flex gap-2">
              {[30, 45, 60, 90].map(min => (
                <button
                  key={min}
                  onClick={() => setRoutineDuration(min)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    routineDuration === min 
                      ? 'bg-primary text-background shadow-lg shadow-primary/30' 
                      : 'bg-surface-container-low border border-white/10 text-slate-300 hover:bg-surface-container-high'
                  }`}
                >
                  {min} {idioma === 'es' ? 'min' : 'min'}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-400 mb-2">{idioma === 'es' ? 'Intensidad' : 'Intensity'}</label>
            <div className="flex gap-2">
              {['Principiante', 'Intermedio', 'Avanzado'].map(level => (
                <button
                  key={level}
                  onClick={() => setRoutineIntensity(level)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    routineIntensity === level 
                      ? 'bg-secondary text-background shadow-lg shadow-secondary/30' 
                      : 'bg-surface-container-low border border-white/10 text-slate-300 hover:bg-surface-container-high'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Day Selector */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-400 mb-2">{idioma === 'es' ? 'Días de la semana' : 'Days of the week'}</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_KEYS.map((day, index) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`w-12 h-12 rounded-xl font-bold text-sm transition-all ${
                    selectedDays.includes(day)
                      ? 'bg-tertiary text-background shadow-lg shadow-tertiary/30'
                      : 'bg-surface-container-low border border-white/10 text-slate-300 hover:bg-surface-container-high'
                  }`}
                >
                  {daysShort[index]}
                </button>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {idioma === 'es' ? 'Seleccionados:' : 'Selected:'} {selectedDays.length} {idioma === 'es' ? 'días' : 'days'}
              </p>
            )}
          </div>

          {/* Preview Header */}
          <div className="bg-gradient-to-br from-primary/20 to-transparent p-6 rounded-3xl border border-primary/20 mb-6 shadow-[0_0_30px_rgba(78,222,163,0.1)]">
            <h2 className="font-headline font-black text-2xl text-on-surface mb-2">
              {routineName || (idioma === 'es' ? 'Rutina Generada' : 'Generated Routine')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedMuscles).map(m => (
                <span key={m} className="text-xs font-bold px-3 py-1 bg-surface-container-highest rounded-full text-slate-300 capitalize">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Exercises List */}
          <div className="space-y-3 mb-32">
            {generatedRoutine.map((ex, i) => (
              <div key={ex.id} className="w-full text-left bg-surface-container-low p-4 rounded-2xl border border-white/5 flex items-center gap-4 group hover:bg-surface-container-high transition-colors">
                <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary font-black font-headline shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0" onClick={() => setViewingExercise(ex)}>
                  <h4 className="font-headline font-bold text-on-surface text-base truncate cursor-pointer hover:text-primary transition-colors">{renderExerciseName(ex)}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-surface-container-highest px-2 py-0.5 rounded-md">
                      {idioma === 'en' ? ex.categoría : translateCategory(ex.categoría)}
                    </span>
                    {ex.equipo && (
                      <span className="text-[10px] uppercase text-slate-500">
                        {idioma === 'en' ? ex.equipo : translateEquipment(ex.equipo)}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const newR = [...generatedRoutine];
                    newR.splice(i, 1);
                    setGeneratedRoutine(newR);
                  }}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>

          {/* Fixed Bottom Actions */}
          <div className="fixed sm:absolute bottom-24 lg:bottom-4 left-0 right-0 p-4 lg:p-0 bg-gradient-to-t from-background via-background to-transparent z-40 pt-10">
            <div className="flex gap-3 max-w-4xl mx-auto w-full pointer-events-auto">
              <button 
                onClick={handleRegenerate}
                className="flex flex-col sm:flex-row items-center justify-center px-4 py-3 bg-surface-container-high hover:bg-surface-container-highest border border-white/5 hover:border-white/10 rounded-2xl transition-all gap-1 sm:gap-2 text-slate-300 w-1/4 min-w-[80px]"
              >
                <span className="material-symbols-outlined">refresh</span>
                <span className="text-xs sm:text-sm font-bold">{idioma === 'es' ? 'Variar' : 'Vary'}</span>
              </button>
              <button 
                onClick={saveRoutine}
                className="flex-1 py-3 bg-primary text-background font-black text-lg rounded-2xl hover:scale-[1.01] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                {idioma === 'es' ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Routine Detail */}
      {viewingRoutine && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full pb-20">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setViewingRoutine(null)} 
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-surface-container-low px-4 py-2 rounded-full border border-white/5"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              {idioma === 'es' ? 'Volver' : 'Back'}
            </button>
            
            {/* Assign to Day Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-full font-bold text-sm hover:bg-primary/80 transition-all">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                {idioma === 'es' ? 'Asignar al día' : 'Assign to day'}
              </button>
              <div className="absolute top-full right-0 mt-2 bg-surface-container-low border border-white/10 rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[150px]">
                {DAY_KEYS.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => {
                      assignRoutineToDay(viewingRoutine, day);
                      setViewingRoutine(null);
                      setView('main');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-surface-container-high hover:text-white transition-all"
                  >
                    {daysShort[index]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-low p-6 rounded-3xl border border-white/5 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 blur-[40px] rounded-full"></div>
            <h2 className="font-headline font-black text-3xl text-on-surface mb-2 relative z-10">{viewingRoutine.name}</h2>
            <div className="flex flex-wrap gap-3 relative z-10 mb-4">
              <span className="text-xs font-bold px-3 py-1 bg-surface-container-highest rounded-full text-slate-300">
                {viewingRoutine.duration} min
              </span>
              <span className="text-xs font-bold px-3 py-1 bg-surface-container-highest rounded-full text-slate-300">
                {viewingRoutine.intensity}
              </span>
              <span className="text-xs font-bold px-3 py-1 bg-surface-container-highest rounded-full text-slate-300">
                {viewingRoutine.exercises.length} {idioma === 'es' ? 'ejercicios' : 'exercises'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 relative z-10">
              {viewingRoutine.muscles.map(m => (
                <span key={m} className="text-xs font-bold px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary capitalize">{m}</span>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {getFullExercisesFromIds(viewingRoutine.exercises).map((ex, i) => (
              <div 
                key={ex.id} 
                onClick={() => setViewingExercise(ex)}
                className="w-full text-left bg-surface-container-low/50 p-4 rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-surface-container-high transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-secondary font-black font-headline shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-headline font-bold text-on-surface text-base md:text-lg truncate">{renderExerciseName(ex)}</h4>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">
                    {idioma === 'en' ? ex.categoría : translateCategory(ex.categoría)}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-500">chevron_right</span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => deleteRoutine(viewingRoutine.id)}
            className="w-full py-4 bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-2xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">delete</span> {idioma === 'es' ? 'Eliminar Rutina' : 'Delete Routine'}
          </button>
        </div>
      )}

      {/* Exercise Modal */}
      {viewingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setViewingExercise(null)}></div>
          <div className="relative bg-surface-container-low w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[2rem] border border-white/10 shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300 custom-scrollbar">
            
            <button onClick={() => setViewingExercise(null)} className="absolute top-4 right-4 w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-20">
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="block w-full aspect-video rounded-2xl overflow-hidden bg-surface-container-high mb-6 relative">
              <img
                src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${viewingExercise.imágenes[0]}`}
                alt={viewingExercise.nombre}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1f35/4edea3?text=Imagen+no+disponible';
                }}
              />
            </div>
            
            <h3 className="font-headline font-black text-2xl md:text-3xl text-on-surface mb-3 leading-tight">{renderExerciseName(viewingExercise)}</h3>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/20 text-primary uppercase tracking-widest">{idioma === 'en' ? viewingExercise.categoría : translateCategory(viewingExercise.categoría)}</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary/20 text-secondary uppercase tracking-widest">{idioma === 'en' ? viewingExercise.nivel : translateLevel(viewingExercise.nivel)}</span>
              {viewingExercise.equipo && <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-500/20 text-slate-300 uppercase tracking-widest">{idioma === 'en' ? viewingExercise.equipo : translateEquipment(viewingExercise.equipo)}</span>}
            </div>
            
            <div className="mb-6">
              <h4 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-3">{idioma === 'es' ? 'Músculos Involucrados' : 'Muscles Involved'}</h4>
              <div className="flex flex-wrap gap-2">
                {(viewingExercise['músculos primarios'] || []).map(m => (
                  <span key={m} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">{idioma === 'es' ? m : translateMuscle(m)}</span>
                ))}
                {(viewingExercise['músculossecundarios'] || viewingExercise['músculos secundarios'] || []).map(m => (
                  <span key={m} className="text-xs font-medium px-3 py-1.5 rounded-xl bg-surface-container-highest border border-white/5 text-slate-300">{idioma === 'es' ? m : translateMuscle(m)}</span>
                ))}
              </div>
            </div>
            
            {(viewingExercise.instrucciones || []).length > 0 && (
              <div>
                <h4 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-3">{idioma === 'es' ? 'Instrucciones' : 'Instructions'}</h4>
                <ol className="space-y-3">
                  {viewingExercise.instrucciones.map((inst, i) => (
                    <li key={i} className="flex gap-3 text-slate-300">
                      <span className="font-bold text-primary min-w-[20px]">{i + 1}.</span>
                      <span className="text-sm leading-relaxed">{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
