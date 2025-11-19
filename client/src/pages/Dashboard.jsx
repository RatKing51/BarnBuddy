import React, { useState } from 'react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('general');
  const [sidebarTab, setSidebarTab] = useState('animals');

  return (
    <div className="min-h-screen bg-[#0A1128] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-[#5170FF]/30 pb-4">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-white">
            <span className="text-[#5170FF]">Barn</span>Buddy.
          </h1>
          <span className="text-[#D9D9DD] text-sm">Dashboard</span>
        </div>
        
        <div className="flex-1 px-8">
          <div className="bg-[#101D42] border border-[#5170FF]/30 rounded-lg p-4 text-center">
            <p className="text-[#D9D9DD] text-sm">Basic Stats about farm go here</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[#D9D9DD] text-sm">Date & Time</p>
          <p className="text-[#5170FF] font-semibold">November 18, 2025</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="col-span-1 h-[600px] flex flex-col">
          {/* Animals/Herd Tabs */}
          <div className="bg-[#101D42] border border-[#5170FF]/30 rounded-lg mb-4">
            <div className="grid grid-cols-2 border-b border-[#5170FF]/30">
              <button
                onClick={() => setSidebarTab('animals')}
                className={`py-3 text-sm font-medium transition-colors rounded-lg ${
                  sidebarTab === 'animals'
                    ? 'bg-[#5170FF] text-white'
                    : 'text-[#D9D9DD] hover:bg-[#5170FF]/20'
                }`}
              >
                Animals
              </button>
              <button
                onClick={() => setSidebarTab('herd')}
                className={`py-3 text-sm font-medium transition-colors rounded-lg ${
                  sidebarTab === 'herd'
                    ? 'bg-[#5170FF] text-white'
                    : 'text-[#D9D9DD] hover:bg-[#5170FF]/20'
                }`}
              >
                Herd
              </button>
            </div>
          </div>

          {/* Animal List */}
          <div className="bg-[#101D42] border border-[#5170FF]/30 rounded-lg p-4 flex-1">
            <button className="w-full bg-[#5170FF] text-white px-4 py-3 rounded-lg text-left font-medium hover:bg-[#5170FF]/90 transition-colors">
              Animal001
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-3 h-[600px] flex flex-col">
          {/* Content Tabs */}
          <div className="bg-[#101D42] border border-[#5170FF]/30 rounded-lg mb-4">
            <div className="grid grid-cols-3 border-b border-[#5170FF]/30">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 text-sm font-medium transition-colors rounded-lg ${
                  activeTab === 'general'
                    ? 'bg-[#5170FF] text-white'
                    : 'text-[#D9D9DD] hover:bg-[#5170FF]/20'
                }`}
              >
                General Data
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`py-4 text-sm font-medium transition-colors rounded-lg ${
                  activeTab === 'health'
                    ? 'bg-[#5170FF] text-white'
                    : 'text-[#D9D9DD] hover:bg-[#5170FF]/20'
                }`}
              >
                Health Records
              </button>
              <button
                onClick={() => setActiveTab('vet')}
                className={`py-4 text-sm font-medium transition-colors ${
                  activeTab === 'vet'
                    ? 'bg-[#5170FF] text-white'
                    : 'text-[#D9D9DD] hover:bg-[#5170FF]/20'
                }`}
              >
                Vet Visits
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-[#101D42] border border-[#5170FF]/30 rounded-lg p-8 flex-1 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="text-[#D9D9DD]">
                <h2 className="text-white text-xl font-semibold mb-4">General Data</h2>
                <p className="text-sm">General data content goes here</p>
              </div>
            )}
            {activeTab === 'health' && (
              <div className="text-[#D9D9DD]">
                <h2 className="text-white text-xl font-semibold mb-4">Health Records</h2>
                <p className="text-sm">Health records content goes here</p>
              </div>
            )}
            {activeTab === 'vet' && (
              <div className="text-[#D9D9DD]">
                <h2 className="text-white text-xl font-semibold mb-4">Vet Visits</h2>
                <p className="text-sm">Vet visits content goes here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
