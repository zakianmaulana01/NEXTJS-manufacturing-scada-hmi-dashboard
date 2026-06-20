const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let stations = [
  { id: 'nr_balancer', name: 'N.R BALANCER', ip: '192.168.1.10', type: 'NR', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { egNo: 'EG000001928347' }, lastUpdate: new Date().toISOString() },
  { id: 'nr_plug_drain', name: 'N.R PLUG DRAIN', ip: '192.168.1.11', type: 'NR', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { egNo: 'EG000001928348' }, lastUpdate: new Date().toISOString() },
  { id: 'circlip', name: 'CIRCLIP', ip: '192.168.1.12', type: 'SPECIAL_CIRCLIP', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: 'AE54-150855', tolerance: '+0.1198', okStatus: 'OK' }, lastUpdate: new Date().toISOString() },
  { id: 'oil_injector_sec', name: 'OIL INJECTOR', ip: '192.168.1.13', type: 'SPECIAL_OIL_INJECTOR', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: 'AE54-150836', volume: 15, okStatus: 'OK' }, lastUpdate: new Date().toISOString() },
  { id: 'nr_magneto', name: 'N.R MAGNETO', ip: '192.168.1.14', type: 'NR', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { egNo: 'EG000001928349' }, lastUpdate: new Date().toISOString() },
  { id: 'nr_bolt_sprocket', name: 'N.R BOLT SPROCKET', ip: '192.168.1.15', type: 'NR', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { egNo: 'EG000001928350' }, lastUpdate: new Date().toISOString() },
  { id: 'lt_gearbox', name: 'L.T GEARBOX', ip: '192.168.1.16', type: 'LT', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: 'AE54-150865', leakTest: 3.50, channel: 1, okStatus: 'OK', tolerance: '0.00-5.00' }, lastUpdate: new Date().toISOString() },
  { id: 'test_bench_1', name: 'TEST BENCH-1', ip: '192.168.1.17', type: 'TEST_BENCH', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: '', rpm: 0, oilPressure: 0, compression: 0, load: 0, okStatus: 'OF' }, lastUpdate: new Date().toISOString() },
  { id: 'nr_bolt_cap_l', name: 'N.R BOLT CAP L', ip: '192.168.1.18', type: 'NR', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { egNo: 'EG000001928351' }, lastUpdate: new Date().toISOString() },
  { id: 'nr_primary', name: 'N.R PRIMARY', ip: '192.168.1.19', type: 'NR', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { egNo: 'EG000001928352' }, lastUpdate: new Date().toISOString() },
  { id: 'lt_oilroom', name: 'L.T OILROOM', ip: '192.168.1.20', type: 'LT', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: 'AE54-150845', leakTest: 32.55, channel: 1, okStatus: 'OK', tolerance: '0.00-35.00' }, lastUpdate: new Date().toISOString() },
  { id: 'test_bench_2', name: 'TEST BENCH-2', ip: '192.168.1.21', type: 'TEST_BENCH', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: '', rpm: 0, oilPressure: 0, compression: 0, load: 0, okStatus: 'OF' }, lastUpdate: new Date().toISOString() },
  { id: 'lt_water_jacket', name: 'L.T WATER JACKET', ip: '192.168.1.22', type: 'LT', plcStatus: 'OFFLINE', dbStatus: 'CONNECTED', metrics: { engineNo: '', leakTest: undefined, channel: undefined, okStatus: 'OF', tolerance: '0.00-10.00' }, lastUpdate: new Date().toISOString() },
  { id: 'test_bench_3', name: 'TEST BENCH-3', ip: '192.168.1.23', type: 'TEST_BENCH', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: 'AE54-150840', rpm: 1800, oilPressure: 0.36, compression: 11.2, load: 85, okStatus: 'OK' }, lastUpdate: new Date().toISOString() },
  { id: 'nr_sleeve', name: 'N.R SLEEVE', ip: '192.168.1.24', type: 'NR', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { egNo: 'EG000001928353' }, lastUpdate: new Date().toISOString() },
  { id: 'lt_injector', name: 'L.T INJECTOR', ip: '192.168.1.25', type: 'LT', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: 'AE54-150836', leakTest: 0.33, channel: 1, okStatus: 'OK', tolerance: '0.00-1.00' }, lastUpdate: new Date().toISOString() },
  { id: 'test_bench_4', name: 'TEST BENCH-4', ip: '192.168.1.26', type: 'TEST_BENCH', plcStatus: 'ONLINE', dbStatus: 'CONNECTED', metrics: { engineNo: '', rpm: 0, oilPressure: 0, compression: 0, load: 0, okStatus: 'OF' }, lastUpdate: new Date().toISOString() },
];

