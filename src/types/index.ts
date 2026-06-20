/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StationType = 'NR' | 'LT' | 'TEST_BENCH' | 'SPECIAL_CIRCLIP' | 'SPECIAL_OIL_INJECTOR';

export interface StationMetrics {
  // Common
  engineNo?: string;
  
  // N.R (Nut Runner) Stations
  egNo?: string;
  
  // L.T (Leak Test) Stations + Circlip/Oil Injector
  leakTest?: number;
  channel?: number;
  tolerance?: string;
  volume?: number;
  
  // Test Bench Stations
  rpm?: number;
  oilPressure?: number;
  compression?: number;
  load?: number;
  
  // Status check
  okStatus?: 'OK' | 'NG' | 'OF'; // OF = Off/Idle, OK = Pass, NG = No Good (Failed)
}

export interface StationData {
  id: string;
  name: string;
  ip: string;
  type: StationType;
  plcStatus: 'ONLINE' | 'OFFLINE';
  dbStatus: 'CONNECTED' | 'DISCONNECTED';
  metrics: StationMetrics;
  lastUpdate: string;
}

export interface ServerToClientEvents {
  stationUpdate: (data: StationData[]) => void;
  statusChange: (data: { id: string; plcStatus: 'ONLINE' | 'OFFLINE'; dbStatus: 'CONNECTED' | 'DISCONNECTED' }) => void;
  dbGlobalChange: (status: 'CONNECTED' | 'DISCONNECTED') => void;
}

export interface ClientToServerEvents {
  togglePlc: (id: string) => void;
  toggleDb: (id: string) => void;
  globalDbToggle: () => void;
  triggerCycle: (id: string) => void;
}
