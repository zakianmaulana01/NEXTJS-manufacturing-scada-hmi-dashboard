'use client';

import { StationData } from '@/types';
import { Radio, Database, Play, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StationCardProps {
  station: StationData;
  onTogglePlc: (id: string) => void;
  onToggleDb: (id: string) => void;
  onTriggerCycle: (id: string) => void;
}

export default function StationCard({
  station,
  onTogglePlc,
  onToggleDb,
  onTriggerCycle,
}: StationCardProps) {
  const isOnline = station.plcStatus === 'ONLINE';
  const isDbConnected = station.dbStatus === 'CONNECTED';
  const [flash, setFlash] = useState(false);
  
  useEffect(() => {
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 300);
    return () => clearTimeout(timer);
  }, [station.metrics, station.lastUpdate]);

  const renderMetrics = () => {
    if (!isOnline) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-2 text-center text-white select-none">
          <svg className="w-8 h-8 text-white opacity-70 mb-1.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <span className="text-xs font-bold text-white text-center leading-tight tracking-wider font-mono">
            PLC NOT ONLINE
            <span className="text-[9px] block opacity-85 mt-1 font-normal font-mono">Host: {station.ip}</span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlc(station.id);
            }}
            className="mt-3 px-2 py-0.5 bg-white/20 hover:bg-white/35 border border-white/30 rounded text-[10px] font-mono font-medium tracking-tight transition"
          >
            RESTORE PLC LINK
          </button>
        </div>
      );
    }

    switch (station.type) {
      case 'NR':
        return (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
              <span>EG No.</span>
              <span className={`font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/60 px-1.5 py-0.5 rounded tracking-wide text-xs transition-all ${flash ? 'scale-105' : ''}`}>
                {station.metrics.egNo || '0000000000000'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-mono">CYCLE REGISTRY:</span>
              <span className="font-mono text-[10px] text-slate-300">MODBUS ADR 4001</span>
            </div>
          </div>
        );

      case 'LT':
        return (
          <div className="flex flex-col gap-2 pt-1 font-mono">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className={`bg-slate-950/70 border border-slate-900 px-2 py-1 rounded transition-all ${flash ? 'border-sky-500/50' : ''}`}>
                <span className="text-slate-500 text-[10px] block">LEAK TEST</span>
                <span className={`font-bold text-slate-200 transition-all ${flash ? 'text-sky-400 scale-105 inline-block' : ''}`}>
                  {station.metrics.leakTest !== undefined ? `+${station.metrics.leakTest.toFixed(2)}` : '0.00'}
                </span>
                <span className="text-[9px] text-slate-500 block">cc/m</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-900 px-2 py-1 rounded">
                <span className="text-slate-500 text-[10px] block">CHANNEL</span>
                <span className="font-bold text-slate-200">{station.metrics.channel || '1'}</span>
                <span className="text-[9px] text-slate-500 block">LIMIT: {station.metrics.tolerance || '0.00'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
              <span className="text-[11px] text-slate-400">ENGINE NO:</span>
              <span className={`text-xs font-medium transition-all ${flash ? 'text-yellow-300' : 'text-slate-200'}`}>{station.metrics.engineNo || '---'}</span>
            </div>
          </div>
        );

      case 'TEST_BENCH':
        return (
          <div className="flex flex-col gap-1.5 pt-1 font-mono text-[11px]">
            <div className={`grid grid-cols-2 gap-1 bg-slate-950/50 p-1.5 rounded border border-slate-900/60 transition-all ${flash ? 'border-emerald-500/50' : ''}`}>
              <div>
                <span className="text-slate-500 text-[10px]">RPM</span>
                <span className={`font-bold text-slate-200 block text-xs transition-all ${flash ? 'text-emerald-400 scale-105' : ''}`}>{station.metrics.rpm || '0'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">OIL PRESS</span>
                <span className={`font-bold text-slate-200 block text-xs transition-all ${flash ? 'text-sky-400 scale-105' : ''}`}>{station.metrics.oilPressure !== undefined ? `${station.metrics.oilPressure} bar` : '0'}</span>
              </div>
              <div className="mt-1">
                <span className="text-slate-500 text-[10px]">COMP</span>
                <span className={`font-bold text-slate-200 block text-xs transition-all ${flash ? 'text-yellow-400 scale-105' : ''}`}>{station.metrics.compression || '0'} psi</span>
              </div>
              <div className="mt-1">
                <span className="text-slate-500 text-[10px]">LOAD</span>
                <span className={`font-bold text-slate-200 block text-xs transition-all ${flash ? 'text-orange-400 scale-105' : ''}`}>{station.metrics.load || '0'} %</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1 text-[10px] border-t border-slate-900 pt-1">
              <span className="text-slate-400">ENGINE:</span>
              <span className={`font-semibold transition-all ${flash ? 'text-emerald-300' : 'text-slate-200'}`}>{station.metrics.engineNo || 'STANDBY'}</span>
            </div>
          </div>
        );

      case 'SPECIAL_CIRCLIP':
        return (
          <div className="flex flex-col gap-2 pt-1 font-mono text-[11px]">
            <div className={`flex justify-between items-center bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-900 transition-all ${flash ? 'border-amber-500/50' : ''}`}>
              <div>
                <span className="text-slate-500 text-[10px] block">TOLERANCE</span>
                <span className={`font-bold transition-all ${flash ? 'text-yellow-300 scale-105' : 'text-amber-400'}`}>{station.metrics.tolerance || '+0.1198'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] block">COM LINK</span>
                <span className="text-emerald-400 text-[10px]">Q03UDECPU</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">ENGINE NO:</span>
              <span className="text-slate-200 font-medium">{station.metrics.engineNo || '---'}</span>
            </div>
          </div>
        );

      case 'SPECIAL_OIL_INJECTOR':
        return (
          <div className="flex flex-col gap-2 pt-1 font-mono text-[11px]">
            <div className={`flex justify-between items-center bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-900 transition-all ${flash ? 'border-sky-500/50' : ''}`}>
              <div>
                <span className="text-slate-500 text-[10px] block">VOLUME</span>
                <span className={`font-bold transition-all ${flash ? 'text-cyan-300 scale-105' : 'text-sky-400'}`}>{station.metrics.volume !== undefined ? `${station.metrics.volume} ml` : '0 ml'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] block">COM LINK</span>
                <span className="text-emerald-400 text-[10px]">TCP SOCKET</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">ENGINE NO:</span>
              <span className="text-slate-200 font-medium">{station.metrics.engineNo || '---'}</span>
            </div>
          </div>
        );
    }
  };

  const getStatusBadge = () => {
    if (!isOnline) {
      return (
        <span className="bg-white/15 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight animate-pulse text-white">
          PLC ERROR
        </span>
      );
    }

    const stClass = station.metrics.okStatus;
    if (stClass === 'NG') {
      return (
        <span className="bg-red-600 text-white border border-red-400 px-2 py-0.5 rounded text-[10px] font-mono font-extrabold tracking-wider animate-pulse">
          NG (FAIL)
        </span>
      );
    }
    if (stClass === 'OF') {
      return (
        <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-tight">
          IDLE
        </span>
      );
    }
    return (
      <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/80 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-tight">
        PASS (OK)
      </span>
    );
  };

  const cardStyle = isOnline
    ? 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400/80 shadow-md shadow-emerald-950/20 translate-y-0 transition-all duration-200 hover:-translate-y-0.5'
    : 'bg-rose-950/90 border-2 border-rose-500 shadow-lg text-white animate-pulse shadow-red-950/40';

  return (
    <div
      id={`station-card-${station.id}`}
      className={`border rounded-xl p-4 flex flex-col justify-between ${cardStyle} h-52 relative group overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${isOnline ? 'bg-emerald-500/50' : 'bg-rose-500/70'}`} />

      <div>
        <div className="flex items-start justify-between gap-1.5">
          <div className="truncate">
            <span className="text-[10px] font-mono text-emerald-400/70 tracking-wider block group-hover:text-amber-300 font-bold transition-all truncate uppercase">
              {station.type === 'NR' ? 'NUT RUNNER' : station.type === 'LT' ? 'LEAK TESTER' : station.type === 'TEST_BENCH' ? 'TEST BENCH' : 'SPECIALIST'}
            </span>
            <h4 className="font-bold text-sm tracking-tight text-white mt-0.5 truncate uppercase">
              {station.name}
            </h4>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {getStatusBadge()}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-2 font-mono text-[9px] text-slate-400 flex-wrap">
          <button
            onClick={() => onTogglePlc(station.id)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35 border border-emerald-500/30'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
            }`}
            title={`Click to Toggle PLC Status (IP: ${station.ip})`}
          >
            <Radio size={10} className={`${isOnline ? 'animate-pulse text-emerald-400' : 'text-white'}`} />
            PLC {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          <button
            onClick={() => onToggleDb(station.id)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
              isDbConnected
                ? 'bg-sky-950/60 text-sky-400 hover:bg-sky-900/30 border border-sky-800/40'
                : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/30 border border-rose-900/30'
            }`}
            title="Click to Toggle Oracle DB Synced status"
          >
            <Database size={10} />
            ORA {isDbConnected ? 'DB' : 'NO DB'}
          </button>
        </div>
      </div>

      <div className="my-2.5 flex-grow justify-end flex flex-col">
        {renderMetrics()}
      </div>

      {isOnline && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex items-center justify-between text-xs">
          <span className="font-mono text-[9px] text-slate-500 truncate">{station.ip}</span>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onTriggerCycle(station.id)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-mono font-medium transition"
              title="Manual Telemetry Trigger"
            >
              <Play size={10} />
              Cycle
            </button>
            <button
              onClick={() => onTogglePlc(station.id)}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-white rounded text-[10px] font-mono font-medium border border-slate-700 transition"
              title="Force PLC Disconnect Fault"
            >
              <Wrench size={10} />
              Kill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
