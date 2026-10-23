import React, { useState } from 'react';
import { API_BASE_URL } from '../services/prediction';

interface PatientSelectionProps {
  onPatientSelected: (patientId: string) => void;
  onNewRegistration: () => void;
}

export const PatientSelection: React.FC<PatientSelectionProps> = ({
  onPatientSelected,
  onNewRegistration,
}) => {
  const [mode, setMode] = useState<'select' | 'search'>('select');
  const [searchEmail, setSearchEmail] = useState('');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearchByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/patients/search/by-email?email=${encodeURIComponent(
          searchEmail
        )}`
      );

      if (!response.ok) {
        throw new Error('Patient not found');
      }

      const data = await response.json();
      onPatientSelected(data.patient.patient_id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to search patient'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGetPatientById = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/patients/${patientId}`
      );

      if (!response.ok) {
        throw new Error('Patient not found');
      }

      onPatientSelected(patientId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to retrieve patient'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Health Assessment
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Select or create a patient profile to get started
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {mode === 'select' && (
          <div className="space-y-4">
            <button
              onClick={onNewRegistration}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-semibold transition"
            >
              + Register New Patient
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <button
              onClick={() => setMode('search')}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold transition"
            >
              Access Existing Profile
            </button>
          </div>
        )}

        {mode === 'search' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Find Your Profile
              </h2>

              <form
                onSubmit={handleSearchByEmail}
                className="space-y-4 mb-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search by Email
                  </label>
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !searchEmail}
                  className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <form
                onSubmit={handleGetPatientById}
                className="space-y-4 mt-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter patient ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !patientId}
                  className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Retrieving...' : 'Get Profile'}
                </button>
              </form>
            </div>

            <button
              onClick={() => {
                setMode('select');
                setError(null);
                setSearchEmail('');
                setPatientId('');
              }}
              className="w-full py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 mt-6"
            >
              Back
            </button>
          </div>
        )}

        <p className="text-center text-gray-500 text-xs mt-6">
          Your medical information is securely stored and encrypted
        </p>
      </div>
    </div>
  );
};
