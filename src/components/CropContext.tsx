import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Leaf, 
  Carrot, 
  Cherry, 
  Trees, 
  ChevronRight, 
  Info,
  Filter,
  Zap,
  ArrowRight
} from 'lucide-react';
import { PUNJAB_CROPS } from '../cropData';
import { CropCategory, CropNPK } from '../types';

export default function CropContext() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CropCategory | 'All'>('All');
  const [selectedCrop, setSelectedCrop] = useState<CropNPK | null>(null);

  const categories: { name: CropCategory | 'All', icon: any }[] = [
    { name: 'All', icon: Filter },
    { name: 'Crops', icon: Leaf },
    { name: 'Vegetables', icon: Carrot },
    { name: 'Fruits', icon: Cherry },
    { name: 'Trees', icon: Trees },
  ];

  const filteredCrops = useMemo(() => {
    return PUNJAB_CROPS.filter(crop => {
      const matchesSearch = crop.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || crop.category === activeCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery, activeCategory]);

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto pb-20">
      {/* Header section */}
      <section className="bg-black text-white p-12 rounded-[3.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-dashboard-accent/10 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:scale-110" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-dashboard-accent/20 rounded-2xl">
                  <Trees className="w-8 h-8 text-dashboard-accent" />
               </div>
               <h1 className="text-4xl font-black tracking-tight">Crop Context</h1>
            </div>
            <p className="text-white/40 font-medium max-w-xl text-lg leading-relaxed uppercase tracking-tighter">
              Punjab's Agricultural Repository. Explore NPK requirements for <span className="text-white">100+</span> regional varieties across diverse categories.
            </p>
          </div>
          
          <div className="w-full md:w-96 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input 
              type="text" 
              placeholder="Search varieties..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-pill px-16 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-dashboard-accent/20 transition-all placeholder:text-white/20"
            />
          </div>
        </div>
      </section>

      {/* Category Icons */}
      <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            className={`flex items-center gap-3 px-8 py-5 rounded-pill text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 border-2 ${
              activeCategory === cat.name 
                ? 'bg-black text-white border-black shadow-2xl' 
                : 'bg-white text-dashboard-text border-slate-50 hover:border-slate-200'
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.name}
          </button>
        ))}
        <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-dashboard-muted">
          Showing {filteredCrops.length} Entries
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Variety List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCrops.map((crop) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={crop.name}
                onClick={() => setSelectedCrop(crop)}
                className={`group p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer ${
                  selectedCrop?.name === crop.name 
                    ? 'bg-black border-black text-white scale-[1.02]' 
                    : 'bg-white border-slate-50 hover:border-dashboard-accent/30'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    selectedCrop?.name === crop.name ? 'bg-white/10 text-white/50' : 'bg-slate-50 text-dashboard-muted'
                  }`}>
                    {crop.category}
                  </span>
                  <div className={`transition-transform duration-500 ${selectedCrop?.name === crop.name ? 'rotate-90' : 'group-hover:translate-x-1'}`}>
                     <ChevronRight className={`w-5 h-5 ${selectedCrop?.name === crop.name ? 'text-dashboard-accent' : 'text-slate-200'}`} />
                  </div>
                </div>
                <h3 className="text-xl font-black tracking-tight">{crop.name}</h3>
                
                <div className="mt-8 flex gap-4">
                  {[
                    { label: 'N', val: crop.n },
                    { label: 'P', val: crop.p },
                    { label: 'K', val: crop.k }
                  ].map(stat => (
                    <div key={stat.label} className={selectedCrop?.name === crop.name ? 'text-white/40' : 'text-dashboard-muted'}>
                      <span className="text-[10px] font-black uppercase tracking-widest block">{stat.label}</span>
                      <span className={`text-md font-bold ${selectedCrop?.name === crop.name ? 'text-white' : 'text-dashboard-text'}`}>{stat.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Details Panel - Sticky */}
        <div className="lg:col-span-4">
          <div className="sticky top-10">
            <AnimatePresence mode="wait">
              {selectedCrop ? (
                <motion.div
                  key={selectedCrop.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bento-card p-12 bg-white ring-1 ring-slate-100 shadow-2xl space-y-12"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                         <Info className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black tracking-tight">{selectedCrop.name}</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-dashboard-accent">{selectedCrop.category} Profile</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                           <Leaf className="w-24 h-24 text-black" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-dashboard-muted">Varietal Description</h4>
                        <p className="text-sm font-bold text-dashboard-text leading-relaxed italic line-clamp-3">
                           "{selectedCrop.description}"
                        </p>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        {[
                          { label: 'Nitrogen (N)', val: selectedCrop.n, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
                          { label: 'Phosphorus (P)', val: selectedCrop.p, color: 'bg-blue-500', bg: 'bg-blue-50' },
                          { label: 'Potassium (K)', val: selectedCrop.k, color: 'bg-amber-500', bg: 'bg-amber-50' }
                        ].map((item) => (
                          <div key={item.label} className={`${item.bg} p-8 rounded-[2rem] flex items-center justify-between`}>
                            <div className="space-y-1">
                               <div className="text-[10px] font-black uppercase tracking-widest text-black/40">{item.label}</div>
                               <div className="text-3xl font-black">{item.val} <span className="text-xs uppercase text-black/30">kg/ha</span></div>
                            </div>
                            <div className={`w-3 h-12 ${item.color} rounded-full`} />
                          </div>
                        ))}
                     </div>

                     <button className="w-full bg-black text-white py-6 rounded-pill font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 hover:bg-dashboard-accent transition-colors shadow-xl active:scale-95">
                        Optimize Irrigation <ArrowRight className="w-4 h-4" />
                     </button>
                  </div>
                </motion.div>
              ) : (
                <div className="bento-card p-12 bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-6">
                   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Zap className="w-10 h-10 text-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-400 tracking-tight">Select Variety for Detail</h3>
                      <p className="text-xs font-medium text-slate-300">Click on any variety in the list to view its complete NPK profile and growth description.</p>
                   </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
