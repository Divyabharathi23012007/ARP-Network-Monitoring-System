import unittest
from fastapi.testclient import TestClient
from backend.main import app

class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_topology(self):
        res = self.client.get("/api/topology")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("nodes", data)
        self.assertIn("metrics", data)
        self.assertEqual(len(data["nodes"]), 6)

    def test_get_packets(self):
        res = self.client.get("/api/packets")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_get_alerts(self):
        res = self.client.get("/api/alerts")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_launch_mitm_attack_api(self):
        res = self.client.post("/api/attack/launch", json={
            "attack_type": "mitm",
            "target_ip": "192.168.1.1",
            "victim_ip": "192.168.1.101",
            "spoofed_mac": "AA:BB:CC:DD:EE:66"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["attack_type"], "mitm")
        self.assertGreater(data["alerts_generated"], 0)

    def test_manual_heal_api(self):
        res = self.client.post("/api/mitigation/heal")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertGreater(data["healing_packets_sent"], 0)

    def test_mitigation_scripts_api(self):
        res = self.client.get("/api/mitigation/scripts")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("windows", data)
        self.assertIn("linux", data)
        self.assertIn("cisco", data)

    def test_export_summary_api(self):
        res = self.client.get("/api/export/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("project_title", data)
        self.assertIn("nodes", data)
        self.assertIn("metrics", data)

if __name__ == "__main__":
    unittest.main()

