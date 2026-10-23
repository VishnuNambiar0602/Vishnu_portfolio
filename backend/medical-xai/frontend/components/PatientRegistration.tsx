import React, { useState } from 'react';
import { API_BASE_URL } from '../services/prediction';

interface PatientFormData {
  patient_info: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'Male' | 'Female' | 'Other';
    bloodType?: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  allergies: Array<{
    name: string;
    severity: 'Mild' | 'Moderate' | 'Severe';
    reaction?: string;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    reason: string;
    startDate?: string;
  }>;
  medical_history: Array<{
    condition: string;
    diagnosisDate?: string;
    status: 'Ongoing' | 'Resolved';
    notes?: string;
  }>;
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  family_history: Array<{
    relation: string;
    condition: string;
    notes?: string;
  }>;
}

interface PatientRegistrationProps {
  onSuccess: (patientId: string) => void;
  onCancel: () => void;
}

export const PatientRegistration: React.FC<PatientRegistrationProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'basic' | 'medical' | 'emergency'>('basic');

  const [formData, setFormData] = useState<PatientFormData>({
    patient_info: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'Male',
      bloodType: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
    },
    allergies: [],
    medications: [],
    medical_history: [],
    emergency_contact: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
    },
    family_history: [],
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: string
  ) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      patient_info: {
        ...prev.patient_info,
        [field]: value,
      },
    }));
  };

  const handleEmergencyContactChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: string
  ) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      emergency_contact: {
        ...prev.emergency_contact,
        [field]: value,
      },
    }));
  };

  const addAllergy = () => {
    setFormData((prev) => ({
      ...prev,
      allergies: [
        ...prev.allergies,
        { name: '', severity: 'Mild', reaction: '' },
      ],
    }));
  };

  const updateAllergy = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.map((allergy, i) =>
        i === index ? { ...allergy, [field]: value } : allergy
      ),
    }));
  };

  const removeAllergy = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index),
    }));
  };

  const addMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: '',
          dosage: '',
          frequency: '',
          reason: '',
          startDate: '',
        },
      ],
    }));
  };

  const updateMedication = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      ),
    }));
  };

  const removeMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const addMedicalHistory = () => {
    setFormData((prev) => ({
      ...prev,
      medical_history: [
        ...prev.medical_history,
        {
          condition: '',
          diagnosisDate: '',
          status: 'Ongoing',
          notes: '',
        },
      ],
    }));
  };

  const updateMedicalHistory = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      medical_history: prev.medical_history.map((history, i) =>
        i === index ? { ...history, [field]: value } : history
      ),
    }));
  };

  const removeMedicalHistory = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medical_history: prev.medical_history.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/patients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || 'Failed to register patient'
        );
      }

      const data = await response.json();
      onSuccess(data.patient_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Patient Registration</h1>
          <p className="text-blue-100">
            {currentStep === 'basic'
              ? 'Step 1: Personal Information'
              : currentStep === 'medical'
              ? 'Step 2: Medical Information'
              : 'Step 3: Emergency Contact'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {currentStep === 'basic' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Personal Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patient_info.firstName}
                    onChange={(e) => handleInputChange(e, 'firstName')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patient_info.lastName}
                    onChange={(e) => handleInputChange(e, 'lastName')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.patient_info.dateOfBirth}
                    onChange={(e) => handleInputChange(e, 'dateOfBirth')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    required
                    value={formData.patient_info.gender}
                    onChange={(e) => handleInputChange(e, 'gender')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Type
                </label>
                <select
                  value={formData.patient_info.bloodType || ''}
                  onChange={(e) => handleInputChange(e, 'bloodType')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Blood Type</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.patient_info.email}
                    onChange={(e) => handleInputChange(e, 'email')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.patient_info.phone}
                    onChange={(e) => handleInputChange(e, 'phone')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.patient_info.address}
                  onChange={(e) => handleInputChange(e, 'address')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patient_info.city}
                    onChange={(e) => handleInputChange(e, 'city')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patient_info.state}
                    onChange={(e) => handleInputChange(e, 'state')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patient_info.zipCode}
                    onChange={(e) => handleInputChange(e, 'zipCode')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patient_info.country}
                    onChange={(e) => handleInputChange(e, 'country')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'medical' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Medical Information
              </h2>

              {/* Allergies Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-700 mb-3">Allergies</h3>
                {formData.allergies.map((allergy, index) => (
                  <div
                    key={index}
                    className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="Allergy name"
                        value={allergy.name}
                        onChange={(e) =>
                          updateAllergy(index, 'name', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={allergy.severity}
                        onChange={(e) =>
                          updateAllergy(index, 'severity', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Mild">Mild</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Reaction"
                        value={allergy.reaction || ''}
                        onChange={(e) =>
                          updateAllergy(index, 'reaction', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAllergy(index)}
                      className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Add Allergy
                </button>
              </div>

              {/* Medications Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-700 mb-3">
                  Current Medications
                </h3>
                {formData.medications.map((med, index) => (
                  <div
                    key={index}
                    className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Medication name"
                        value={med.name}
                        onChange={(e) =>
                          updateMedication(index, 'name', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={(e) =>
                          updateMedication(index, 'dosage', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={(e) =>
                          updateMedication(index, 'frequency', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Reason for use"
                        value={med.reason}
                        onChange={(e) =>
                          updateMedication(index, 'reason', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMedication}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Add Medication
                </button>
              </div>

              {/* Medical History Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-700 mb-3">
                  Medical History
                </h3>
                {formData.medical_history.map((history, index) => (
                  <div
                    key={index}
                    className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Condition"
                        value={history.condition}
                        onChange={(e) =>
                          updateMedicalHistory(index, 'condition', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="date"
                        placeholder="Diagnosis date"
                        value={history.diagnosisDate || ''}
                        onChange={(e) =>
                          updateMedicalHistory(index, 'diagnosisDate', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={history.status}
                        onChange={(e) =>
                          updateMedicalHistory(index, 'status', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Ongoing">Ongoing</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Notes"
                        value={history.notes || ''}
                        onChange={(e) =>
                          updateMedicalHistory(index, 'notes', e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedicalHistory(index)}
                      className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMedicalHistory}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Add Medical History
                </button>
              </div>
            </div>
          )}

          {currentStep === 'emergency' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Emergency Contact
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.emergency_contact.name}
                    onChange={(e) =>
                      handleEmergencyContactChange(e, 'name')
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.emergency_contact.relationship}
                    onChange={(e) =>
                      handleEmergencyContactChange(e, 'relationship')
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.emergency_contact.phone}
                    onChange={(e) =>
                      handleEmergencyContactChange(e, 'phone')
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.emergency_contact.email || ''}
                    onChange={(e) =>
                      handleEmergencyContactChange(e, 'email')
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-4 mt-8">
            {currentStep !== 'basic' && (
              <button
                type="button"
                onClick={() =>
                  setCurrentStep(
                    currentStep === 'medical' ? 'basic' : 'medical'
                  )
                }
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Back
              </button>
            )}
            {currentStep === 'basic' && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
            {currentStep !== 'emergency' && (
              <button
                type="button"
                onClick={() =>
                  setCurrentStep(
                    currentStep === 'basic' ? 'medical' : 'emergency'
                  )
                }
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            )}
            {currentStep === 'emergency' && (
              <button
                type="submit"
                disabled={loading}
                className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register Patient'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
