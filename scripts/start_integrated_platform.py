#!/usr/bin/env python3
"""
Network Platform - Integrated Startup Script
============================================

Unified startup script for the MeshAdmin Network Platform that launches
all applications with MPTCP pathways integration enabled.

Applications:
- Topology Master (port 5000)
- Network Design Studio (port 5001) 
- Topology Mapper (port 5002)
- Diagram Monster (port 5003)
"""

import subprocess
import sys
import os
import time
import signal
import threading
from typing import List, Dict, Any
import json

class NetworkPlatformLauncher:
    def __init__(self):
        self.processes: List[subprocess.Popen] = []
        self.running = False
        self.base_path = os.path.dirname(os.path.abspath(__file__))
        
        # Application configurations
        self.applications = [
            {
                'name': 'Topology Master',
                'path': 'apps/topology-master',
                'port': 5000,
                'script': 'server/index.ts',
                'description': 'Master topology management and visualization'
            },
            {
                'name': 'Network Design Studio',
                'path': 'apps/network-design-studio',
                'port': 5001,
                'script': 'server/index.ts',
                'description': 'Interactive network design and planning'
            },
            {
                'name': 'Topology Mapper',
                'path': 'apps/topology-mapper',
                'port': 5002,
                'script': 'server/index.ts',
                'description': 'Real-time network discovery and mapping'
            },
            {
                'name': 'Diagram Monster',
                'path': 'apps/diagram-monster',
                'port': 5003,
                'script': 'index.html',
                'description': 'Advanced network diagramming engine',
                'type': 'static'
            }
        ]
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        print(f"\n🛑 Network Platform: Received signal {signum}, shutting down...")
        self.stop_all()
        sys.exit(0)

    def check_pathways_integration(self):
        """Check if pathways integration is available"""
        try:
            pathways_file = os.path.join(self.base_path, 'pathways-integration.ts')
            if os.path.exists(pathways_file):
                print("✅ Network Platform: Pathways integration found")
                return True
            else:
                print("⚠️ Network Platform: Pathways integration not found, running in standalone mode")
                return False
        except Exception as e:
            print(f"❌ Network Platform: Error checking pathways integration: {e}")
            return False

    def start_application(self, app_config: Dict[str, Any]) -> subprocess.Popen:
        """Start a single application"""
        try:
            app_path = os.path.join(self.base_path, app_config['path'])
            
            print(f"🚀 Starting {app_config['name']} on port {app_config['port']}...")
            
            # Handle different application types
            if app_config.get('type') == 'static':
                # For static applications like Diagram Monster
                cmd = ['python3', '-m', 'http.server', str(app_config['port'])]
                process = subprocess.Popen(
                    cmd,
                    cwd=app_path,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
            else:
                # For Node.js/TypeScript applications
                cmd = ['npm', 'run', 'dev']
                
                # Set environment variables
                env = os.environ.copy()
                env['PORT'] = str(app_config['port'])
                env['NODE_ENV'] = 'development'
                env['PATHWAYS_INTEGRATION'] = 'enabled'
                
                process = subprocess.Popen(
                    cmd,
                    cwd=app_path,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env
                )
            
            # Start output monitoring thread
            threading.Thread(
                target=self._monitor_output,
                args=(process, app_config['name']),
                daemon=True
            ).start()
            
            print(f"✅ {app_config['name']} started successfully")
            return process
            
        except Exception as e:
            print(f"❌ Failed to start {app_config['name']}: {e}")
            return None

    def _monitor_output(self, process: subprocess.Popen, app_name: str):
        """Monitor application output in separate thread"""
        try:
            while process.poll() is None:
                if process.stdout:
                    line = process.stdout.readline()
                    if line:
                        print(f"[{app_name}] {line.strip()}")
                        
                if process.stderr:
                    line = process.stderr.readline()
                    if line and 'error' in line.lower():
                        print(f"[{app_name}] ERROR: {line.strip()}")
                        
        except Exception:
            pass  # Thread will die when process ends

    def start_all(self):
        """Start all Network Platform applications"""
        print("🌐 Network Platform: Starting integrated applications...")
        print("=" * 60)
        
        # Check pathways integration
        pathways_available = self.check_pathways_integration()
        
        if pathways_available:
            print("🔗 Network Platform: MPTCP pathways integration enabled")
        else:
            print("⚠️ Network Platform: Running without pathways integration")
        
        print()
        
        # Start all applications
        for app_config in self.applications:
            process = self.start_application(app_config)
            if process:
                self.processes.append(process)
                time.sleep(2)  # Brief delay between starts
        
        self.running = True
        
        print("\n" + "=" * 60)
        print("🚀 Network Platform: All applications started!")
        print("\nApplication URLs:")
        print("-" * 30)
        
        for app_config in self.applications:
            print(f"• {app_config['name']}: http://localhost:{app_config['port']}")
            print(f"  {app_config['description']}")
        
        if pathways_available:
            print(f"\n🔗 Pathways API endpoints:")
            print(f"• Topology Master: http://localhost:5000/api/pathways/")
            print(f"• Design Studio: http://localhost:5001/api/pathways/")
        
        print("\n" + "=" * 60)
        print("Press Ctrl+C to stop all applications")

    def stop_all(self):
        """Stop all running applications"""
        if not self.running:
            return
            
        print("\n🛑 Network Platform: Stopping all applications...")
        
        for process in self.processes:
            try:
                if process.poll() is None:  # Process is still running
                    process.terminate()
                    
                    # Give process time to terminate gracefully
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        print("⚠️ Force killing unresponsive process...")
                        process.kill()
                        
            except Exception as e:
                print(f"❌ Error stopping process: {e}")
        
        self.processes.clear()
        self.running = False
        print("✅ Network Platform: All applications stopped")

    def check_application_health(self):
        """Check health of all running applications"""
        import requests
        
        print("\n🔍 Network Platform: Checking application health...")
        
        for app_config in self.applications:
            try:
                if app_config.get('type') == 'static':
                    # Simple HTTP check for static apps
                    response = requests.get(f"http://localhost:{app_config['port']}", timeout=3)
                    status = "✅ Healthy" if response.status_code == 200 else "❌ Error"
                else:
                    # Check pathways health endpoint
                    response = requests.get(f"http://localhost:{app_config['port']}/api/pathways/health", timeout=3)
                    if response.status_code == 200:
                        data = response.json()
                        status = "✅ Healthy" if data.get('success') else "⚠️ Warning"
                    else:
                        status = "❌ Error"
                        
                print(f"• {app_config['name']}: {status}")
                
            except requests.exceptions.RequestException:
                print(f"• {app_config['name']}: ❌ Not responding")
            except Exception as e:
                print(f"• {app_config['name']}: ❌ Error - {e}")

    def run_interactive_mode(self):
        """Run in interactive mode with monitoring"""
        self.start_all()
        
        if not self.processes:
            print("❌ No applications started successfully")
            return
        
        # Interactive monitoring loop
        try:
            while self.running:
                time.sleep(10)  # Check every 10 seconds
                
                # Check if any processes have died
                dead_processes = []
                for i, process in enumerate(self.processes):
                    if process.poll() is not None:
                        dead_processes.append(i)
                
                if dead_processes:
                    print(f"⚠️ Network Platform: {len(dead_processes)} application(s) stopped unexpectedly")
                    for i in reversed(dead_processes):
                        self.processes.pop(i)
                    
                    if not self.processes:
                        print("❌ All applications stopped, exiting...")
                        break
                        
        except KeyboardInterrupt:
            pass  # Handled by signal handler
        finally:
            self.stop_all()

def main():
    """Main entry point"""
    launcher = NetworkPlatformLauncher()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'start':
            launcher.start_all()
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                launcher.stop_all()
                
        elif command == 'health':
            launcher.check_application_health()
            
        elif command == 'stop':
            # This would require process tracking, simplified for now
            print("⚠️ Use Ctrl+C to stop running applications")
            
        else:
            print("Usage: python3 start_integrated_platform.py [start|health|stop]")
            print("  start  - Start all Network Platform applications")
            print("  health - Check health of running applications")
            print("  stop   - Stop all applications")
    else:
        # Interactive mode
        launcher.run_interactive_mode()

if __name__ == "__main__":
    main() 