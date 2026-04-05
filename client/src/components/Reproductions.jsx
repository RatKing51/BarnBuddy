import React, { useState, useEffect } from "react";
import { getAnimalReproductions, createReproduction, updateReproduction, deleteReproduction } from "../api/reproductions";
import { getAnimalBirths, createBirth, updateBirth, deleteBirth } from "../api/births";
import { getAnimalsForUser } from "../api/animal";

export default function Reproductions({ animal }) {
  const [reproductions, setReproductions] = useState([]);
  const [births, setBirths] = useState({ asOffspring: [], asDam: [], asSire: [] });
  const [allAnimals, setAllAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newReproduction, setNewReproduction] = useState({
    dam_id: animal?.sex === 'Female' ? animal.id : '',
    sire_id: animal?.sex === 'Male' ? animal.id : '',
    breeding_date: '',
    due_date: '',
    outcome: '',
    notes: ''
  });

  const [newBirth, setNewBirth] = useState({
    reproduction_id: '',
    offspring_id: '',
    birth_date: '',
    birth_weight: '',
    birth_notes: ''
  });

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBirthId, setSelectedBirthId] = useState('');

  useEffect(() => {
    if (animal) {
      loadData();
    }
  }, [animal]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reproRes, birthRes, animalsRes] = await Promise.all([
        getAnimalReproductions(animal.id),
        getAnimalBirths(animal.id),
        getAnimalsForUser()
      ]);
      setReproductions(reproRes.data);
      setBirths(birthRes.data);
      setAllAnimals(animalsRes.data);
    } catch (error) {
      console.error('Error loading reproduction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReproduction = async () => {
    try {
      await createReproduction(newReproduction);
      setNewReproduction({
        dam_id: animal?.sex === 'Female' ? animal.id : '',
        sire_id: animal?.sex === 'Male' ? animal.id : '',
        breeding_date: '',
        due_date: '',
        outcome: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating reproduction:', error);
    }
  };

  const handleCreateBirth = async () => {
    try {
      await createBirth(newBirth);
      setNewBirth({
        reproduction_id: '',
        offspring_id: '',
        birth_date: '',
        birth_weight: '',
        birth_notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating birth:', error);
    }
  };

  const getAnimalName = (id) => {
    const animal = allAnimals.find(a => a.id === parseInt(id));
    return animal ? animal.name : 'Unknown';
  };

  const maleBreeders = ['Bull', 'Ram', 'Buck', 'Boar', 'Stag', 'Male'];
  const femaleBreeders = ['Cow', 'Heifer', 'Ewe', 'Doe', 'Sow', 'Gilt', 'Female'];
  const neuteredTypes = ['Wether', 'Steer', 'Barrow', 'Gelding'];

  const isNeuteredMale = neuteredTypes.includes(animal?.sex);
  const isMaleBreeder = maleBreeders.includes(animal?.sex);
  const isFemaleBreeder = femaleBreeders.includes(animal?.sex);
  const showBreedingOverview = isMaleBreeder || isFemaleBreeder;

  const years = Array.from(new Set(reproductions
    .map(r => r.breeding_date?.slice(0, 4))
    .filter(Boolean)
  )).sort((a, b) => b - a);

  useEffect(() => {
    if (years.length && !selectedYear) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const filteredReproductions = selectedYear
    ? reproductions.filter((r) => r.breeding_date?.startsWith(selectedYear))
    : reproductions;

  const birthsList = animal?.sex === 'Female' ? births.asDam : births.asSire;

  useEffect(() => {
    if (birthsList.length && !selectedBirthId) {
      setSelectedBirthId(birthsList[0].id?.toString() || '');
    }
  }, [birthsList, selectedBirthId]);

  const selectedBirth = birthsList.find((birth) => birth.id === parseInt(selectedBirthId));

  const parentInfo = {
    dam: animal?.dam_id ? getAnimalName(animal.dam_id) : 'Unknown',
    sire: animal?.sire_id ? getAnimalName(animal.sire_id) : 'Unknown'
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-full grid grid-cols-1 gap-6 p-4 min-h-screen">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Mother</h3>
                <p className="mt-3 text-2xl font-semibold text-gray-100">{parentInfo.dam}</p>
              </div>
              <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Father</h3>
                <p className="mt-3 text-2xl font-semibold text-gray-100">{parentInfo.sire}</p>
              </div>
            </div>

            {showBreedingOverview ? (
              <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Recent Activity</h3>
                <div className="mt-4 space-y-3">
                  {filteredReproductions.slice(0, 4).map((repro, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl bg-gray-900 p-3">
                    <div>
                      <p className="text-sm text-gray-300">{repro.breeding_date}</p>
                      <p className="font-medium text-gray-100">
                        {animal?.sex === 'Female' ? getAnimalName(repro.sire_id) : getAnimalName(repro.dam_id)}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                      repro.outcome === 'successful' ? 'bg-green-600 text-white' :
                      repro.outcome === 'unsuccessful' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'
                    }`}>
                      {repro.outcome || 'pending'}
                    </span>
                  </div>
                ))}
                {filteredReproductions.length === 0 && (
                  <p className="text-sm text-gray-500">No recent activity for this animal.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">This animal is not a breeding animal. Only parent lineage is shown.</p>
            </div>
          )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Mating History</h3>
              <p className="mt-3 text-3xl font-semibold text-blue-300">{reproductions.length}</p>
              <p className="mt-2 text-sm text-gray-400">{animal?.sex === 'Female' ? 'Total breedings' : 'Total matings'}</p>
            </div>
            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Offspring Count</h3>
              <p className="mt-3 text-3xl font-semibold text-green-300">{animal?.sex === 'Female' ? births.asDam.length : births.asSire.length}</p>
              <p className="mt-2 text-sm text-gray-400">Total offspring</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 bg-gray-800 p-5 rounded-2xl border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Profile</h3>
          <p className="mt-4 text-2xl font-semibold text-gray-100">{animal?.name}</p>
          <p className="mt-2 text-sm text-gray-400">{animal?.species} • {animal?.sex}</p>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl bg-gray-900 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-400">Success Rate</p>
              <p className="mt-2 text-xl font-semibold text-gray-100">
                {reproductions.length > 0
                  ? `${Math.round((reproductions.filter(r => r.outcome === 'successful').length / reproductions.length) * 100)}%`
                  : '0%'}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-900 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-400">Active Years</p>
              <p className="mt-2 text-xl font-semibold text-gray-100">{years.length || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-2 bg-gray-800 p-5 rounded-2xl border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Year Selector</h3>
          <div className="mt-4 space-y-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded-xl px-3 py-2"
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="xl:col-span-6 bg-gray-800 p-5 rounded-2xl border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">{animal?.sex === 'Female' ? 'Basic Breeding Event Data' : 'Females Bred To'}</h3>
          <div className="mt-4 space-y-4">
            {filteredReproductions.slice(0, 4).map((repro) => (
              <div key={repro.id} className="rounded-2xl bg-gray-900 p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-100">{repro.breeding_date}</p>
                  <span className="text-xs uppercase px-2 py-1 rounded bg-blue-600 text-white">{repro.outcome || 'Pending'}</span>
                </div>
                <p className="mt-3 text-sm text-gray-400">{animal?.sex === 'Female'
                  ? `Sire: ${getAnimalName(repro.sire_id)}`
                  : `Dam: ${getAnimalName(repro.dam_id)}`}
                </p>
                <p className="mt-2 text-sm text-gray-400">Due Date: {repro.due_date || 'N/A'}</p>
              </div>
            ))}
            {filteredReproductions.length === 0 && (
              <p className="text-sm text-gray-500">No breeding records found for the selected year.</p>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Offspring Selector</h3>
            <div className="mt-4">
              <select
                value={selectedBirthId}
                onChange={(e) => setSelectedBirthId(e.target.value)}
                className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded-xl px-3 py-2"
              >
                <option value="">Select offspring</option>
                {birthsList.map((birth) => (
                  <option key={birth.id} value={birth.id}>
                    {birth.offspring_name || `Offspring #${birth.id}`} • {birth.offspring_sex}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Offspring Viewer</h3>
            {selectedBirth ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-400">Name: <span className="text-gray-100">{selectedBirth.offspring_name || 'Unnamed'}</span></p>
                <p className="text-sm text-gray-400">Sex: <span className="text-gray-100">{selectedBirth.offspring_sex || 'Unknown'}</span></p>
                <p className="text-sm text-gray-400">Born: <span className="text-gray-100">{selectedBirth.birth_date}</span></p>
                <p className="text-sm text-gray-400">Parent: <span className="text-gray-100">
                  {animal?.sex === 'Female' ? getAnimalName(selectedBirth.sire_id) : getAnimalName(selectedBirth.dam_id)}
                </span></p>
                {selectedBirth.birth_weight && <p className="text-sm text-gray-400">Weight: <span className="text-gray-100">{selectedBirth.birth_weight} lbs</span></p>}
                {selectedBirth.birth_notes && <p className="text-sm text-gray-500">{selectedBirth.birth_notes}</p>}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">Select an offspring to view details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
