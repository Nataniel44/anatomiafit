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
}

const muscleGroups = [
  { id: 'pecho', name: 'Pecho', icon: 'fitness_center', color: 'from-blue-500 to-cyan-500' },
  { id: 'espalda', name: 'Espalda', icon: 'accessibility', color: 'from-emerald-500 to-teal-500' },
  { id: 'hombros', name: 'Hombros', icon: 'sports_gymnastics', color: 'from-orange-500 to-amber-500' },
  { id: 'biceps', name: 'Bíceps', icon: 'front_hand', color: 'from-purple-500 to-pink-500' },
  { id: 'triceps', name: 'Tríceps', icon: 'sports_mma', color: 'from-red-500 to-rose-500' },
  { id: 'piernas', name: 'Piernas', icon: 'directions_run', color: 'from-yellow-400 to-orange-400' },
  { id: 'core', name: 'Abdominales', icon: 'self_improvement', color: 'from-indigo-500 to-blue-500' },
];

export default function WorkoutsApp() {
  const [idioma, setIdioma] = useState<'es' | 'en'>('es');
  const [view, setView] = useState<'hub' | 'create' | 'preview'>('hub');
  
  const [selectedMuscles, setSelectedMuscles] = useState<Set<string>>(new Set());
  const [generatedRoutine, setGeneratedRoutine] = useState<Exercise[]>([]);
  const [savedRoutines, setSavedRoutines] = useState<Routine[]>([]);
  
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  const [viewingRoutine, setViewingRoutine] = useState<Routine | null>(null);

  const exercises = useMemo(() => rawExercises as Exercise[], []);

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
      console.error("Error loading from PB", e);
    }
    
    // Fallback if not logged in or error
    const local = localStorage.getItem('myRoutines');
    if (local) {
      try {
        setSavedRoutines(JSON.parse(local));
      } catch (e) {}
    }
  };

  useEffect(() => {
    fetchRoutines();
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
    
    // Unique and shuffle
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
    const user = getCurrentUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const payload = {
      name: `Rutina de ${Array.from(selectedMuscles).map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}`,
      muscles: Array.from(selectedMuscles),
      exercises: generatedRoutine.map(e => e.id),
      exerciseNames: generatedRoutine.map(e => e.nombre),
      intensity: 'Intermedio',
      user: user.id
    };
    
    try {
      const record = await pb.collection('routines').create(payload);
      const newRoutine: Routine = {
        id: record.id,
        name: record.name,
        muscles: record.muscles,
        exercises: record.exercises,
        exerciseNames: record.exerciseNames,
        createdAt: record.created,
        intensity: record.intensity
      };
      setSavedRoutines([newRoutine, ...savedRoutines]);
      
      // Keep local sync as backup
      localStorage.setItem('myRoutines', JSON.stringify([newRoutine, ...savedRoutines]));
    } catch (e) {
      console.error("Error saving routine to PB", e);
      alert('Error al guardar la rutina. Asegúrate de que la colección "routines" exista.');
    }
    
    setViewingRoutine(null);
    setView('hub');
    setSelectedMuscles(new Set());
  };

  const deleteRoutine = async (id: string) => {
    try {
      if (id.length > 10) { 
        // Likely a PB ID natively
        await pb.collection('routines').delete(id);
      }
      const newRoutines = savedRoutines.filter(r => r.id !== id);
      setSavedRoutines(newRoutines);
      localStorage.setItem('myRoutines', JSON.stringify(newRoutines));
      setViewingRoutine(null);
    } catch (e) {
      console.error("Error deleting from PB", e);
      alert('Hubo un error al eliminarla.');
    }
  };

  const renderExerciseName = (ex: Exercise) => idioma === 'en' ? (ex.nombre_en || ex.nombre) : ex.nombre;

  // View specific routine component
  const getFullExercisesFromIds = (ids: string[]) => {
    return ids.map(id => exercises.find(e => e.id === id)).filter(Boolean) as Exercise[];
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 lg:px-8 py-6 pb-32 lg:pb-8 h-full flex flex-col font-sans">
      
      {/* Header General */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
            Workouts
          </h1>
          <p className="text-slate-400 text-sm mt-1">Diseña y explora rutinas de entrenamiento</p>
        </div>
        
        {/* Toggle de Idioma */}
        <div className="flex bg-surface-container-high rounded-full p-1 border border-white/5 shadow-inner">
          <button
            onClick={() => setIdioma('es')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${idioma === 'es' ? 'bg-primary text-background shadow-[0_0_15px_rgba(78,222,163,0.3)]' : 'text-slate-400 hover:text-white'}`}
          >
            ES
          </button>
          <button
            onClick={() => setIdioma('en')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${idioma === 'en' ? 'bg-primary text-background shadow-[0_0_15px_rgba(78,222,163,0.3)]' : 'text-slate-400 hover:text-white'}`}
          >
            EN
          </button>
        </div>
      </div>

      {view === 'hub' && !viewingRoutine && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => { setView('create'); setSelectedMuscles(new Set()); }}
            className="w-full p-6 mb-8 rounded-[2rem] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/40 hover:bg-primary/20 transition-all duration-300 group flex items-center justify-between shadow-lg shadow-primary/5 cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-primary/10 to-transparent"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-primary p-3 rounded-2xl shadow-[0_0_20px_rgba(78,222,163,0.4)] group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-background text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_task</span>
              </div>
              <div className="text-left">
                <h3 className="font-headline font-black text-2xl text-on-surface">Generador Mágico</h3>
                <p className="text-slate-400 text-sm">Crea una rutina personalizada en segundos</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary text-3xl group-hover:translate-x-2 transition-transform relative z-10">arrow_forward</span>
          </button>

          <h3 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">Mis Rutinas Guardadas</h3>
          
          {savedRoutines.length === 0 ? (
            <div className="bg-surface-container-low/50 backdrop-blur-sm border border-dashed border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-6xl text-slate-600 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>inventory_2</span>
              <h4 className="font-headline font-bold text-lg text-slate-300">Aún no tienes rutinas</h4>
              <p className="text-slate-500 text-sm max-w-sm mt-2">Utiliza el generador mágico para crear tu primer plan de entrenamiento de manera automática.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRoutines.map(routine => (
                <div 
                  key={routine.id}
                  onClick={() => setViewingRoutine(routine)}
                  className="bg-surface-container-low p-5 rounded-3xl border border-white/5 shadow-xl group cursor-pointer hover:border-primary/30 hover:bg-surface-container-high transition-all flex flex-col justify-between min-h-[140px]"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-headline font-black text-xl text-on-surface">{routine.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-surface-container-highest text-slate-400 uppercase">
                      {new Date(routine.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-3">Zonas: {routine.muscles.join(', ')}</p>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">fitness_center</span> {routine.exercises.length} Exs
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-md bg-secondary/10 text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">bolt</span> {routine.intensity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
          <button onClick={() => setView('hub')} className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-6 w-fit bg-surface-container-low px-4 py-2 rounded-full border border-white/5">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Volver
          </button>
          
          <h2 className="font-headline font-black text-2xl mb-2 text-on-surface">Selecciona tus músculos</h2>
          <p className="text-slate-400 mb-8">Elige qué grupos musculares quieres trabajar hoy y nosotros nos encargaremos del resto.</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
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

          <div className="mt-auto pb-4 pt-8 border-t border-white/5">
             <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-slate-400">Seleccionados:</span>
                <span className="text-2xl font-black text-primary font-headline">{selectedMuscles.size}</span>
             </div>
             <button 
                onClick={handleGenerate}
                disabled={selectedMuscles.size === 0}
                className="w-full py-4 bg-primary text-background font-black text-lg rounded-2xl hover:scale-[1.01] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Generar Rutina Mágica
             </button>
          </div>
        </div>
      )}

      {view === 'preview' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative flex-1">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setView('create')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined">arrow_back</span> Modificar Selección
            </button>
          </div>

          <div className="bg-gradient-to-br from-primary/20 to-transparent p-6 rounded-3xl border border-primary/20 mb-6 flex flex-col justify-between min-h-[120px] shadow-[0_0_30px_rgba(78,222,163,0.1)]">
            <h2 className="font-headline font-black text-3xl text-on-surface mb-2">Rutina Generada</h2>
            <div className="flex gap-2 flex-wrap">
              {Array.from(selectedMuscles).map(m => (
                <span key={m} className="text-xs font-bold px-3 py-1 bg-surface-container-highest rounded-full text-slate-300 capitalize">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-24">
            {generatedRoutine.map((ex, i) => (
              <div key={ex.id} className="w-full text-left bg-surface-container-low p-4 rounded-2xl border border-white/5 flex items-center gap-4 group hover:bg-surface-container-high transition-colors">
                <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary font-black font-headline shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0" onClick={() => setViewingExercise(ex)}>
                  <h4 className="font-headline font-bold text-on-surface text-base md:text-lg truncate cursor-pointer hover:text-primary transition-colors">{renderExerciseName(ex)}</h4>
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

          <div className="fixed sm:absolute bottom-24 lg:bottom-4 left-0 right-0 p-4 lg:p-0 bg-gradient-to-t from-background via-background to-transparent z-40 pt-10">
            <div className="flex gap-3 max-w-4xl mx-auto w-full pointer-events-auto">
               <button 
                 onClick={handleRegenerate}
                 className="flex flex-col sm:flex-row items-center justify-center px-4 py-3 bg-surface-container-high hover:bg-surface-container-highest border border-white/5 hover:border-white/10 rounded-2xl transition-all gap-1 sm:gap-2 text-slate-300 w-1/4 min-w-[80px]"
               >
                 <span className="material-symbols-outlined">refresh</span>
                 <span className="text-xs sm:text-sm font-bold">Variar</span>
               </button>
               <button 
                 onClick={saveRoutine}
                 className="flex-1 py-3 bg-primary text-background font-black text-lg rounded-2xl hover:scale-[1.01] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
               >
                 <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                 Guardar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* View Saved Routine Modal equivalent inline */}
      {viewingRoutine && (
         <div className="animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full pb-20">
            <button onClick={() => setViewingRoutine(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 w-fit bg-surface-container-low px-4 py-2 rounded-full border border-white/5">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Volver a Rutinas
            </button>
            
            <div className="bg-surface-container-low p-6 rounded-3xl border border-white/5 mb-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 blur-[40px] rounded-full"></div>
               <h2 className="font-headline font-black text-3xl text-on-surface mb-2 relative z-10">{viewingRoutine.name}</h2>
               <p className="text-slate-400 text-sm mb-4 relative z-10">{new Date(viewingRoutine.createdAt).toLocaleDateString()}</p>
               <div className="flex flex-wrap gap-2 relative z-10">
                 {viewingRoutine.muscles.map(m => (
                   <span key={m} className="text-xs font-bold px-3 py-1 bg-surface-container-highest rounded-full text-slate-300 capitalize">{m}</span>
                 ))}
               </div>
            </div>

            <div className="space-y-3 mb-8">
              {getFullExercisesFromIds(viewingRoutine.exercises).map((ex, i) => (
                <div key={ex.id} onClick={() => setViewingExercise(ex)} className="w-full text-left bg-surface-container-low/50 p-4 rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-surface-container-high transition-colors">
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
              <span className="material-symbols-outlined">delete</span> Eliminar Rutina
            </button>
         </div>
      )}

      {/* Modal Ejercicio Detalles Funcional usando Fixed Overlay */}
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
              <h4 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-3">Músculos Involucrados</h4>
              <div className="flex flex-wrap gap-2">
                {(viewingExercise['músculos primarios'] || []).map(m => (
                  <span key={m} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-[0_0_10px_rgba(78,222,163,0.1)]">{idioma === 'en' ? m : translateMuscle(m)}</span>
                ))}
                {(viewingExercise['músculossecundarios'] || viewingExercise['músculos secundarios'] || []).map(m => (
                  <span key={m} className="text-xs font-medium px-3 py-1.5 rounded-xl bg-surface-container-highest border border-white/5 text-slate-300">{idioma === 'en' ? m : translateMuscle(m)}</span>
                ))}
              </div>
            </div>
            
            {(viewingExercise.instrucciones || []).length > 0 && (
              <div>
                <h4 className="font-headline font-bold text-sm text-slate-400 uppercase tracking-widest mb-3">Instrucciones</h4>
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
