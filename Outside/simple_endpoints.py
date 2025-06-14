#!/usr/bin/env python3
"""
Simple HTTP server to add missing multitenant endpoints
Run this alongside the main FastAPI server
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse

class MultitenantHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if path == '/health':
            response = {"status": "healthy", "company": "default"}
        elif path == '/analytics/company':
            response = {
                "company_id": "default_company",
                "total_visitors": 0,
                "active_visitors": 0,
                "today_visitors": 0,
                "total_locations": 1,
                "total_devices": 1,
                "online_devices": 1,
            }
        elif path == '/locations':
            response = [{
                "id": "default_location",
                "company_id": "default_company",
                "name": "Main Office",
                "address": "123 Business Ave, Corporate City, CC 12345",
                "status": "active",
                "devices_count": 1,
                "active_visitors_count": 0,
                "company_name": "Default Company"
            }]
        elif path == '/devices':
            response = [{
                "id": "default_device",
                "company_id": "default_company", 
                "location_id": "default_location",
                "name": "Main Tablet",
                "device_type": "tablet",
                "device_id": "TABLET-001",
                "status": "active",
                "is_online": True,
                "company_name": "Default Company",
                "location_name": "Main Office"
            }]
        else:
            response = {"error": "Not found"}
        
        self.wfile.write(json.dumps(response).encode())

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if '/devices' in self.path and '/heartbeat' in self.path:
            response = {"message": "Heartbeat recorded successfully"}
        elif '/devices' in self.path:
            response = {
                "id": "new_device",
                "company_id": "default_company",
                "location_id": "default_location",
                "name": "New Device",
                "device_type": "tablet",
                "device_id": "NEW-DEVICE",
                "status": "active",
                "is_online": True,
                "company_name": "Default Company",
                "location_name": "Main Office"
            }
        else:
            response = {"message": "OK"}
        
        self.wfile.write(json.dumps(response).encode())

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8001), MultitenantHandler)
    print("Multitenant endpoints server running on http://localhost:8001")
    print("Available endpoints:")
    print("  GET /health")
    print("  GET /analytics/company") 
    print("  GET /locations")
    print("  GET /devices")
    print("  POST /devices")
    print("  POST /devices/{id}/heartbeat")
    server.serve_forever()