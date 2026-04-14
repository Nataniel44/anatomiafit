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

interface MuscleInfo {
  id: string;
  name: string;
  group: string;
  description: string;
}

interface Routine {
  id: string;
  name: string;
  muscles: string[];
  exercises: string[];
  exerciseNames: string[];
  createdAt: string;
  intensity: string;
}

const muscleGroups: Record<string, MuscleInfo[]> = {
  pecho: [
    { id: 'pecho', name: 'Pecho', group: 'pecho', description: 'Músculos grandes del torso que permiten empujar.' },
  ],
  hombros: [
    { id: 'espalda', name: 'Deltoides', group: 'hombros', description: 'Músculos deltoides que permiten la rotación del brazo.' },
    { id: 'trampas', name: 'Trapecio', group: 'hombros', description: 'Músculo grande de la parte superior de la espalda.' },
    { id: 'tríceps', name: 'Tríceps', group: 'hombros', description: 'Músculo extensor del codo.' },
  ],
  biceps: [
    { id: 'bíceps', name: 'Bíceps', group: 'brazos', description: 'Músculo flexor del antebrazo.' },
    { id: 'antebrazos', name: 'Antebrazos', group: 'brazos', description: 'Músculos flexores del antebrazo.' },
  ],
  triceps: [
    { id: 'tríceps', name: 'Tríceps', group: 'brazos', description: 'Músculo extensor del codo.' },
  ],
  core: [
    { id: 'abdominales', name: 'Abdominales', group: 'core', description: 'Músculos centrales que proporcionan estabilidad.' },
    { id: 'parte baja de la espalda', name: 'Espalda Baja', group: 'core', description: 'Músculos erectores de la columna.' },
  ],
  cuello: [
    { id: 'cuello', name: 'Cuello', group: 'cuello', description: 'Músculos del cuello.' },
  ],
  piernas: [
    { id: 'cuadríceps', name: 'Cuádriceps', group: 'piernas', description: 'Músculos frontales del muslo para extensión de rodilla.' },
    { id: 'isquiotibiales', name: 'Isquiotibiales', group: 'piernas', description: 'Músculos posteriores del muslo.' },
    { id: 'glúteos', name: 'Glúteos', group: 'piernas', description: 'Los músculos más grandes del cuerpo.' },
    { id: 'terneros', name: 'Gemelos', group: 'piernas', description: 'Músculos de la pantorrilla.' },
    { id: 'aductores', name: 'Aductores', group: 'piernas', description: 'Músculos internos del muslo.' },
    { id: 'secuestradores', name: 'Abductores', group: 'piernas', description: 'Músculos externos de la cadera.' },
  ],
  espalda: [
    { id: 'lats', name: 'Dorsales', group: 'espalda', description: 'Músculos anchos de la espalda.' },
    { id: 'parte media de la espalda', name: 'Espalda Media', group: 'espalda', description: 'Músculos romboides y trapecio medio.' },
    { id: 'parte baja de la espalda', name: 'Espalda Baja', group: 'espalda', description: 'Músculos erectores de la columna.' },
    { id: 'trampas', name: 'Trapecio', group: 'espalda', description: 'Músculo grande de la parte superior de la espalda.' },
  ],
};

const groupNames: Record<string, string> = {
  pecho: "Pecho",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  core: "Core",
  cuello: "Cuello",
  piernas: "Piernas",
  espalda: "Espalda"
};

