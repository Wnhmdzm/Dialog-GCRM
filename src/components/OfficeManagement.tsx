import React, { useState } from 'react';
import { Store } from '../utils/store';
import { OfficeSite, User } from '../types';
import { MapPin, Plus, Trash2, Shield, Info, Navigation, Map } from 'lucide-react';

interface OfficeManagementProps {
  currentUser: User;
}

export default function OfficeManagement({ currentUser }: OfficeManagementProps) {
  const [offices, setOffices] = useState<OfficeSite[]>(() => Store.getOffices());

  // Form State
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('100');
  const [address, setAddress] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshOffices = () => {
    setOffices(Store.getOffices());
  };

  const handleAddOffice = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please provide a descriptive office site name.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const radNum = parseInt(radiusMeters);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Please input a valid latitude (-90 to 90).');
      return;
    }

    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setError('Please input a valid longitude (-180 to 180).');
      return;
    }

    if (isNaN(radNum) || radNum < 10 || radNum > 5000) {
      setError('Please define a reasonable geofencing radius (10m to 5000m).');
      return;
    }

    const newOffice: OfficeSite = {
      id: `site-${Date.now()}`,
      name: name.trim(),
      latitude: latNum,
      longitude: lonNum,
      radiusMeters: radNum,
      address: address.trim() || 'Custom Job Site Address'
    };

    const currentList = Store.getOffices();
    const updated = [...currentList, newOffice];
    Store.saveOffices(updated);
    
    // Log Activity
    Store.logActivity(
      currentUser.id,
      currentUser.name,
      'admin',
      'SITE_CREATE',
      `Provisioned new office location site: "${newOffice.name}" with a geofence limit of ${newOffice.radiusMeters}m.`
    );

    setName('');
    setLatitude('');
    setLongitude('');
    setRadiusMeters('100');
    setAddress('');
    setSuccess(`Successfully added office geofence site: "${newOffice.name}"!`);
    refreshOffices();
  };

  const handleDeleteOffice = (id: string, siteName: string) => {
    if (confirm(`Are you sure you want to delete the office geofence for "${siteName}"? Employee attendance gating for this site will be removed.`)) {
      const updated = Store.getOffices().filter(o => o.id !== id);
      Store.saveOffices(updated);

      // Log Activity
      Store.logActivity(
        currentUser.id,
        currentUser.name,
        'admin',
        'SITE_DELETE',
        `De-authorized and removed office site: "${siteName}" from geolocation gating parameters.`
      );

      setSuccess(`Removed office geofence site "${siteName}".`);
      refreshOffices();
    }
  };

  // Prefill handy coordinates for testing
  const prefillLocation = (siteName: string, lat: string, lon: string, addr: string) => {
    setName(siteName);
    setLatitude(lat);
    setLongitude(lon);
    setAddress(addr);
    setRadiusMeters('150');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-left animate-fade-in">
      
      {/* List Existing geofenced locations */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500 shrink-0" />
              Active Office Geofences ({offices.length})
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Employees must be physically present inside these boundary circles to clock in or out.</p>
          </div>
        </div>

        {offices.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl text-gray-400 text-xs font-medium shadow-[0_12px_30px_rgba(0,0,0,0.035)]">
            No office sites defined. Admins must set up at least one office site so staff can clock in.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offices.map((office) => (
              <div key={office.id} className="p-5 bg-white rounded-3xl hover:translate-y-[-3px] shadow-[0_12px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                
                <div className="flex items-start justify-between">
                  <div className="space-y-1 pr-6 text-left">
                    <h4 className="text-xs font-semibold text-gray-900 tracking-tight">{office.name}</h4>
                    <p className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">{office.address}</p>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteOffice(office.id, office.name)}
                    className="p-2 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-500 border border-gray-200 rounded-xl transition shadow-sm shrink-0"
                    title="Delete office site"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] border-t border-gray-100 pt-3.5 font-mono text-gray-500 text-left">
                  <div>
                    <span className="text-[9px] text-gray-400 block font-sans font-medium tracking-wide">Coordinates</span>
                    <span className="font-semibold text-gray-800">{office.latitude.toFixed(4)}, {office.longitude.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block font-sans font-medium tracking-wide">Fence Boundary</span>
                    <span className="text-blue-600 font-semibold bg-blue-50/50 px-2 py-0.5 rounded-full text-[9px] inline-block mt-0.5">Within {office.radiusMeters}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl flex gap-3 items-start shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 text-left leading-relaxed font-medium">
            <strong className="text-blue-900 font-semibold tracking-wide block mb-1">How verification works:</strong> The system queries the device Geolocation API, calculates the ellipsoidal distance using the Haversine formula against all office coordinates, and approves the punch-in ONLY if the distance to any office is less than its configured boundary radius.
          </div>
        </div>
      </div>

      {/* Creation form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.035)] transition-all duration-300 hover:translate-y-[-3px] hover:shadow-[0_24px_48px_rgba(0,0,0,0.07)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Plus className="h-4 w-4 text-blue-500 shrink-0" />
            Add New Office Site
          </h3>

          <form onSubmit={handleAddOffice} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs text-left font-medium">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs text-left font-medium">
                {success}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Site/Office Name</label>
              <input
                type="text"
                placeholder="e.g. New York Logistics Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition font-medium text-gray-950 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Latitude</label>
                <input
                  type="text"
                  placeholder="e.g. 40.7128"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition font-mono font-medium text-gray-950 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Longitude</label>
                <input
                  type="text"
                  placeholder="e.g. -74.0060"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition font-mono font-medium text-gray-950 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Authorized Radius</label>
              <select
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition text-gray-950 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400"
              >
                <option value="50">50 meters (High Security)</option>
                <option value="100">100 meters (Default Office)</option>
                <option value="150">150 meters (Standard Block)</option>
                <option value="250">250 meters (Large Campus)</option>
                <option value="500">500 meters (Warehouse District)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Street Address</label>
              <textarea
                rows={2}
                placeholder="Street name, State, Postal code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition resize-none font-medium text-gray-950 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-sm shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15 flex items-center justify-center gap-1.5 border-none"
            >
              <Plus className="h-4 w-4" />
              Save Geofence Location
            </button>
          </form>

          {/* Quick Lat/Lon templates for Testing */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-left">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-3">Insert Sample Locations</span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => prefillLocation('Kuala Lumpur Tech Office', '3.1390', '101.6869', 'Sentral Hub, Kuala Lumpur, MY')}
                className="w-full text-left p-2.5 bg-gray-50 hover:bg-gray-100/60 border border-gray-200 rounded-xl text-[10px] text-gray-800 font-medium transition flex items-center justify-between shadow-sm"
              >
                <span>Kuala Lumpur (MY)</span>
                <span className="text-blue-600 font-mono font-semibold">3.1390, 101.6869</span>
              </button>
              <button
                type="button"
                onClick={() => prefillLocation('New York Times Square Hub', '40.7580', '-73.9855', 'Times Square, Manhattan, NY')}
                className="w-full text-left p-2.5 bg-gray-50 hover:bg-gray-100/60 border border-gray-200 rounded-xl text-[10px] text-gray-800 font-medium transition flex items-center justify-between shadow-sm"
              >
                <span>New York (US)</span>
                <span className="text-blue-600 font-mono font-semibold">40.7580, -73.9855</span>
              </button>
              <button
                type="button"
                onClick={() => prefillLocation('Tokyo Shibuya Substation', '35.6580', '139.7016', 'Shibuya Gate, Tokyo, JP')}
                className="w-full text-left p-2.5 bg-gray-50 hover:bg-gray-100/60 border border-gray-200 rounded-xl text-[10px] text-gray-800 font-medium transition flex items-center justify-between shadow-sm"
              >
                <span>Tokyo (JP)</span>
                <span className="text-blue-600 font-mono font-semibold">35.6580, 139.7016</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
