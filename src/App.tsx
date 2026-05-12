import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Leaf, 
  Droplets, 
  Zap, 
  Thermometer,
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Activity,
  Calendar,
  Clock,
  ChevronDown,
  Info,
  Calculator,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Settings2,
  X,
  TrendingUpDown,
  History,
  Brain,
  Search,
  Plus,
  Mic,
  LayoutDashboard,
  Lightbulb,
  Bell,
  Menu,
  MoreVertical,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ThingSpeakResponse, DashboardData, CropNPK } from './types';
import { PUNJAB_CROPS } from './cropData';
import AdvancedRecommendation from './components/AdvancedRecommendation';

const DEFAULT_CHANNEL_ID = '3317714';
const REFRESH_INTERVAL = 30000; // 30 seconds
const userEmail = "farmer@agripower.com";

export default function App() {
  const [data, setData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropNPK>(PUNJAB_CROPS[0]);
  const [channelId, setChannelId] = useState(DEFAULT_CHANNEL_ID);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualNPK, setManualNPK] = useState({ n: 950, p: 928, k: 931 });
  const [area, setArea] = useState(1);
  const [areaUnit, setAreaUnit] = useState<'hectare' | 'acre'>('hectare');
  const [showReport, setShowReport] = useState(false);
  const [timelineView, setTimelineView] = useState<'live' | 'daily' | 'weekly'>('live');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'advanced'>('dashboard');
  const [globalLocation, setGlobalLocation] = useState('');
  const [stationLocation, setStationLocation] = useState('Punjab');

  const fetchData = async () => {
    if (isManualMode) return;
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=30`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data from ThingSpeak');
      }

      const json: ThingSpeakResponse = await response.json();
      
      const formattedData: DashboardData[] = json.feeds.map(feed => ({
        timestamp: feed.created_at,
        nitrogen: parseFloat(feed.field1 || '0'),
        phosphorus: parseFloat(feed.field2 || '0'),
        potassium: parseFloat(feed.field3 || '0'),
        temperature: parseFloat(feed.field4 || '0'),
        humidity: parseFloat(feed.field5 || '0'),
      }));

      setData(formattedData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [channelId, isManualMode]);

  const currentNPK = useMemo(() => {
    if (isManualMode) return { ...manualNPK, temperature: 25, humidity: 60 };
    const latest = data[data.length - 1];
    return latest 
      ? { 
          n: latest.nitrogen, 
          p: latest.phosphorus, 
          k: latest.potassium, 
          temperature: latest.temperature, 
          humidity: latest.humidity 
        } 
      : { n: 0, p: 0, k: 0, temperature: 0, humidity: 0 };
  }, [data, isManualMode, manualNPK]);

  const averageNPK = useMemo(() => {
    if (isManualMode) return { ...manualNPK, temperature: 25, humidity: 60 };
    if (data.length === 0) return { n: 0, p: 0, k: 0, temperature: 0, humidity: 0 };
    
    // Take average of last 10 readings for stability
    const sub = data.slice(-10);
    const sum = sub.reduce((acc, curr) => ({
      n: acc.n + curr.nitrogen,
      p: acc.p + curr.phosphorus,
      k: acc.k + curr.potassium,
      temp: acc.temp + (curr.temperature || 0),
      humid: acc.humid + (curr.humidity || 0)
    }), { n: 0, p: 0, k: 0, temp: 0, humid: 0 });
    
    return {
      n: sum.n / sub.length,
      p: sum.p / sub.length,
      k: sum.k / sub.length,
      temperature: sum.temp / sub.length,
      humidity: sum.humid / sub.length
    };
  }, [data, isManualMode, manualNPK]);

  const comparisonData = useMemo(() => [
    { name: 'Nitrogen (N)', current: currentNPK.n, required: selectedCrop.n, unit: 'mg/kg' },
    { name: 'Phosphorus (P)', current: currentNPK.p, required: selectedCrop.p, unit: 'mg/kg' },
    { name: 'Potassium (K)', current: currentNPK.k, required: selectedCrop.k, unit: 'mg/kg' },
  ], [currentNPK, selectedCrop]);

  const calculations = useMemo(() => {
    const areaInHectares = areaUnit === 'hectare' ? area : area / 2.471;
    
    const deficitN = Math.max(0, selectedCrop.n - currentNPK.n);
    const deficitP = Math.max(0, selectedCrop.p - currentNPK.p);
    const deficitK = Math.max(0, selectedCrop.k - currentNPK.k);

    // Simplified fertilizer calculations
    // Urea: 46% N
    // DAP: 18% N, 46% P (simplified as primary P source)
    // MOP: 60% K
    const ureaNeeded = (deficitN / 0.46) * areaInHectares;
    const dapNeeded = (deficitP / 0.46) * areaInHectares;
    const mopNeeded = (deficitK / 0.60) * areaInHectares;

    return {
      n: { deficit: deficitN, urea: ureaNeeded },
      p: { deficit: deficitP, dap: dapNeeded },
      k: { deficit: deficitK, mop: mopNeeded },
      areaInHectares
    };
  }, [currentNPK, selectedCrop, area, areaUnit]);

  const chartData = useMemo(() => {
    if (timelineView === 'live') {
      return data.map(d => ({
        ...d,
        displayTime: format(new Date(d.timestamp), 'HH:mm:ss'),
      }));
    }

    // Aggregate data for Daily/Weekly views
    const grouped = data.reduce((acc: any, curr) => {
      const date = timelineView === 'daily' 
        ? format(new Date(curr.timestamp), 'MMM dd')
        : format(new Date(curr.timestamp), 'MMM dd'); // For small datasets, weekly might look similar to daily
      
      if (!acc[date]) {
        acc[date] = { time: date, nitrogen: 0, phosphorus: 0, potassium: 0, count: 0 };
      }
      acc[date].nitrogen += curr.nitrogen;
      acc[date].phosphorus += curr.phosphorus;
      acc[date].potassium += curr.potassium;
      acc[date].count += 1;
      return acc;
    }, {});

    return Object.values(grouped).map((g: any) => ({
      displayTime: g.time,
      nitrogen: g.nitrogen / g.count,
      phosphorus: g.phosphorus / g.count,
      potassium: g.potassium / g.count,
    }));
  }, [data, timelineView]);

  return (
    <div className="min-h-screen bg-[#E5E5E5] p-4 lg:p-8 font-sans transition-colors">
      <div className="max-w-[1600px] mx-auto bg-dashboard-bg rounded-dashboard shadow-[0_20px_100px_rgba(0,0,0,0.05)] overflow-hidden min-h-[90vh]">
        
        {/* Top Header Strip */}
        <header className="px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div className="relative group">
                <button className="bg-black text-white p-3 rounded-xl flex items-center gap-3 active:scale-95 transition-transform">
                  <Menu className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest hidden sm:block">
                    {activeTab === 'advanced' ? 'AI' : isManualMode ? 'Simulator' : 'Real'}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </button>
                
                {/* Mode Dropdown */}
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
                   <button 
                     onClick={() => { setIsManualMode(false); setActiveTab('dashboard'); }}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${!isManualMode && activeTab === 'dashboard' ? 'bg-black text-white' : 'hover:bg-slate-50'}`}
                   >
                     <Activity className="w-4 h-4" /> Live Data
                   </button>
                   <button 
                     onClick={() => { setIsManualMode(true); setActiveTab('dashboard'); }}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${isManualMode && activeTab === 'dashboard' ? 'bg-black text-white' : 'hover:bg-slate-50'}`}
                   >
                     <Settings2 className="w-4 h-4" /> Simulator
                   </button>
                   <button 
                     onClick={() => setActiveTab('advanced')}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${activeTab === 'advanced' ? 'bg-black text-white' : 'hover:bg-slate-50'}`}
                   >
                     <Brain className="w-4 h-4" /> AI Analysis
                   </button>
                </div>
              </div>
              <div className="bg-black text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg border-4 border-white">
                Ag
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight">Agri Insights</span>
              <span className="text-dashboard-muted text-xs font-medium">Modern Farming Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-2xl mx-0 md:mx-10 w-full">
            <div className="relative w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-dashboard-muted" />
              <input 
                type="text" 
                placeholder="Search location for AI analysis..." 
                value={globalLocation}
                onChange={(e) => setGlobalLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setActiveTab('advanced');
                }}
                className="w-full bg-white rounded-pill px-14 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 transition-all shadow-sm border border-slate-50"
              />
              {globalLocation && (
                <button 
                  onClick={() => setGlobalLocation('')}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-dashboard-muted hover:text-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <button className="bg-white p-4 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95">
              <Bell className="w-5 h-5 text-dashboard-text" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-dashboard-accent border-4 border-white shadow-xl">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`} alt="User" />
              </div>
              <div className="hidden xl:block">
                <div className="font-bold text-sm">Farmer Assist</div>
                <div className="text-[10px] font-black text-dashboard-muted uppercase tracking-widest leading-none">Agri-Pro Expert</div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="px-10 py-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-10">
          <div className="lg:col-span-3 flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white border border-white shadow-xl flex flex-col items-center justify-center">
              <span className="text-3xl font-black">{format(new Date(), 'dd')}</span>
            </div>
            <div>
              <div className="font-bold text-dashboard-muted">{format(new Date(), 'eee')},</div>
              <div className="font-black text-xl">{format(new Date(), 'MMMM')}</div>
            </div>
          </div>

          <div className="lg:col-span-3 flex items-center gap-4">
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsManualMode(false); }}
              className={`flex-1 py-5 rounded-[2rem] font-bold text-sm shadow-xl transition-all active:scale-95 ${activeTab === 'dashboard' && !isManualMode ? 'bg-dashboard-accent text-white' : 'bg-white text-dashboard-text'}`}
            >
              Real-time Stats
            </button>
            <button 
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 py-5 rounded-[2rem] font-bold text-sm shadow-xl transition-all active:scale-95 ${activeTab === 'advanced' ? 'bg-black text-white' : 'bg-white text-dashboard-text'}`}
            >
               AI Analysis
            </button>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="bg-white/50 rounded-[3rem] p-10 flex items-center justify-between group overflow-hidden border border-white">
              <div>
                <h2 className="text-4xl font-black tracking-tight mb-2">Hey, Need help? 👋</h2>
                <div className="text-dashboard-muted text-xl font-medium">Ready for AI-powered crop analysis!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Bento Content */}
        <main className="px-10 pb-16">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Real-time Monitor Card */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="bento-card p-10">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex flex-col">
                        <span className="text-dashboard-muted text-xs font-bold uppercase tracking-widest">Soil Nitrogen</span>
                        <span className="text-4xl font-black tracking-tight">{currentNPK.n.toFixed(1)}</span>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-[2rem]">
                        <Leaf className="w-8 h-8 text-emerald-600" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {isManualMode && (
                        <div className="mb-2">
                          <input 
                            type="range" 
                            min="0" 
                            max="2000" 
                            value={manualNPK.n}
                            onChange={(e) => setManualNPK(prev => ({ ...prev, n: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-emerald-50 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all"
                          />
                        </div>
                      )}
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (currentNPK.n / (selectedCrop.n)) * 100)}%` }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-dashboard-muted uppercase tracking-widest">
                        <span>Target: {selectedCrop.n} mg/kg</span>
                        <span>{((currentNPK.n / selectedCrop.n) * 100).toFixed(0)}% Optimal</span>
                      </div>
                    </div>
                  </div>

                  <div className="bento-card p-10">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex flex-col">
                        <span className="text-dashboard-muted text-xs font-bold uppercase tracking-widest">Phosphorus</span>
                        <span className="text-4xl font-black tracking-tight">{currentNPK.p.toFixed(1)}</span>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-[2rem]">
                        <Droplets className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {isManualMode && (
                        <div className="mb-2">
                          <input 
                            type="range" 
                            min="0" 
                            max="2000" 
                            value={manualNPK.p}
                            onChange={(e) => setManualNPK(prev => ({ ...prev, p: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-blue-50 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all"
                          />
                        </div>
                      )}
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (currentNPK.p / (selectedCrop.p)) * 100)}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-dashboard-muted uppercase tracking-widest">
                        <span>Target: {selectedCrop.p} mg/kg</span>
                        <span>{((currentNPK.p / selectedCrop.p) * 100).toFixed(0)}% Optimal</span>
                      </div>
                    </div>
                  </div>

                  <div className="bento-card p-10">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex flex-col">
                        <span className="text-dashboard-muted text-xs font-bold uppercase tracking-widest">Potassium</span>
                        <span className="text-4xl font-black tracking-tight">{currentNPK.k.toFixed(1)}</span>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-[2rem]">
                        <Zap className="w-8 h-8 text-amber-600" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {isManualMode && (
                        <div className="mb-2">
                          <input 
                            type="range" 
                            min="0" 
                            max="2000" 
                            value={manualNPK.k}
                            onChange={(e) => setManualNPK(prev => ({ ...prev, k: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-amber-50 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-all"
                          />
                        </div>
                      )}
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (currentNPK.k / (selectedCrop.k)) * 100)}%` }}
                          className="h-full bg-amber-500 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-dashboard-muted uppercase tracking-widest">
                        <span>Target: {selectedCrop.k} mg/kg</span>
                        <span>{((currentNPK.k / selectedCrop.k) * 100).toFixed(0)}% Optimal</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/50 border border-white p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                        <Thermometer className="w-6 h-6 text-orange-500 mb-2" />
                        <div className="text-[10px] font-black text-dashboard-muted uppercase tracking-widest mb-1">Temperature</div>
                        <div className="text-xl font-black">{(currentNPK.temperature || 0).toFixed(1)}°C</div>
                     </div>
                     <div className="bg-white/50 border border-white p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                        <Droplets className="w-6 h-6 text-blue-500 mb-2" />
                        <div className="text-[10px] font-black text-dashboard-muted uppercase tracking-widest mb-1">Humidity</div>
                        <div className="text-xl font-black">{(currentNPK.humidity || 0).toFixed(1)}%</div>
                     </div>
                  </div>
                </div>

                {/* Center Column: Analytics & Charts */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="bento-card p-10 min-h-[400px]">
                     <div className="flex items-center justify-between mb-10">
                        <h3 className="font-black text-xl tracking-tight">NPK Transitions</h3>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-pill border border-slate-100">
                           {['live', 'daily'].map((v) => (
                              <button 
                                 key={v}
                                 onClick={() => setTimelineView(v as any)}
                                 className={`px-6 py-1.5 rounded-pill text-[10px] font-bold uppercase tracking-widest transition-all ${timelineView === v ? 'bg-white shadow-md' : 'text-dashboard-muted'}`}
                              >
                                 {v}
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="displayTime" hide />
                              <YAxis hide />
                              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                              <Line type="monotone" dataKey="nitrogen" stroke="#10B981" strokeWidth={4} dot={false} strokeLinecap="round" />
                              <Line type="monotone" dataKey="phosphorus" stroke="#3B82F6" strokeWidth={4} dot={false} strokeLinecap="round" />
                              <Line type="monotone" dataKey="potassium" stroke="#F59E0B" strokeWidth={4} dot={false} strokeLinecap="round" />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="mt-8 flex items-center justify-around border-t border-slate-50 pt-8">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500" />
                           <span className="text-[10px] font-black uppercase text-dashboard-muted">N-Trend</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-blue-500" />
                           <span className="text-[10px] font-black uppercase text-dashboard-muted">P-Trend</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-amber-500" />
                           <span className="text-[10px] font-black uppercase text-dashboard-muted">K-Trend</span>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                     <div className="bento-card p-8 flex flex-col items-center justify-center text-center group hover:border-black transition-all">
                        <div className="w-24 h-24 relative mb-4 group-hover:scale-110 transition-transform">
                           <svg className="w-full h-full transform -rotate-90">
                              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * 0.85)} className="text-black transition-all duration-1000" />
                           </svg>
                           <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">85%</div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-dashboard-muted mb-1">Health Index</div>
                        <div className="font-bold text-sm">Vital Soil</div>
                     </div>
                     <div className="bento-card p-8 flex flex-col bg-black text-white relative overflow-hidden group hover:scale-[1.02] transition-all">
                        <div className="absolute top-0 right-0 p-4">
                           <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-auto">AI Recommendation</div>
                        <div className="font-bold text-sm mb-4">Get custom fertilizer plans powered by Agri-GPT.</div>
                        <button 
                          onClick={() => setActiveTab('advanced')}
                          className="bg-dashboard-accent text-white py-3 rounded-pill text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
                        >
                          Enable AI
                        </button>
                     </div>
                  </div>
                </div>

                {/* Right Column: Summaries & Settings */}
                <div className="lg:col-span-3 space-y-8">
                  <div className="bento-card p-8">
                     <div className="flex items-center justify-between mb-8">
                        <Clock className="w-5 h-5 text-dashboard-muted" />
                        <span className="text-xs font-bold text-dashboard-muted uppercase tracking-widest">Live Uptime</span>
                     </div>
                     <div className="text-2xl font-black mb-1">13 Days</div>
                     <div className="text-[10px] font-bold text-dashboard-muted mb-6 uppercase">109 hours, 23 minutes</div>
                     <div className="flex gap-1 mb-8">
                        {Array.from({ length: 14 }).map((_, i) => (
                           <div key={i} className={`h-4 w-4 rounded-full ${i < 10 ? 'bg-dashboard-accent' : 'bg-slate-100'}`} />
                        ))}
                     </div>
                  </div>

                <div className="bento-card p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-dashboard-muted">Station Info</h3>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                    </div>
                  </div>
                  <div className="space-y-6 text-sm font-bold">
                    <div className="flex justify-between items-center">
                      <span className="text-dashboard-muted italic uppercase text-[9px] tracking-widest whitespace-nowrap">Network ID</span>
                      <span className="ml-4 truncate">#{channelId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dashboard-muted italic uppercase text-[9px] tracking-widest whitespace-nowrap">Station Location</span>
                      <span className="ml-4 truncate">{stationLocation}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dashboard-muted italic uppercase text-[9px] tracking-widest whitespace-nowrap">Status</span>
                      <span className="text-emerald-600 ml-4">Verified</span>
                    </div>
                  </div>
                </div>

                  <div className="bento-card p-8 bg-slate-50 border-dashed border-2 border-slate-200">
                     <div className="flex items-center gap-3 text-dashboard-muted mb-4 opacity-50">
                        <div className="w-2 h-2 rounded-full bg-dashboard-muted" />
                        <div className="w-2 h-2 rounded-full bg-dashboard-muted" />
                        <div className="w-2 h-2 rounded-full bg-dashboard-muted" />
                     </div>
                     <div className="text-[10px] font-black uppercase text-dashboard-muted tracking-[0.1em] mb-4">Simulated Mode</div>
                     <div className="text-sm font-bold leading-relaxed mb-6">Is your data manual or automated?</div>
                     <button 
                        onClick={() => setIsManualMode(!isManualMode)}
                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isManualMode ? 'bg-black text-white' : 'bg-white text-dashboard-text border border-slate-200 shadow-sm'}`}
                     >
                        {isManualMode ? 'Switch to Live' : 'Enable Simulator'}
                     </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="advanced"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <AdvancedRecommendation 
                  currentNPK={averageNPK} 
                  area={area} 
                  areaUnit={areaUnit}
                  externalSearchQuery={globalLocation}
                  onLocationHandled={(searchData) => {
                    if (searchData?.name) setStationLocation(searchData.name);
                    setGlobalLocation('');
                  }}
                  defaultTemp={averageNPK.temperature}
                  defaultHumidity={averageNPK.humidity}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <footer className="mt-10 mb-20 text-center">
        <p className="text-dashboard-muted text-xs font-bold uppercase tracking-[0.4em]">Designed for Modern Agriculture // Agri-XP Dashboard</p>
      </footer>
    </div>
  );
}