function updateTelemetry() {
  stations = stations.map((st) => {
    if (st.plcStatus === 'OFFLINE') return st;
    const rollUpdate = Math.random() > 0.6;
    if (!rollUpdate && st.type !== 'TEST_BENCH') return st;

    const metrics = { ...st.metrics };
    const dateStr = new Date().toISOString();
    const enginePrefix = 'AE54-';
    const randId = Math.floor(150800 + Math.random() * 99);

    switch (st.type) {
      case 'NR':
        if (Math.random() > 0.8) {
          metrics.egNo = `EG0000${Math.floor(1000000 + Math.random() * 9000000)}`;
        }
        break;
      case 'LT':
        if (Math.random() > 0.7) {
          metrics.engineNo = `${enginePrefix}${randId}`;
          const limits = st.id === 'lt_oilroom' ? { min: 28, max: 34 } : st.id === 'lt_gearbox' ? { min: 2, max: 4.5 } : { min: 0.1, max: 0.8 };
          metrics.leakTest = parseFloat((limits.min + Math.random() * (limits.max - limits.min)).toFixed(2));
          metrics.okStatus = metrics.leakTest > (limits.max - 0.3) ? 'NG' : 'OK';
        }
        break;
      case 'TEST_BENCH':
        if (Math.random() > 0.95) {
          metrics.okStatus = metrics.okStatus === 'OK' ? 'OF' : 'OK';
        }
        if (metrics.okStatus === 'OK') {
          metrics.engineNo = metrics.engineNo || `${enginePrefix}${randId}`;
          metrics.rpm = Math.floor(1500 + Math.random() * 500);
          metrics.oilPressure = parseFloat((0.25 + Math.random() * 0.2).toFixed(2));
          metrics.compression = parseFloat((10.5 + Math.random() * 1.5).toFixed(1));
          metrics.load = Math.floor(75 + Math.random() * 20);
        } else {
          metrics.engineNo = '';
          metrics.rpm = 0;
          metrics.oilPressure = 0;
          metrics.compression = 0;
          metrics.load = 0;
        }
        break;
      case 'SPECIAL_CIRCLIP':
        if (Math.random() > 0.8) {
          metrics.engineNo = `${enginePrefix}${randId}`;
          metrics.tolerance = (Math.random() > 0.1 ? '+' : '-') + (0.1000 + Math.random() * 0.05).toFixed(4);
          metrics.okStatus = Math.random() > 0.05 ? 'OK' : 'NG';
        }
        break;
      case 'SPECIAL_OIL_INJECTOR':
        if (Math.random() > 0.8) {
          metrics.engineNo = `${enginePrefix}${randId}`;
          metrics.volume = Math.floor(10 + Math.random() * 20);
          metrics.okStatus = Math.random() > 0.05 ? 'OK' : 'NG';
        }
        break;
    }
    return { ...st, metrics, lastUpdate: dateStr };
  });
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`HMI Terminal Client connected: ${socket.id}`);
    socket.emit('stationUpdate', stations);

    socket.on('togglePlc', (id) => {
      stations = stations.map(s => {
        if (s.id === id) {
          const nextStatus = s.plcStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
          return { ...s, plcStatus: nextStatus, metrics: nextStatus === 'OFFLINE' ? { ...s.metrics, okStatus: 'OF' } : s.metrics, lastUpdate: new Date().toISOString() };
        }
        return s;
      });
      io.emit('stationUpdate', stations);
    });

    socket.on('toggleDb', (id) => {
      stations = stations.map(s => {
        if (s.id === id) {
          return { ...s, dbStatus: s.dbStatus === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED', lastUpdate: new Date().toISOString() };
        }
        return s;
      });
      io.emit('stationUpdate', stations);
    });

    socket.on('globalDbToggle', () => {
      const allConnected = stations.every(s => s.dbStatus === 'CONNECTED');
      const targetStatus = allConnected ? 'DISCONNECTED' : 'CONNECTED';
      stations = stations.map(s => ({ ...s, dbStatus: targetStatus, lastUpdate: new Date().toISOString() }));
      io.emit('stationUpdate', stations);
    });

    socket.on('triggerCycle', (id) => {
      stations = stations.map(s => {
        if (s.id === id && s.plcStatus === 'ONLINE') {
          const metrics = { ...s.metrics };
          const enginePrefix = 'AE54-';
          const randId = Math.floor(150800 + Math.random() * 99);
          metrics.engineNo = `${enginePrefix}${randId}`;

          if (s.type === 'LT') {
            const isOil = s.id === 'lt_oilroom';
            const limits = isOil ? { min: 28, max: 34 } : s.id === 'lt_gearbox' ? { min: 2, max: 4.5 } : { min: 0.1, max: 0.8 };
            metrics.leakTest = parseFloat((limits.min + Math.random() * (limits.max - limits.min)).toFixed(2));
            metrics.okStatus = 'OK';
          } else if (s.type === 'TEST_BENCH') {
            metrics.okStatus = 'OK';
            metrics.rpm = 1800;
            metrics.oilPressure = 0.38;
            metrics.compression = 11.5;
            metrics.load = 88;
          } else if (s.type === 'SPECIAL_CIRCLIP') {
            metrics.tolerance = '+' + (0.1000 + Math.random() * 0.05).toFixed(4);
            metrics.okStatus = 'OK';
          } else if (s.type === 'SPECIAL_OIL_INJECTOR') {
            metrics.volume = Math.floor(12 + Math.random() * 5);
            metrics.okStatus = 'OK';
          }
          return { ...s, metrics, lastUpdate: new Date().toISOString() };
        }
        return s;
      });
      io.emit('stationUpdate', stations);
    });

    socket.on('disconnect', () => {
      console.log(`HMI Terminal Client disconnected: ${socket.id}`);
    });
  });

  setInterval(() => {
    updateTelemetry();
    io.emit('stationUpdate', stations);
  }, 2000);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
