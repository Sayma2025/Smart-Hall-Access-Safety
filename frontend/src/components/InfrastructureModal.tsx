import React, { useState } from 'react';
import { X, Building2, Home, QrCode, Check, AlertCircle } from 'lucide-react';
import { Hall } from '../types';

interface InfrastructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  halls: Hall[];
  onCreateHall: (data: any) => Promise<void>;
  onCreateRoom: (data: any) => Promise<void>;
  onCreateGate: (data: any) => Promise<void>;
}

export const InfrastructureModal: React.FC<InfrastructureModalProps> = ({
  isOpen,
  onClose,
  halls,
  onCreateHall,
  onCreateRoom,
  onCreateGate,
}) => {
  const [activeTab, setActiveTab] = useState<'HALL' | 'ROOM' | 'GATE'>('HALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hall form
  const [hallForm, setHallForm] = useState({
    name: '',
    code: '',
    gender: 'FEMALE',
    capacity: 500,
    provostName: 'Dr. Sultana Razia',
    curfewTime: '20:00',
  });

  // Room form
  const [roomForm, setRoomForm] = useState({
    hallId: halls[0]?._id || '',
    roomNumber: '',
    block: 'Block B',
    floor: 3,
    capacity: 4,
  });

  // Gate form
  const [gateForm, setGateForm] = useState({
    name: '',
    code: '',
    hallId: halls[0]?._id || '',
    location: '',
    gateType: 'PEDESTRIAN',
    status: 'ACTIVE',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'HALL') {
        await onCreateHall({
          ...hallForm,
          capacity: Number(hallForm.capacity),
        });
      } else if (activeTab === 'ROOM') {
        await onCreateRoom({
          ...roomForm,
          hallId: roomForm.hallId || halls[0]?._id,
          floor: Number(roomForm.floor),
          capacity: Number(roomForm.capacity),
        });
      } else {
        await onCreateGate({
          ...gateForm,
          hallId: gateForm.hallId || halls[0]?._id,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800/80 p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Infrastructure Configuration</h3>
              <p className="text-xs text-slate-400">Configure Halls, Rooms, and Access Gates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-3 p-1 m-5 mb-0 bg-slate-800/60 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('HALL');
              setError(null);
            }}
            className={`py-2 rounded-lg transition ${
              activeTab === 'HALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            New Hall
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ROOM');
              setError(null);
            }}
            className={`py-2 rounded-lg transition ${
              activeTab === 'ROOM' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            New Room
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('GATE');
              setError(null);
            }}
            className={`py-2 rounded-lg transition ${
              activeTab === 'GATE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            New Gate
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: HALL */}
          {activeTab === 'HALL' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hall Name *</label>
                <input
                  type="text"
                  required
                  value={hallForm.name}
                  onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                  placeholder="e.g. Begum Rokeya Hall"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={hallForm.code}
                    onChange={(e) => setHallForm({ ...hallForm, code: e.target.value })}
                    placeholder="e.g. BRH"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Capacity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={hallForm.capacity}
                    onChange={(e) => setHallForm({ ...hallForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Provost Name</label>
                  <input
                    type="text"
                    value={hallForm.provostName}
                    onChange={(e) => setHallForm({ ...hallForm, provostName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Curfew Time (HH:mm)</label>
                  <input
                    type="text"
                    value={hallForm.curfewTime}
                    onChange={(e) => setHallForm({ ...hallForm, curfewTime: e.target.value })}
                    placeholder="20:00"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROOM */}
          {activeTab === 'ROOM' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Hall *</label>
                <select
                  value={roomForm.hallId}
                  onChange={(e) => setRoomForm({ ...roomForm, hallId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {halls.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Block *</label>
                  <input
                    type="text"
                    required
                    value={roomForm.block}
                    onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })}
                    placeholder="e.g. Block B"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                    placeholder="e.g. 402"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Floor Level</label>
                  <input
                    type="number"
                    min={0}
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GATE */}
          {activeTab === 'GATE' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gate Name *</label>
                  <input
                    type="text"
                    required
                    value={gateForm.name}
                    onChange={(e) => setGateForm({ ...gateForm, name: e.target.value })}
                    placeholder="e.g. North Pedestrian Gate"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={gateForm.code}
                    onChange={(e) => setGateForm({ ...gateForm, code: e.target.value })}
                    placeholder="e.g. GATE-03"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Location Details *</label>
                <input
                  type="text"
                  required
                  value={gateForm.location}
                  onChange={(e) => setGateForm({ ...gateForm, location: e.target.value })}
                  placeholder="e.g. North Boundary beside Science Faculty"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gate Type</label>
                  <select
                    value={gateForm.gateType}
                    onChange={(e) => setGateForm({ ...gateForm, gateType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="PEDESTRIAN">Pedestrian Entrance</option>
                    <option value="VEHICULAR">Vehicular / Transport</option>
                    <option value="EMERGENCY">Emergency Exit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={gateForm.status}
                    onChange={(e) => setGateForm({ ...gateForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">Active (Operational)</option>
                    <option value="LOCKED">Locked</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Configuration...' : `Create ${activeTab}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
