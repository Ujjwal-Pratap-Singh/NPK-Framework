import React, { useState, useEffect, useMemo } from 'react';
import { 
  Brain, 
  Thermometer, 
  Droplets, 
  Wind, 
  MapPin, 
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sprout,
  Info,
  ArrowRight,
  Clock,
  MoreVertical,
  Carrot,
  Cherry,
  Trees,
  Leaf,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFertilizerRecommendation } from '../services/geminiService';
import { FertilizerRecommendation, RecommendationRequest } from '../types';
import { PUNJAB_CROPS } from '../cropData';

const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

interface AdvancedRecommendationProps {
  currentNPK: { n: number; p: number; k: number };
  area: number;
  areaUnit: 'hectare' | 'acre';
  externalSearchQuery?: string;
  onLocationHandled?: (data: { name: string }) => void;
  defaultTemp?: number;
  defaultHumidity?: number;
}

export default function AdvancedRecommendation({ 
  currentNPK, 
  area, 
  areaUnit,
  externalSearchQuery,
  onLocationHandled,
  defaultTemp = 25,
  defaultHumidity = 60
}: AdvancedRecommendationProps) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<FertilizerRecommendation | null>(null);
  const [growthStage, setGrowthStage] = useState('Early Stage');
  const [soilType, setSoilType] = useState('Bhangar');
  const [temp, setTemp] = useState(defaultTemp);
  const [humidity, setHumidity] = useState(defaultHumidity);
  const [weatherHistory, setWeatherHistory] = useState<{ temp: number; humidity: number }[]>([]);
  const [weatherDesc, setWeatherDesc] = useState('');
  const [locationName, setLocationName] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(PUNJAB_CROPS[0].name);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cropSearch, setCropSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Crops');

  const categories = [
    { name: 'Crops', icon: Leaf },
    { name: 'Vegetables', icon: Carrot },
    { name: 'Fruits', icon: Cherry },
    { name: 'Trees', icon: Trees },
  ];
  
  const filteredCrops = PUNJAB_CROPS.filter(c => 
    c.category === selectedCategory &&
    c.name.toLowerCase().includes(cropSearch.toLowerCase())
  );

  const growthStages = ['Early Stage', 'Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Maturity'];
  const soilTypes = ['Bhangar', 'Kadar', 'Alluvial', 'Alkaline', 'Clayey', 'Sandy'];

  // Agrospheric Adjustment Logic - Calculated Target for selected crop
  const adjustedTargetNPK = useMemo(() => {
    const crop = PUNJAB_CROPS.find(c => c.name === selectedCrop);
    if (!crop) return { n: 0, p: 0, k: 0 };

    let nVal = crop.n;
    let pVal = crop.p;
    let kVal = crop.k;

    // 1. Growth Stage Influence
    switch (growthStage) {
      case 'Early Stage':
      case 'Seedling':
        nVal *= 0.7; pVal *= 1.3; kVal *= 0.8;
        break;
      case 'Vegetative':
        nVal *= 1.5; pVal *= 1.0; kVal *= 1.0;
        break;
      case 'Flowering':
      case 'Fruiting':
        nVal *= 1.0; pVal *= 1.5; kVal *= 1.4;
        break;
      case 'Maturity':
        nVal *= 0.5; pVal *= 0.6; kVal *= 1.2;
        break;
    }

    // 2. Soil Type Retention
    switch (soilType) {
      case 'Sandy':
        nVal *= 1.25; pVal *= 1.1; kVal *= 1.2;
        break;
      case 'Clayey':
        nVal *= 0.9; pVal *= 0.95; kVal *= 0.9;
        break;
      case 'Alkaline':
        pVal *= 1.3;
        break;
    }

    return {
      n: Math.round(nVal),
      p: Math.round(pVal),
      k: Math.round(kVal)
    };
  }, [selectedCrop, growthStage, soilType]);

  // Sync with sensor defaults if no location search has been performed
  useEffect(() => {
    if (!locationName && !isSearching && !isAutoFetching) {
      if (defaultTemp !== undefined) setTemp(defaultTemp);
      if (defaultHumidity !== undefined) setHumidity(defaultHumidity);
    }
  }, [defaultTemp, defaultHumidity, locationName, isSearching, isAutoFetching]);

  useEffect(() => {
    if (externalSearchQuery && externalSearchQuery.trim().length > 2) {
      const handler = setTimeout(() => {
        const performSearch = async () => {
          setIsSearching(true);
          try {
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(externalSearchQuery)}&appid=${WEATHER_API_KEY}&units=metric`
            );
            if (!response.ok) {
              // If it's a 404, we just ignore it for partial searches
              if (response.status === 404) return;
              throw new Error('Weather API Error');
            }
            const data = await response.json();
            if (data.main) {
              setTemp(data.main.temp);
              setHumidity(data.main.humidity);
              setWeatherHistory(prev => [...prev.slice(-9), { temp: data.main.temp, humidity: data.main.humidity }]);
              setWeatherDesc(data.weather[0]?.description || '');
              setLocationName(data.name);
              onLocationHandled?.({ name: data.name });
            }
          } catch (error) {
            console.error("External search failed:", error);
          } finally {
            setIsSearching(false);
          }
        };
        performSearch();
      }, 1000); // 1s debounce to avoid partial city errors
      return () => clearTimeout(handler);
    }
  }, [externalSearchQuery]);

  // Compute averages for weather data
  const avgTemp = weatherHistory.length > 0 
    ? weatherHistory.reduce((acc, curr) => acc + curr.temp, 0) / weatherHistory.length 
    : temp;
  
  const avgHumidity = weatherHistory.length > 0 
    ? weatherHistory.reduce((acc, curr) => acc + curr.humidity, 0) / weatherHistory.length 
    : humidity;

  const fetchWeatherData = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsAutoFetching(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        console.log(`Fetching weather for: ${latitude}, ${longitude}`);
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
        );
        
        if (!response.ok) throw new Error('Weather API Error');
        const data = await response.json();
        
        if (data.main) {
          const newTemp = data.main.temp;
          const newHumidity = data.main.humidity;
          
          setTemp(newTemp);
          setHumidity(newHumidity);
          setWeatherHistory(prev => [...prev.slice(-9), { temp: newTemp, humidity: newHumidity }]);
          setWeatherDesc(data.weather[0]?.description || '');
          setLocationName(data.name || `📍 Coords: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          onLocationHandled?.({ name: data.name || 'Station' });
        }
      } catch (error) {
        console.error("Error fetching weather:", error);
        alert("Failed to fetch weather. Please check your API key.");
      } finally {
        setIsAutoFetching(false);
      }
    }, (error) => {
      setIsAutoFetching(false);
      console.error("Location error:", error);
      alert(`Location access denied or failed: ${error.message}. Please try manual search.`);
    }, { 
      enableHighAccuracy: true, 
      timeout: 10000, 
      maximumAge: 0 
    });
  };

  const searchCityWeather = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(searchQuery)}&appid=${WEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) throw new Error('City not found');
      
      const data = await response.json();
      
      if (data.main) {
        setTemp(data.main.temp);
        setHumidity(data.main.humidity);
        setWeatherHistory(prev => [...prev.slice(-9), { temp: data.main.temp, humidity: data.main.humidity }]);
        setWeatherDesc(data.weather[0]?.description || '');
        setLocationName(data.name);
        onLocationHandled?.({ name: data.name });
        setSearchQuery('');
      }
    } catch (error) {
      setSearchError("Location not found. Please try again.");
      setTimeout(() => setSearchError(null), 3000);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const request: RecommendationRequest = {
        cropType: selectedCrop,
        n: currentNPK.n,
        p: currentNPK.p,
        k: currentNPK.k,
        temperature: avgTemp,
        humidity: avgHumidity,
        weatherForecast: weatherDesc,
        area,
        areaUnit,
        growthStage,
        soilType
      };
      
      const result = await getFertilizerRecommendation(request);
      setRecommendation(result);
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      {/* Search and Selection section */}
      <section className="bg-black text-white p-12 rounded-[3.5rem] relative overflow-hidden group border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-dashboard-accent/10 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:scale-110" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
               <div className="p-4 bg-dashboard-accent/20 rounded-2xl">
                  <Brain className="w-8 h-8 text-dashboard-accent" />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight">AI Soil Context</h1>
                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Select Target Variety</p>
               </div>
            </div>
            
            {/* Category Selector */}
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedCategory === cat.name 
                        ? 'bg-dashboard-accent text-white shadow-xl' 
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="text" 
                  placeholder={`Search ${selectedCategory}...`}
                  value={cropSearch}
                  onChange={(e) => setCropSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-dashboard-accent/30 transition-all placeholder:text-white/20"
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {filteredCrops.map(crop => (
                  <button
                    key={crop.name}
                    onClick={() => setSelectedCrop(crop.name)}
                    className={`px-4 py-3 rounded-xl text-[10px] font-bold tracking-wider transition-all border text-left flex justify-between items-center ${
                      selectedCrop === crop.name 
                        ? 'bg-white text-black border-white shadow-2xl scale-[1.02]' 
                        : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {crop.name}
                    {selectedCrop === crop.name && <CheckCircle2 className="w-3 h-3 text-dashboard-accent" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                 {[
                   { label: 'Target Nitrogen', value: adjustedTargetNPK.n, unit: 'kg/ha' },
                   { label: 'Target Phosphorus', value: adjustedTargetNPK.p, unit: 'kg/ha' },
                   { label: 'Target Potassium', value: adjustedTargetNPK.k, unit: 'kg/ha' },
                 ].map((f, i) => (
                   <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">{f.label}</div>
                      <div className="text-2xl font-black">{f.value}<span className="text-xs ml-1 opacity-20">{f.unit}</span></div>
                   </div>
                 ))}
            </div>
            
            <div className="p-10 bg-dashboard-accent/10 border border-dashboard-accent/20 rounded-[2.5rem] flex items-center justify-between group">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-dashboard-accent mb-2">Primary Target</div>
                  <div className="text-3xl font-black">{selectedCrop}</div>
                </div>
                <Zap className="w-12 h-12 text-dashboard-accent opacity-30 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </section>

      {/* Parameter Settings */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bento-card p-10 space-y-8 bg-slate-50 border-2 border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-dashboard-muted uppercase tracking-widest flex items-center gap-2">
                 <Clock className="w-4 h-4" /> Growth Stage
              </label>
              <div className="px-3 py-1 bg-black text-white rounded-lg text-[9px] font-black uppercase">Biology</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {growthStages.map(s => (
                <button 
                  key={s}
                  onClick={() => setGrowthStage(s)}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${growthStage === s ? 'bg-black text-white shadow-xl' : 'bg-white text-dashboard-muted hover:bg-slate-100 border border-slate-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>
         </div>

         <div className="bento-card p-10 space-y-8 bg-slate-50 border-2 border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-dashboard-muted uppercase tracking-widest flex items-center gap-2">
                 <MapPin className="w-4 h-4" /> Soil Profile
              </label>
              <div className="px-3 py-1 bg-dashboard-accent text-white rounded-lg text-[9px] font-black uppercase">Texture</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {soilTypes.map(s => (
                <button 
                  key={s}
                  onClick={() => setSoilType(s)}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${soilType === s ? 'bg-black text-white shadow-xl' : 'bg-white text-dashboard-muted hover:bg-slate-100 border border-slate-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>
         </div>
      </section>

      {/* Remote Connectivity */}
      <section className="bento-card p-6 bg-white border-2 border-slate-50">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
            <div className="flex gap-4 shrink-0">
               <div className="flex-1 lg:flex-none">
                  <label className="text-[9px] font-black text-dashboard-muted uppercase mb-1 block tracking-widest">Temperature</label>
                  <div className="bg-slate-50 px-5 py-3 rounded-2xl font-bold text-lg border border-slate-100">{temp.toFixed(1)}°C</div>
               </div>
               <div className="flex-1 lg:flex-none">
                  <label className="text-[9px] font-black text-dashboard-muted uppercase mb-1 block tracking-widest">Humidity</label>
                  <div className="bg-slate-50 px-5 py-3 rounded-2xl font-bold text-lg border border-slate-100">{humidity.toFixed(1)}%</div>
               </div>
            </div>
            
            <div className="flex-1 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-dashboard-muted" />
              <form onSubmit={searchCityWeather} className="h-full">
                <input 
                  type="text" 
                  placeholder="Sync remote atmospheric data..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full bg-slate-50 border border-slate-100 rounded-pill pl-14 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 transition-all"
                />
              </form>
            </div>

            <button 
              onClick={fetchWeatherData}
              disabled={isAutoFetching}
              className="px-10 py-5 bg-black text-white rounded-pill text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 active:scale-95 transition-all shadow-xl justify-center whitespace-nowrap min-w-[160px]"
            >
              <MapPin className="w-4 h-4" /> {isAutoFetching ? 'SEARCHING...' : 'NEAR ME'}
            </button>
          </div>
      </section>

      <button 
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-dashboard-accent text-white py-10 rounded-[3.5rem] font-black uppercase tracking-[0.3em] text-xl shadow-2xl shadow-dashboard-accent/30 transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-8 relative overflow-hidden min-h-[100px]"
      >
        <div className="absolute inset-0 bg-white/10 -translate-x-full hover:translate-x-full transition-transform duration-1000" />
        {loading ? (
          <div className="flex items-center gap-4 whitespace-nowrap">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span>ANALYZING DATA...</span>
          </div>
        ) : (
          <div className="flex items-center gap-4 whitespace-nowrap">
            <span>GENERATE CROP STRATEGY</span>
            <ArrowRight className="w-8 h-8" />
          </div>
        )}
      </button>

      {/* Results Rendering */}
      <AnimatePresence>
        {recommendation && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* The rest of the recommendation rendering logic stays same as before but uses the new recommendation object */}
            {/* I will keep the existing rendering blocks below handleGenerate block */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Deficit Highlights */}
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Nitrogen Deficit', value: recommendation.deficits.n, color: 'text-emerald-500', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
                    { label: 'Phosphorus Deficit', value: recommendation.deficits.p, color: 'text-blue-500', bg: 'bg-blue-50/50', border: 'border-blue-100' },
                    { label: 'Potassium Deficit', value: recommendation.deficits.k, color: 'text-orange-500', bg: 'bg-orange-50/50', border: 'border-orange-100' },
                  ].map((d, i) => (
                    <div key={i} className={`bento-card p-8 ${d.bg} border-2 ${d.border} shadow-sm flex flex-col justify-center min-h-[160px] relative overflow-hidden group`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 blur-3xl rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
                      <div className="text-[10px] font-black text-dashboard-muted uppercase tracking-[0.25em] mb-4 opacity-60 font-mono relative z-10">
                        {d.label}
                      </div>
                      <div className={`text-4xl lg:text-5xl font-black ${d.color} tabular-nums tracking-tighter relative z-10`}>
                        {d.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-12 bg-dashboard-accent text-white rounded-card relative overflow-hidden shadow-[0_32px_64px_-12px_rgba(235,94,40,0.3)] border border-dashboard-accent">
                  <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Zap className="w-32 h-32" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.5em] mb-12 opacity-80 border-b border-white/20 pb-6">Optimized Nutrient Shot</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {recommendation.fertilizerPlan && recommendation.fertilizerPlan.length > 0 ? (
                      recommendation.fertilizerPlan.map((step, idx) => {
                        const name = step.name.toLowerCase();
                        let colorClass = 'text-white';
                        if (name.includes('urea')) colorClass = 'text-emerald-400';
                        else if (name.includes('dap')) colorClass = 'text-blue-400';
                        else if (name.includes('mop') || name.includes('potash')) colorClass = 'text-orange-400';
                        
                        return (
                          <div key={idx} className="space-y-3 relative z-10">
                            <div className="text-[11px] font-black uppercase opacity-70 tracking-[0.2em]">{step.name}</div>
                            <div className={`text-6xl lg:text-7xl font-black tracking-tightest drop-shadow-2xl ${colorClass}`}>{step.dosage}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-12 text-center opacity-50 font-black uppercase tracking-[0.5em]">
                        Aggregating fertilizer requirements...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expert Summary Beside it */}
              <div className="lg:col-span-1 space-y-8">
                <div className="bento-card p-10 h-full bg-[#0a0a0a] text-white flex flex-col justify-between border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-dashboard-accent/5 blur-3xl rounded-full -mr-16 -mt-16" />
                  <div>
                    <div className="p-3 bg-dashboard-accent/20 rounded-2xl w-fit mb-10 border border-dashboard-accent/30 shadow-[0_0_20px_rgba(235,94,40,0.1)]">
                      <Brain className="w-8 h-8 text-dashboard-accent" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-dashboard-accent mb-10 opacity-100">Strategic Analysis</h4>
                    <p className="text-xl lg:text-2xl font-black leading-tight text-white tracking-tight drop-shadow-sm">
                       <span className="text-dashboard-accent opacity-60 mr-2 font-serif italic text-4xl">"</span>
                       {recommendation.summary || "Strategic focus on nutrient optimization for maximum physiological development."}
                       <span className="text-dashboard-accent opacity-60 ml-1 font-serif italic text-4xl">"</span>
                    </p>
                  </div>
                  
                  {recommendation.alerts && recommendation.alerts.length > 0 && (
                    <div className="space-y-4 pt-8 border-t border-white/10">
                       {recommendation.alerts.map((alert, i) => (
                         <div key={i} className="flex gap-4">
                            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">{alert}</p>
                         </div>
                       ))}
                    </div>
                  )}
                  
                  {/* Scientific References */}
                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between opacity-30">
                    <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-dashboard-accent rounded-full" />
                      ICAR-IISS STCR ALIGNED
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest">
                      SHC MINISTRY OF AGRICULTURE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