export default function MuscleApp() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [idioma, setIdioma] = useState<'es' | 'en'>('es');
  const [userName, setUserName] = useState<string>('Athlete');
  const [activeTab, setActiveTab] = useState<'home' | 'routines' | 'search' | 'history'>('home');
  const [savedRoutines, setSavedRoutines] = useState<Routine[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  React.useEffect(() => {
    const stored = localStorage.getItem('pb_auth');
    if (stored) {
      try {
        const { model } = JSON.parse(stored);
        if (model?.name) {
          setUserName(model.name);
        } else if (model?.email) {
          setUserName(model.email.split('@')[0]);
        }
      } catch { }
    }
  }, []);

  const fetchRoutines = async () => {
    try {
      const user = getCurrentUser();
      if (user) {
        const records = await pb.collection('routines').getFullList({
          filter: `user = "${user.id}"`,
          sort: '-created',
        });

        const mapped = records.map(r => ({
          id: r.id,
          name: r.name,
          muscles: r.muscles || [],
          exercises: r.exercises || [],
          exerciseNames: r.exerciseNames || [],
          createdAt: r.created,
          intensity: r.intensity || 'Intermedio'
        }));
        setSavedRoutines(mapped as Routine[]);
        return;
      }
    } catch (e) {
      console.error("Error loading routines", e);
    }

    const local = localStorage.getItem('myRoutines');
    if (local) {
      try {
        setSavedRoutines(JSON.parse(local));
      } catch (e) { }
    }
  };

  const fetchHistory = async () => {
    try {
      const user = getCurrentUser();
      if (user) {
        const records = await pb.collection('history').getFullList({
          filter: `user = "${user.id}"`,
          sort: '-created',
        });
        setHistoryRecords(records);
        return;
      }
    } catch (e) {
      console.error("Error loading history", e);
    }

    const local = localStorage.getItem('myHistory');
    if (local) {
      try {
        setHistoryRecords(JSON.parse(local));
      } catch (e) { }
    }
  };

  useEffect(() => {
    fetchRoutines();
    fetchHistory();
  }, []);

  const exercises = useMemo(() => rawExercises as Exercise[], []);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return exercises.filter(ex => {
      const nameMatch = ex.nombre.toLowerCase().includes(query) ||
        (ex.nombre_en && ex.nombre_en.toLowerCase().includes(query));
      const muscleMatch = (ex['músculos primarios'] || []).some(m => m.toLowerCase().includes(query)) ||
        (ex['músculossecundarios'] || ex['músculos secundarios'] || []).some(m => m.toLowerCase().includes(query));
      const categoryMatch = ex.categoría.toLowerCase().includes(query);
      return nameMatch || muscleMatch || categoryMatch;
    }).slice(0, 50);
  }, [exercises, searchQuery]);

  const getExercisesForMuscle = (muscleId: string) => {
    return exercises.filter(ex => {
      const primary = ex['músculos primarios'] || [];
      const secondary = (ex['músculossecundarios'] || ex['músculos secundarios'] || []);
      return primary.includes(muscleId) || secondary.includes(muscleId);
    });
  };

  const handleGroupClick = (group: string) => {
    setSelectedGroup(group);
    setSelectedMuscle(null);
    setSelectedExercise(null);
    setActiveTab('home');
  };

  const handleMuscleClick = (muscleId: string) => {
    setSelectedMuscle(muscleId);
    setSelectedExercise(null);
    setActiveTab('home');
  };

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  const handleBack = () => {
    if (selectedExercise) {
      setSelectedExercise(null);
    } else if (selectedMuscle) {
      setSelectedMuscle(null);
    } else if (selectedGroup) {
      setSelectedGroup(null);
    }
  };

  const muscleExercises = selectedMuscle ? getExercisesForMuscle(selectedMuscle) : [];

  const getMuscleInfo = (muscleId: string): MuscleInfo | undefined => {
    for (const group of Object.values(muscleGroups)) {
      const found = group.find(m => m.id === muscleId);
      if (found) return found;
    }
    return undefined;
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-surface text-on-surface pb-32 lg:pb-6">
      {/* Panel Izquierdo - Mapa Corporal */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-start pt-6 pb-4 lg:justify-center bg-surface-container-low lg:min-h-screen lg:sticky lg:top-0">
        <div className="flex items-center gap-2 mb-2 lg:mb-4">
          {(selectedGroup || selectedMuscle) && (
            <button
              onClick={handleBack}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase rounded-full">
            {selectedMuscle ? getMuscleInfo(selectedMuscle)?.name || translateMuscle(selectedMuscle) : selectedGroup ? groupNames[selectedGroup] : "Mapa Corporal"}
          </span>
        </div>

        {!selectedGroup ? (
          <>
            {/* Mapa SVG */}
            <svg viewBox="0 0 300 450" className="w-full max-w-[280px] h-auto drop-shadow-2xl mb-4">
              <defs>
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Eje central cibernético */}
              <path d="M150,20 L150,430" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,5" />

              {/* Cabeza y Cuello */}
              <g className="fill-[#2a3241] stroke-white/10 stroke-[0.5] transition-all duration-300">
                <path d="M135,30 L150,15 L165,30 L160,55 L150,65 L140,55 Z" />
                <path d="M142,55 L150,65 L158,55 L162,75 L150,85 L138,75 Z" />
              </g>

              {/* Pecho (Chest) */}
              <g
                onClick={() => handleGroupClick('pecho')}
                className={`cursor-pointer transition-all duration-500 stroke-white/10 stroke-[1] ${selectedGroup === 'pecho' ? 'fill-primary [filter:url(#neonGlow)]' : 'fill-[#364354] hover:fill-primary/60'}`}
              >
                <path d="M136,76 L148,86 L148,125 L115,120 L110,100 Z" />
                <path d="M164,76 L152,86 L152,125 L185,120 L190,100 Z" />
              </g>

              {/* Hombros (Shoulders) */}
              <g
                onClick={() => handleGroupClick('hombros')}
                className={`cursor-pointer transition-all duration-500 stroke-white/10 stroke-[1] ${selectedGroup === 'hombros' ? 'fill-primary [filter:url(#neonGlow)]' : 'fill-[#364354] hover:fill-primary/60'}`}
              >
                <path d="M134,74 L108,98 L92,90 L98,68 L128,62 Z" />
                <path d="M166,74 L192,98 L208,90 L202,68 L172,62 Z" />
              </g>

              {/* Espalda (Lats visbles) */}
              <g
                onClick={() => handleGroupClick('espalda')}
                className={`cursor-pointer transition-all duration-500 stroke-white/10 stroke-[1] ${selectedGroup === 'espalda' ? 'fill-primary [filter:url(#neonGlow)]' : 'fill-[#364354] hover:fill-primary/60'}`}
              >
                <path d="M113,122 L106,102 L95,115 L108,160 L118,155 Z" />
                <path d="M187,122 L194,102 L205,115 L192,160 L182,155 Z" />
              </g>

              {/* Core (Abs) */}
              <g
                onClick={() => handleGroupClick('core')}
                className={`cursor-pointer transition-all duration-500 stroke-white/10 stroke-[1] ${selectedGroup === 'core' ? 'fill-primary [filter:url(#neonGlow)]' : 'fill-[#364354] hover:fill-primary/60'}`}
              >
                <path d="M148,127 L132,125 L128,145 L148,148 Z" />
                <path d="M148,150 L126,147 L124,168 L148,172 Z" />
                <path d="M148,174 L122,170 L125,190 L148,200 Z" />
                <path d="M152,127 L168,125 L172,145 L152,148 Z" />
                <path d="M152,150 L174,147 L176,168 L152,172 Z" />
                <path d="M152,174 L178,170 L175,190 L152,200 Z" />
                <path d="M130,125 L115,123 L110,165 L120,172 L125,145 Z" />
                <path d="M170,125 L185,123 L190,165 L180,172 L175,145 Z" />
              </g>

              {/* Brazos */}
              <g
                onClick={() => handleGroupClick('biceps')}
                className={`cursor-pointer transition-all duration-500 stroke-white/10 stroke-[1] ${selectedGroup === 'biceps' ? 'fill-primary [filter:url(#neonGlow)]' : 'fill-[#364354] hover:fill-primary/60'}`}
              >
                <path d="M106,100 L86,140 L96,155 L112,125 Z" />
                <path d="M94,102 L76,132 L84,142 L100,118 Z" />
                <path d="M194,100 L214,140 L204,155 L188,125 Z" />
                <path d="M206,102 L224,132 L216,142 L200,118 Z" />
                <path d="M94,160 L80,210 L90,225 L102,170 Z" />
                <path d="M206,160 L220,210 L210,225 L198,170 Z" />
              </g>

              {/* Piernas */}
              <g
                onClick={() => handleGroupClick('piernas')}
                className={`cursor-pointer transition-all duration-500 stroke-white/10 stroke-[1] ${selectedGroup === 'piernas' ? 'fill-primary [filter:url(#neonGlow)]' : 'fill-[#364354] hover:fill-primary/60'}`}
              >
                <path d="M125,193 L148,206 L148,230 L115,225 L118,175 Z" />
                <path d="M175,193 L152,206 L152,230 L185,225 L182,175 Z" />
                <path d="M113,228 L148,233 L140,295 L110,285 Z" />
                <path d="M108,220 L111,280 L103,275 L98,225 Z" />
                <path d="M187,228 L152,233 L160,295 L190,285 Z" />
                <path d="M192,220 L189,280 L197,275 L202,225 Z" />
                <path d="M109,305 L138,310 L130,380 L115,395 L108,370 Z" />
                <path d="M191,305 L162,310 L170,380 L185,395 L192,370 Z" />
                <path d="M115,397 L132,382 L140,410 L110,415 Z" />
                <path d="M185,397 L168,382 L160,410 L190,415 Z" />
              </g>
            </svg>

            <p className="text-slate-500 text-sm text-center mt-4">
              Toca un grupo muscular
            </p>
          </>
        ) : !selectedMuscle ? (
          /* Lista de Músculos por Grupo */
          <div className="w-full max-w-md">

            <div className="space-y-2 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
              {muscleGroups[selectedGroup]?.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleMuscleClick(m.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border ${selectedMuscle === m.id ? 'bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(var(--color-primary),0.2)]' : 'bg-surface-container-high/50 border-white/5 hover:bg-surface-container-highest hover:border-white/10 hover:-translate-y-1'}`}
                >
                  <span className="font-headline font-bold text-lg">
                    {m.name}
                  </span>
                  <p className="text-slate-500 text-sm mt-1">
                    {m.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Panel Derecho - Detalles estilo app */}
      <div className="w-full lg:w-[55%] px-4 py-6 lg:p-8 lg:overflow-y-auto lg:max-h-screen">
        {selectedExercise ? (
          /* Vista de Detalle del Ejercicio */
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <style>{`
              @keyframes fiber-slide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              @keyframes fiber-twitch {
                0%, 100% { opacity: 0.15; transform: scaleX(1); }
                50% { opacity: 0.4; transform: scaleX(0.98); }
              }
              .animate-fiber-slide {
                animation: fiber-slide 2s infinite linear;
              }
              .animate-fiber-twitch {
                animation: fiber-twitch 1.5s infinite ease-in-out;
              }
            `}</style>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-400 hover:text-primary transition-all duration-300 mb-6 group bg-surface-container-low/50 px-4 py-2 rounded-full w-fit backdrop-blur-sm border border-white/5 hover:border-primary/30"
            >
              <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span className="font-bold text-sm">Volver a la lista</span>
            </button>

            {/* Imagen del ejercicio */}
            <div className="w-full aspect-video rounded-3xl overflow-hidden bg-surface-container-low mb-8 shadow-2xl border border-white/10 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none"></div>
              <img
                src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${selectedExercise.imágenes[0]}`}
                alt={selectedExercise.nombre}
                className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1f35/4edea3?text=Imagen+no+disponible';
                }}
              />
            </div>

            <h1 className="font-headline font-black text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 leading-tight tracking-tight mb-4 drop-shadow-sm">
              {idioma === 'en' ? (selectedExercise.nombre_en || selectedExercise.nombre) : selectedExercise.nombre}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-primary-container/20 text-primary-container">
                {translateCategory(selectedExercise.categoría)}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-secondary-container/20 text-secondary-container">
                {translateLevel(selectedExercise.nivel)}
              </span>
              {selectedExercise.equipo && (
                <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-slate-500/20 text-slate-400">
                  {translateEquipment(selectedExercise.equipo)}
                </span>
              )}
            </div>

            {/* Músculos principales */}
            <div className="mt-6 bg-surface-container-low/50 backdrop-blur-sm p-6 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="font-headline font-extrabold text-lg text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">fitness_center</span>
                Músculos Principales
              </h3>
              <div className="flex flex-wrap gap-3">
                {(selectedExercise['músculos primarios'] || []).map((muscle, idx) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden px-5 py-2.5 bg-primary/10 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(78,222,163,0.1)] group flex items-center justify-center min-w-[100px] hover:scale-105 transition-transform cursor-default"
                  >
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(78,222,163,0.2)_3px,transparent_4px)] animate-fiber-twitch"></div>
                    <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-x-full animate-fiber-slide"></div>
                    <span className="relative z-10 text-sm font-bold text-primary tracking-wide drop-shadow-md">
                      {translateMuscle(muscle)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Músculos secundarios */}
            {(selectedExercise['músculossecundarios'] || selectedExercise['músculos secundarios'] || []).length > 0 && (
              <div className="mt-4 bg-surface-container-low/50 backdrop-blur-sm p-6 rounded-2xl border border-white/5 shadow-lg">
                <h3 className="font-headline font-extrabold text-lg text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">groups</span>
                  Músculos Secundarios
                </h3>
                <div className="flex flex-wrap gap-3">
                  {(selectedExercise['músculossecundarios'] || selectedExercise['músculos secundarios'] || []).map((muscle, idx) => (
                    <div
                      key={idx}
                      className="relative overflow-hidden px-4 py-2 bg-surface-container-highest rounded-xl border border-white/5 group flex items-center justify-center min-w-[90px] hover:scale-105 transition-transform cursor-default"
                    >
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.08)_3px,transparent_4px)] animate-fiber-twitch" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-fiber-slide" style={{ animationDelay: '0.7s', animationDuration: '3s' }}></div>
                      <span className="relative z-10 text-sm font-medium text-slate-300">
                        {translateMuscle(muscle)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instrucciones */}
            {selectedExercise.instrucciones.length > 0 && (
              <div className="mt-6 bg-surface-container-low p-6 rounded-xl">
                <h3 className="font-headline font-extrabold text-lg text-on-surface mb-4">
                  Cómo realizar el ejercicio
                </h3>
                <ol className="space-y-3">
                  {selectedExercise.instrucciones.map((instruction, idx) => (
                    <li key={idx} className="flex gap-3 text-on-surface-variant">
                      <span className="font-bold text-primary min-w-[24px]">{idx + 1}.</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : selectedMuscle && muscleExercises.length > 0 ? (
          /* Lista de Ejercicios para el Músculo */
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <span className="font-headline font-bold text-primary tracking-widest text-sm uppercase">
              {groupNames[selectedGroup || '']}
            </span>
            <h1 className="font-headline font-black text-4xl md:text-5xl text-on-surface leading-none tracking-tight mt-2">
              {getMuscleInfo(selectedMuscle)?.name || translateMuscle(selectedMuscle)}
            </h1>
            <p className="text-on-surface-variant mt-4 leading-relaxed">
              {getMuscleInfo(selectedMuscle)?.description || 'Ejercicios para este músculo'}
            </p>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline font-extrabold text-lg text-on-surface">
                  Ejercicios ({muscleExercises.length})
                </h3>
                <div className="flex bg-surface-container-high rounded-full p-1 border border-white/5">
                  <button
                    onClick={() => setIdioma('es')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${idioma === 'es' ? 'bg-primary text-background shadow-[0_0_10px_rgba(78,222,163,0.3)]' : 'text-slate-400 hover:text-white'}`}
                  >
                    ES
                  </button>
                  <button
                    onClick={() => setIdioma('en')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${idioma === 'en' ? 'bg-primary text-background shadow-[0_0_10px_rgba(78,222,163,0.3)]' : 'text-slate-400 hover:text-white'}`}
                  >
                    EN
                  </button>
                </div>
              </div>
              <div className="space-y-3 pb-8">
                {muscleExercises.slice(0, 50).map((ex, index) => (
                  <button
                    key={index}
                    onClick={() => handleExerciseClick(ex)}
                    className="w-full group bg-surface-container-low/40 backdrop-blur-sm border border-white/5 hover:border-primary/30 hover:bg-surface-container-high/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 rounded-2xl p-5 flex items-center justify-between cursor-pointer active:scale-[0.98] text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-headline font-bold text-lg text-on-surface block truncate group-hover:text-primary transition-colors">
                        {idioma === 'en' ? (ex.nombre_en || ex.nombre) : ex.nombre}
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container-highest text-slate-400">
                          {translateCategory(ex.categoría)}
                        </span>
                        {ex.equipo && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container-highest text-slate-400">
                            • {translateEquipment(ex.equipo)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform flex-shrink-0 bg-primary/10 p-2 rounded-full group-hover:bg-primary/20">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
              {muscleExercises.length > 50 && (
                <p className="text-center text-slate-500 mt-4">
                  Y {muscleExercises.length - 50} ejercicios más...
                </p>
              )}
            </div>
          </div>
        ) : selectedMuscle ? (
          <div className="h-full flex flex-col items-center justify-center text-center min-h-[50vh] p-8 animate-in fade-in duration-500">
            <div className="bg-surface-container-low/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-xl max-w-sm w-full">
              <div className="bg-surface-container-highest w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-slate-500" style={{ fontVariationSettings: "'FILL' 0" }}>
                  fitness_center
                </span>
              </div>
              <h3 className="font-headline font-bold text-xl text-on-surface mb-2">
                Sin Ejercicios
              </h3>
              <p className="text-slate-400 text-sm">
                Aún no tenemos ejercicios catalogados para este músculo específico. Vuelve pronto para actualizaciones.
              </p>
            </div>
          </div>
        ) : selectedGroup ? (
          /* Vista de Exploración de Grupo */
          <div className="h-full flex flex-col items-center justify-center text-center min-h-[50vh] p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-surface-container-low/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-2xl max-w-md w-full relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
              <span className="font-headline font-bold text-primary tracking-widest text-sm uppercase mb-3 block relative z-10">
                Explorando Zona
              </span>
              <h2 className="font-headline font-black text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4 relative z-10">
                {groupNames[selectedGroup]}
              </h2>
              <p className="text-slate-400 mb-8 relative z-10">
                Selecciona uno de los músculos en la lista de la izquierda para ver su detalle y ejercicios recomendados.
              </p>
              <div className="animate-bounce mt-2 inline-flex bg-surface-container-highest p-4 rounded-full">
                <span className="material-symbols-outlined text-3xl text-secondary">
                  swipe_left
                </span>
              </div>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          /* Vista inicial estilo app */
          <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-700">
            {/* Header estilo app */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-headline font-black text-2xl text-on-surface">
                  Hola, {userName}
                </h2>
                <p className="text-slate-400 text-sm">Listo para entrenar?</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30 cursor-pointer" onClick={() => window.location.href = '/login'}>
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
            </div>

            {/* Stats Cards estilo app */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-primary/20 to-transparent backdrop-blur-md p-4 rounded-2xl flex flex-col border border-primary/20 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Ejercicios</span>
                </div>
                <span className="font-headline font-black text-4xl text-primary">
                  {exercises.length}
                </span>
              </div>

              <div className="bg-gradient-to-br from-secondary/20 to-transparent backdrop-blur-md p-4 rounded-2xl flex flex-col border border-secondary/20 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>accessibility_new</span>
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Zonas</span>
                </div>
                <span className="font-headline font-black text-4xl text-secondary">
                  {Object.keys(muscleGroups).length}
                </span>
              </div>
            </div>

            {/* Quick Actions estilo app */}
            <div className="mb-6">
              <h3 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-3 ml-1">Accesos Rápidos</h3>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setActiveTab('search')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high transition-all duration-200 group"
                >
                  <div className="bg-primary/10 p-2 rounded-xl mb-2 group-hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Buscar</span>
                </button>
                <button
                  onClick={() => setActiveTab('routines')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high transition-all duration-200 group"
                >
                  <div className="bg-secondary/10 p-2 rounded-xl mb-2 group-hover:bg-secondary/20 transition-colors">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Rutinas</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high transition-all duration-200 group"
                >
                  <div className="bg-tertiary/10 p-2 rounded-xl mb-2 group-hover:bg-tertiary/20 transition-colors">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Historial</span>
                </button>
                <button className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high transition-all duration-200 group">
                  <div className="bg-orange-500/10 p-2 rounded-xl mb-2 group-hover:bg-orange-500/20 transition-colors">
                    <span className="material-symbols-outlined text-orange-400" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Ajustes</span>
                </button>
              </div>
            </div>

            {/* Mapa corporal en la vista de la app */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[30vh]">
              <div className="relative group mb-4 cursor-pointer">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/40 transition-all duration-700"></div>
                <div className="relative bg-surface-container-high/60 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.2)] transform transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                  <span className="material-symbols-outlined text-5xl text-primary drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                    fitness_center
                  </span>
                </div>
              </div>

              <h2 className="font-headline font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3 tracking-tight drop-shadow-sm">
                Anatomía Fit
              </h2>
              <p className="text-slate-400 text-sm text-center max-w-xs mb-4">
                Toca un grupo muscular en el mapa para descubrir ejercicios y anatomía detallada.
              </p>
            </div>
          </div>
        ) : activeTab === 'routines' ? (
          /* Vista de Rutinas */
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setActiveTab('home')} className="p-2 bg-surface-container-low rounded-full hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-on-surface">arrow_back</span>
              </button>
              <h2 className="font-headline font-black text-2xl text-on-surface">Mis Rutinas</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6">
              <button onClick={() => window.location.href = '/workouts'} className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:scale-[1.02] transition-all border-dashed shadow-md">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                <span className="font-bold">Crear Nueva Rutina</span>
              </button>
            </div>

            {savedRoutines.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-600 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>fitness_center</span>
                <p className="text-slate-400">Aún no tienes rutinas guardadas.</p>
                <p className="text-slate-500 text-sm mt-2">Crea una en la página de Workouts</p>
              </div>
            ) : (
              <div className="space-y-4 pb-20 lg:pb-4">
                <h3 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">Mis Rutinas</h3>
                {savedRoutines.map(routine => (
                  <div key={routine.id} onClick={() => window.location.href = '/workouts'} className="bg-gradient-to-br from-surface-container-low to-surface-container-high p-5 rounded-3xl border border-white/5 shadow-xl group cursor-pointer hover:border-primary/30 hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-primary/20 p-3 rounded-2xl">
                        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-highest text-slate-300">{routine.intensity}</span>
                    </div>
                    <h4 className="font-headline font-black text-xl text-on-surface mb-1">{routine.name}</h4>
                    <p className="text-slate-400 text-sm mb-4">Zonas: {routine.muscles.join(', ')}</p>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">event</span> {new Date(routine.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">fitness_center</span> {routine.exercises.length} Ejercicios</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'search' ? (
          /* Vista de Búsqueda */
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setActiveTab('home'); setSearchQuery(''); }} className="p-2 bg-surface-container-low rounded-full hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-on-surface">arrow_back</span>
              </button>
              <h2 className="font-headline font-black text-2xl text-on-surface">Buscar</h2>
            </div>

            <div className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-3 text-slate-400 mb-4">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Buscar ejercicios..."
                className="bg-transparent border-none outline-none w-full text-on-surface"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            {!searchQuery.trim() ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-[40vh]">
                <span className="material-symbols-outlined text-6xl text-slate-600 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>search</span>
                <p className="text-slate-400">Busca ejercicios por nombre, músculo o categoría</p>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-[40vh]">
                <span className="material-symbols-outlined text-6xl text-slate-600 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>search_off</span>
                <p className="text-slate-400">No se encontraron ejercicios</p>
                <p className="text-slate-500 text-sm mt-2">Prueba con otros términos de búsqueda</p>
              </div>
            ) : (
              <div className="space-y-3 pb-20 lg:pb-4">
                <p className="text-slate-400 text-sm">{filteredExercises.length} resultados</p>
                {filteredExercises.map((ex, index) => (
                  <button
                    key={index}
                    onClick={() => handleExerciseClick(ex)}
                    className="w-full group bg-surface-container-low/40 backdrop-blur-sm border border-white/5 hover:border-primary/30 hover:bg-surface-container-high/60 transition-all duration-300 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-headline font-bold text-lg text-on-surface block truncate group-hover:text-primary transition-colors">
                        {idioma === 'en' ? (ex.nombre_en || ex.nombre) : ex.nombre}
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container-highest text-slate-400">
                          {translateCategory(ex.categoría)}
                        </span>
                        {(ex['músculos primarios'] || []).slice(0, 2).map(m => (
                          <span key={m} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                            {translateMuscle(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform flex-shrink-0 bg-primary/10 p-2 rounded-full group-hover:bg-primary/20">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'history' ? (
          /* Vista de Historial */
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setActiveTab('home')} className="p-2 bg-surface-container-low rounded-full hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-on-surface">arrow_back</span>
              </button>
              <h2 className="font-headline font-black text-2xl text-on-surface">Historial</h2>
            </div>

            {historyRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-[40vh]">
                <span className="material-symbols-outlined text-6xl text-slate-600 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>history</span>
                <p className="text-slate-400">Aún no tienes historial de entrenamiento.</p>
                <p className="text-slate-500 text-sm mt-2">Completa rutinas para ver tu progreso aquí</p>
              </div>
            ) : (
              <div className="space-y-4 pb-20 lg:pb-4">
                <h3 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">Sesiones Recientes</h3>
                {historyRecords.map((record: any) => (
                  <div key={record.id} className="bg-gradient-to-br from-surface-container-low to-surface-container-high p-5 rounded-3xl border border-white/5 shadow-xl">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-headline font-black text-lg text-on-surface">{record.routineName || 'Rutina completada'}</h4>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-highest text-slate-300">
                        {new Date(record.created).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">timer</span> {record.duration || '0'} min</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">fitness_center</span> {record.exercisesCompleted || 0} ejercicios</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
