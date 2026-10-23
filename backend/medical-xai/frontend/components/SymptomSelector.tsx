import React, { useState, useEffect } from 'react';

interface SymptomSelectorProps {
  onSubmit: (symptoms: string[], days: number, region: string) => void;
  onCancel: () => void;
}

const SymptomSelector: React.FC<SymptomSelectorProps> = ({ onSubmit, onCancel }) => {
  const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [days, setDays] = useState(3);
  const [region, setRegion] = useState('Pan-India');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available symptoms from API
    const fetchSymptoms = async () => {
      try {
        const baseUrl = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${baseUrl}/symptoms`);
        if (response.ok) {
          const data = await response.json();
          setAllSymptoms(data.symptoms || []);
        } else {
          console.error('Failed to fetch symptoms, status:', response.status);
          setAllSymptoms([]);
        }
      } catch (error) {
        console.error('Failed to fetch symptoms:', error);
        setAllSymptoms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSymptoms();
  }, []);

  const filteredSymptoms = searchQuery.trim()
    ? allSymptoms.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSymptoms;

  const toggleSymptom = (symptom: string) => {
    const updated = new Set(selectedSymptoms);
    if (updated.has(symptom)) {
      updated.delete(symptom);
    } else {
      updated.add(symptom);
    }
    setSelectedSymptoms(updated);
  };

  const handleSubmit = () => {
    if (selectedSymptoms.size === 0) {
      alert('Please select at least one symptom');
      return;
    }
    onSubmit(Array.from(selectedSymptoms), days, region);
  };

  return (
    <div className="w-full max-w-4xl bg-white dark:bg-[#15292c] rounded-xl shadow-lg border border-[#e7f1f3] dark:border-[#2a3a3d] p-8">
      <h2 className="text-2xl font-bold mb-6">Select Your Symptoms</h2>

      <div className="space-y-6">
        {/* Search Box */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
            Search Symptoms
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search symptoms (e.g., fever, cough)..."
            className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Symptom Chips */}
        <div>
          <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
            Available Symptoms {loading && '(Loading...)'}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700">
            {loading ? (
              <p className="text-slate-500 col-span-full text-center py-8">Loading symptoms...</p>
            ) : filteredSymptoms.length === 0 ? (
              <p className="text-slate-500 col-span-full text-center py-8">No symptoms found</p>
            ) : (
              filteredSymptoms.map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-center whitespace-wrap break-words ${
                    selectedSymptoms.has(symptom)
                      ? 'bg-primary text-black shadow-md'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {symptom}
                </button>
              ))
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">{selectedSymptoms.size} symptom(s) selected</p>
        </div>

        {/* Duration and Region */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Number of days
            </label>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="Pan-India">Pan-India</option>
              <option value="North India">North India</option>
              <option value="South India">South India</option>
              <option value="Urban India">Urban India</option>
              <option value="Rural India">Rural India</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSubmit}
            disabled={selectedSymptoms.size === 0 || days <= 0}
            className="flex-1 h-12 bg-primary text-black font-bold rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Analyze Symptoms
          </button>
          <button
            onClick={onCancel}
            className="px-6 h-12 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SymptomSelector;
