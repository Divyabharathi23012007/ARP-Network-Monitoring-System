const API_BASE = '/api';

export const api = {
  async getTopology() {
    const res = await fetch(`${API_BASE}/topology`);
    return res.json();
  },

  async getPackets(limit = 100) {
    const res = await fetch(`${API_BASE}/packets?limit=${limit}`);
    return res.json();
  },

  async getAlerts(limit = 50) {
    const res = await fetch(`${API_BASE}/alerts?limit=${limit}`);
    return res.json();
  },

  async launchAttack(config) {
    const res = await fetch(`${API_BASE}/attack/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async sendCustomPacket(packet) {
    const res = await fetch(`${API_BASE}/attack/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet),
    });
    return res.json();
  },

  async toggleAutoDefense(enabled) {
    const res = await fetch(`${API_BASE}/mitigation/auto-defense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return res.json();
  },

  async broadcastHeal() {
    const res = await fetch(`${API_BASE}/mitigation/heal`, {
      method: 'POST',
    });
    return res.json();
  },

  async isolateNode(mac) {
    const res = await fetch(`${API_BASE}/mitigation/isolate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac }),
    });
    return res.json();
  },

  async unisolateNode(mac) {
    const res = await fetch(`${API_BASE}/mitigation/unisolate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac }),
    });
    return res.json();
  },

  async getDefenseScripts() {
    const res = await fetch(`${API_BASE}/mitigation/scripts`);
    return res.json();
  },

  async resetSimulation() {
    const res = await fetch(`${API_BASE}/simulation/reset`, {
      method: 'POST',
    });
    return res.json();
  },

  async getExportSummary() {
    const res = await fetch(`${API_BASE}/export/summary`);
    return res.json();
  },
};

