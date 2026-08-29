import uvicorn
import webbrowser
import threading
import time

def open_browser():
    time.sleep(1.2)
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    print("=" * 70)
    print("  ARP Network Monitoring System")
    print("  Detect Abnormal Changes in Simulated ARP Mappings")
    print("  Computer Networks Mini Project")
    print("=" * 70)
    print("\n[+] Starting FastAPI SOC Server at http://localhost:8000 ...")
    print("[+] Interactive SOC Dashboard & Attack Simulator Ready!\n")

    # Start browser opener in background
    # threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)

