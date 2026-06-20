'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { StationData } from '@/types';
import StationCard from '@/components/StationCard';
import {
  Cpu,
  Database,
  Activity,
  Search,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Bell,
  BellRing,
} from 'lucide-react';

function useAudioAlarm() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  const playBeep = useCallback(() => {
    if (isPlayingRef.current) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      isPlayingRef.current = true;
      
      const playTone = (startTime: number, freq: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      playTone(now, 880, 0.15);
      playTone(now + 0.2, 880, 0.15);
      playTone(now + 0.4, 880, 0.15);
      
      setTimeout(() => {
        isPlayingRef.current = false;
      }, 800);
      
    } catch (e) {
      console.log('Audio not available');
    }
  }, []);

  return { playBeep };
}

export default function Home() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NR' | 'LT' | 'TEST_BENCH' | 'SPECIAL'>('ALL');
  const [viewTab, setViewTab] = useState<'hmi' | 'architecture' | 'guidelines'>('hmi');
  const [muteAlarms, setMuteAlarms] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [timeStr, setTimeStr] = useState('00:00:00');
  const [lastAlarmCount, setLastAlarmCount] = useState(0);
  
  const { playBeep } = useAudioAlarm();
  const prevStationsRef = useRef<StationData[]>([]);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      setTimeStr(`${hh}:${mm}:${ss}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let socket: Socket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectSocket = () => {
      socket = io({
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 15000,
      });

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });

      socket.on('connect_error', () => {
        setIsConnected(false);
      });

      socket.on('stationUpdate', (data: StationData[]) => {
        setStations(data);
        
        const prevStations = prevStationsRef.current;
        const prevOfflineIds = new Set(prevStations.filter(s => s.plcStatus === 'OFFLINE').map(s => s.id));
        const newOfflineStations = data.filter(s => s.plcStatus === 'OFFLINE' && !prevOfflineIds.has(s.id));
        
        if (newOfflineStations.length > 0 && !muteAlarms) {
          playBeep();
        }
        
        prevStationsRef.current = data;
      });
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [muteAlarms, playBeep]);

  const handleTogglePlc = (id: string) => {
    if (stations.length > 0) {
      const s = io();
      s.emit('togglePlc', id);
      setTimeout(() => s.disconnect(), 100);
    }
  };

  const handleToggleDb = (id: string) => {
    if (stations.length > 0) {
      const s = io();
      s.emit('toggleDb', id);
      setTimeout(() => s.disconnect(), 100);
    }
  };

  const handleTriggerCycle = (id: string) => {
    if (stations.length > 0) {
      const s = io();
      s.emit('triggerCycle', id);
      setTimeout(() => s.disconnect(), 100);
    }
  };

  const handleGlobalDbToggle = () => {
    if (stations.length > 0) {
      const s = io();
      s.emit('globalDbToggle');
      setTimeout(() => s.disconnect(), 100);
    }
  };

  const handleMassTogglePlc = (target: 'ONLINE' | 'OFFLINE') => {
    if (stations.length > 0) {
      const s = io();
      stations.forEach(st => {
        if (st.plcStatus !== target) {
          s.emit('togglePlc', st.id);
        }
      });
      setTimeout(() => s.disconnect(), 500);
    }
  };

  const totalStationsCount = stations.length;
  const onlinePlcsCount = useMemo(() => stations.filter(s => s.plcStatus === 'ONLINE').length, [stations]);
  const connectedDbsCount = useMemo(() => stations.filter(s => s.dbStatus === 'CONNECTED').length, [stations]);
  const hasAlarms = useMemo(() => stations.some(s => s.plcStatus === 'OFFLINE'), [stations]);
  const offlineStations = useMemo(() => stations.filter(s => s.plcStatus === 'OFFLINE'), [stations]);
  const ngStations = useMemo(() => stations.filter(s => s.metrics.okStatus === 'NG'), [stations]);
  const hasNgAlarms = ngStations.length > 0;

  const filteredStations = useMemo(() => {
    return stations.filter(st => {
      let typeMatches = true;
      if (activeFilter === 'NR') typeMatches = st.type === 'NR';
      else if (activeFilter === 'LT') typeMatches = st.type === 'LT';
      else if (activeFilter === 'TEST_BENCH') typeMatches = st.type === 'TEST_BENCH';
      else if (activeFilter === 'SPECIAL') {
        typeMatches = st.type === 'SPECIAL_CIRCLIP' || st.type === 'SPECIAL_OIL_INJECTOR';
      }

      const query = searchQuery.toLowerCase().trim();
      const searchMatches = query === '' ||
        st.name.toLowerCase().includes(query) ||
        st.ip.includes(query) ||
        (st.metrics.engineNo && st.metrics.engineNo.toLowerCase().includes(query)) ||
        (st.metrics.egNo && st.metrics.egNo.toLowerCase().includes(query));

      return typeMatches && searchMatches;
    });
  }, [stations, searchQuery, activeFilter]);

  useEffect(() => {
    if ((hasAlarms || hasNgAlarms) && !muteAlarms) {
      const interval = setInterval(() => {
        playBeep();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [hasAlarms, hasNgAlarms, muteAlarms, playBeep]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col select-none selection:bg-sky-600 selection:text-white">
      <header className="bg-slate-900/50 border-b border-slate-800 shrink-0 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1700px] mx-auto px-4 py-3 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-sky-400">
                  <Cpu size={22} className={isConnected ? 'animate-pulse' : ''} />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white leading-none">
                  HMI<span className="text-sky-500">CONTROL</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-mono mt-1 tracking-wider uppercase font-semibold">
                  ENGINE ASSEMBLY LINE CONTROL V4.0
                </p>
              </div>
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-800 mx-2"></div>

            <div className="hidden md:flex gap-6 items-center">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">System Load</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full animate-pulse" style={{ width: `${Math.min(100, (onlinePlcsCount / Math.max(1, totalStationsCount)) * 100)}%`, transition: 'width 0.5s ease' }}></div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-sky-400">{totalStationsCount > 0 ? Math.round((onlinePlcsCount / totalStationsCount) * 100) : 0}%</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">DB Cluster</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-[10px] font-mono text-slate-300 font-semibold uppercase">ORACLE_PRIMARY_ON</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-950/80 border border-slate-800/80 p-1.5 rounded-xl shrink-0">
            <button
              onClick={() => setViewTab('hmi')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-medium tracking-tight transition-all duration-150 ${
                viewTab === 'hmi' ? 'bg-sky-600 text-white shadow-md shadow-sky-950/30 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity size={13} />
              Live Grid Panel
            </button>
          </div>

          <div className="flex items-center gap-4 text-right shrink-0">
            <div className="hidden lg:flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Current Shift</span>
              <span className="text-[11px] font-semibold text-white tracking-wide mt-0.5">SHIFT-A [06:00 - 14:00]</span>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

            <div className="text-xl md:text-2xl font-mono font-bold text-white tabular-nums tracking-wider bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800/80 shadow-inner">
              {timeStr}
            </div>

            <button
              onClick={() => setMuteAlarms(!muteAlarms)}
              className={`p-2.5 rounded-lg border transition ${
                (hasAlarms || hasNgAlarms) && !muteAlarms
                  ? 'bg-red-900/40 text-red-400 border-red-500/50 animate-pulse'
                  : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-400'
              }`}
              title={muteAlarms ? 'Unmute Alarms' : 'Mute Alarms'}
            >
              {(hasAlarms || hasNgAlarms) && !muteAlarms ? (
                <BellRing size={15} className="animate-bounce" />
              ) : muteAlarms ? (
                <VolumeX size={15} />
              ) : (
                <Bell size={15} />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6 max-w-[1600px] w-full mx-auto flex flex-col gap-6">
        {(hasAlarms || hasNgAlarms) && (
          <div className="bg-red-950/60 border-2 border-red-500/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse shadow-xl shadow-red-950/30">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-red-600 rounded-full text-white animate-bounce">
                <ShieldAlert size={22} />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-red-400 text-xs font-mono font-bold tracking-widest uppercase">
                  CRITICAL ALARM - {hasNgAlarms ? 'QUALITY FAILURE' : 'PLC NETWORK LOSS'}
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {hasAlarms && <>Offline PLC: <span className="text-red-300 font-mono">{offlineStations.map(st => st.name).join(', ')}</span></>}
                  {hasAlarms && hasNgAlarms && ' | '}
                  {hasNgAlarms && <>Failed Units: <span className="text-orange-300 font-mono">{ngStations.map(st => st.name).join(', ')}</span></>}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Alarm active! Sound: {(hasAlarms || hasNgAlarms) && !muteAlarms ? 'ENABLED' : 'MUTED'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {hasAlarms && (
                <button
                  onClick={() => handleMassTogglePlc('ONLINE')}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-red-400 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1"
                >
                  <CheckCircle2 size={12} />
                  Restore PLCs
                </button>
              )}
            </div>
          </div>
        )}

        {viewTab === 'hmi' && (
          <>
            <section className="grid grid-cols-1 xl:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Scanned Field PLCs</span>
                  <div className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-baseline gap-1 mt-1">
                    <span className={onlinePlcsCount < totalStationsCount ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}>
                      {totalStationsCount > 0 ? onlinePlcsCount : <Loader2 size={16} className="animate-spin inline" />}
                    </span>
                    <span className="text-xs text-slate-500">/ {totalStationsCount} Active</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    Ratio: {totalStationsCount > 0 ? ((onlinePlcsCount / totalStationsCount) * 100).toFixed(0) : '0'}% online
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-950/40 rounded-lg text-emerald-400 border border-emerald-900/30">
                  <Cpu size={18} />
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Telemetry db pipelines</span>
                  <div className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-baseline gap-1 mt-1">
                    <span className="text-sky-400">{connectedDbsCount}</span>
                    <span className="text-xs text-slate-500">/ {totalStationsCount} Synced</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    Oracle XE Instance pool
                  </span>
                </div>
                <div className="p-2.5 bg-sky-950/40 rounded-lg text-sky-400 border border-sky-900/30">
                  <Database size={18} />
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Line Assembly Speed</span>
                  <div className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-baseline gap-1 mt-1">
                    <span className="text-yellow-400">{onlinePlcsCount > 8 ? '45' : '0'}</span>
                    <span className="text-xs text-slate-500">JPH</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    Takt Time: {onlinePlcsCount > 8 ? '80.2 sec' : 'STALLED'}
                  </span>
                </div>
                <div className="p-2.5 bg-yellow-950/40 rounded-lg text-yellow-400 border border-yellow-900/30">
                  <Activity size={18} />
                </div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-amber-500 tracking-wider">HMI SANDBOX</span>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleGlobalDbToggle}
                    className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-[10px] font-mono flex items-center justify-center gap-1 hover:text-white"
                    disabled={stations.length === 0}
                  >
                    <Database size={11} />
                    Toggle DBs
                  </button>
                  <button
                    onClick={() => handleMassTogglePlc('OFFLINE')}
                    className="px-2 py-1.5 bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 text-slate-300 rounded border border-slate-800 text-[10px] font-mono flex items-center justify-center gap-1"
                    disabled={stations.length === 0}
                  >
                    <ShieldAlert size={11} />
                    Fail All
                  </button>
                </div>
              </div>
            </section>

            <section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                <span className="text-[10px] font-mono text-slate-500 uppercase mr-1 hidden sm:inline">Station Category:</span>
                {[
                  { id: 'ALL', label: 'All Stations' },
                  { id: 'NR', label: 'N.R (Nut Runners)' },
                  { id: 'LT', label: 'L.T (Leak Test)' },
                  { id: 'TEST_BENCH', label: 'Test Benches' },
                  { id: 'SPECIAL', label: 'Special Units' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveFilter(item.id as any)}
                    className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg transition whitespace-nowrap border ${
                      activeFilter === item.id
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-80 shrink-0">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Search size={13} />
                </span>
                <input
                  type="text"
                  placeholder="Filter station, IP, Engine, or EG No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500 transition"
                />
              </div>
            </section>

            <section className="relative">
              {stations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
                  <Loader2 className="animate-spin text-blue-500 mb-4" size={36} />
                  <p className="text-sm text-slate-400 font-mono">Connecting to telemetry broker...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredStations.map((station) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      onTogglePlc={handleTogglePlc}
                      onToggleDb={handleToggleDb}
                      onTriggerCycle={handleTriggerCycle}
                    />
                  ))}

                  {filteredStations.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                      No stations match configuration query: &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="bg-slate-950 border-t border-slate-900/60 py-4 mt-auto">
        <div className="max-w-[1600px] mx-auto px-6 text-center md:text-left flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
          <span>HMI Control Dashboard © PT. UNITECH 2026</span>
          <span className={isConnected ? 'text-emerald-500' : 'text-rose-500'}>
            {isConnected ? '● CONNECTED' : '○ DISCONNECTED'}
          </span>
        </div>
      </footer>
    </div>
  );
}
