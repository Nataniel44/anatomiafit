import React, { useState, useMemo } from 'react';
import rawExercises from '../data/exercises_raw.json';
import { translateCategory, translateLevel, translateEquipment, translateMuscle } from '../data/exercises';

interface Exercise {
  id: string;
  nombre: string;
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

  const exercises = useMemo(() => rawExercises as Exercise[], []);

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
  };

  const handleMuscleClick = (muscleId: string) => {
    setSelectedMuscle(muscleId);
    setSelectedExercise(null);
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
    <div className="flex flex-col lg:flex-row min-h-screen bg-surface text-on-surface">
      {/* Panel Izquierdo */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-surface-container-low p-6 lg:min-h-screen lg:sticky lg:top-0">
        <div className="flex items-center gap-2 mb-4">
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
            <svg viewBox="0 0 300 500" className="w-full max-w-[280px] h-auto">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <ellipse cx="150" cy="50" rx="40" ry="45" fill="#2e3447" />
              <path d="M110 95 L110 250 Q110 280 130 300 L130 400 Q130 420 150 420 L150 480 L150 420 Q170 420 170 400 L170 300 Q190 280 190 250 L190 95 Q150 110 110 95" fill="#2e3447" />
              <ellipse cx="150" cy="50" rx="30" ry="35" fill="#33394c" />
              
              <g onClick={() => handleGroupClick('pecho')} className="cursor-pointer">
                <path d="M115 110 Q150 125 185 110 L185 145 Q150 160 115 145 Z" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
              </g>
              
              <g onClick={() => handleGroupClick('hombros')} className="cursor-pointer">
                <circle cx="100" cy="120" r="20" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
                <circle cx="200" cy="120" r="20" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
              </g>
              
              <g onClick={() => handleGroupClick('biceps')} className="cursor-pointer">
                <ellipse cx="85" cy="170" rx="12" ry="30" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
                <ellipse cx="215" cy="170" rx="12" ry="30" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
              </g>
              
              <g onClick={() => handleGroupClick('espalda')} className="cursor-pointer">
                <path d="M110 95 Q100 150 105 180 L105 250 L110 250 L110 180 Q115 150 115 145 Z" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
                <path d="M190 95 Q200 150 195 180 L195 250 L190 250 L190 180 Q185 150 185 145 Z" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
              </g>
              
              <g onClick={() => handleGroupClick('core')} className="cursor-pointer">
                <path d="M125 150 L175 150 L170 230 Q150 240 130 230 Z" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
              </g>
              
              <g onClick={() => handleGroupClick('piernas')} className="cursor-pointer">
                <path d="M120 235 L145 235 L145 350 L125 350 Z" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
                <path d="M155 235 L180 235 L175 350 L155 350 Z" fill="#3c4a42" className="transition-all duration-300 hover:fill-primary/70" />
              </g>
            </svg>
            
            <p className="text-slate-500 text-sm text-center mt-4">
              Toca un grupo muscular
            </p>
          </>
        ) : !selectedMuscle ? (
          /* Lista de Músculos por Grupo */
          <div className="w-full max-w-md">
            <h3 className="font-headline font-bold text-xl text-on-surface mb-4">
              {groupNames[selectedGroup]}
            </h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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

      {/* Panel Derecho - Detalles */}
      <div className="w-full lg:w-1/2 p-6 lg:p-12 lg:overflow-y-auto lg:max-h-screen">
        {selectedExercise ? (
          /* Vista de Detalle del Ejercicio */
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
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
              {selectedExercise.nombre}
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
            <div className="mt-6 bg-surface-container-low p-6 rounded-xl">
              <h3 className="font-headline font-extrabold text-lg text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">fitness_center</span>
                Músculos Principales
              </h3>
              <div className="flex flex-wrap gap-2">
                {(selectedExercise['músculos primarios'] || []).map((muscle, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-2 bg-primary/20 rounded-lg text-sm font-medium text-primary"
                  >
                    {translateMuscle(muscle)}
                  </span>
                ))}
              </div>
            </div>

            {/* Músculos secundarios */}
            {(selectedExercise['músculossecundarios'] || selectedExercise['músculos secundarios'] || []).length > 0 && (
              <div className="mt-4 bg-surface-container-low p-6 rounded-xl">
                <h3 className="font-headline font-extrabold text-lg text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">groups</span>
                  Músculos Secundarios
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedExercise['músculossecundarios'] || selectedExercise['músculos secundarios'] || []).map((muscle, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-2 bg-surface-container-highest rounded-lg text-sm font-medium text-on-surface"
                    >
                      {translateMuscle(muscle)}
                    </span>
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
              <h3 className="font-headline font-extrabold text-lg text-on-surface mb-4">
                Ejercicios ({muscleExercises.length})
              </h3>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {muscleExercises.slice(0, 50).map((ex, index) => (
                  <button
                    key={index}
                    onClick={() => handleExerciseClick(ex)}
                    className="w-full group bg-surface-container-low/40 backdrop-blur-sm border border-white/5 hover:border-primary/30 hover:bg-surface-container-high/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 rounded-2xl p-5 flex items-center justify-between cursor-pointer active:scale-[0.98] text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-headline font-bold text-lg text-on-surface block truncate group-hover:text-primary transition-colors">
                        {ex.nombre}
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
        ) : (
          /* Vista inicial Mejorada */
          <div className="h-full flex flex-col items-center justify-center text-center min-h-[50vh] p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="relative group cursor-pointer mb-8 mt-4">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/40 transition-all duration-700"></div>
              <div className="relative bg-surface-container-high/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.2)] transform transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                <span className="material-symbols-outlined text-6xl text-primary drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                  fitness_center
                </span>
              </div>
            </div>
            
            <h2 className="font-headline font-black text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4 tracking-tight drop-shadow-sm">
              Anatomía Fit
            </h2>
            <p className="text-slate-400 text-lg max-w-md mx-auto mb-10 leading-relaxed">
              Tu atlas anatómico interactivo. Toca un grupo muscular en el diagrama para descubrir ejercicios, técnicas y anatomía detallada.
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
              <div className="bg-surface-container-low/50 backdrop-blur-md p-5 rounded-3xl flex flex-col items-center justify-center text-center border border-white/5 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-primary/20 hover:border-primary/30 group">
                <div className="bg-primary/10 p-3 rounded-2xl mb-3 text-primary group-hover:bg-primary/20 transition-colors duration-300">
                  <span className="material-symbols-outlined text-2xl">library_books</span>
                </div>
                <span className="font-headline font-black text-3xl text-on-surface mb-1">
                  {exercises.length}
                </span>
                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Ejercicios</span>
              </div>
              
              <div className="bg-surface-container-low/50 backdrop-blur-md p-5 rounded-3xl flex flex-col items-center justify-center text-center border border-white/5 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-secondary/20 hover:border-secondary/30 group">
                <div className="bg-secondary/10 p-3 rounded-2xl mb-3 text-secondary group-hover:bg-secondary/20 transition-colors duration-300">
                  <span className="material-symbols-outlined text-2xl">accessibility_new</span>
                </div>
                <span className="font-headline font-black text-3xl text-on-surface mb-1">
                  {Object.keys(muscleGroups).length}
                </span>
                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Zonas</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
