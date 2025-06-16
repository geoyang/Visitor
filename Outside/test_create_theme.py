#!/usr/bin/env python3
"""
Test creating a new theme via device API
"""

import json
import subprocess

def test_create_theme():
    """Test creating a new theme"""
    
    device_token = "dev_RUmicXyRmp9q6cPzJD1PWCDJ27C4n-gX2YQSQvf6VpY"
    
    # Create a test theme
    theme_data = {
        "name": "Ocean Blue",
        "description": "A calming ocean-inspired theme",
        "category": "custom",
        "status": "active",
        "colors": {
            "primary": "#0ea5e9",
            "secondary": "#06b6d4",
            "background": "#f0f9ff",
            "surface": "#ffffff",
            "text": "#0f172a",
            "textSecondary": "#475569",
            "error": "#ef4444",
            "warning": "#f59e0b",
            "success": "#10b981",
            "info": "#3b82f6",
            "border": "#e2e8f0",
            "headerBackground": "#0ea5e9",
            "headerText": "#ffffff",
            "buttonBackground": "#0ea5e9",
            "buttonText": "#ffffff",
            "linkColor": "#0ea5e9"
        },
        "companyId": "test_company"  # This will be overridden by the API
    }
    
    # Convert to JSON
    json_data = json.dumps(theme_data)
    
    # Create curl command
    curl_cmd = [
        "curl",
        "-X", "POST",
        "http://localhost:8000/device/themes",
        "-H", "Content-Type: application/json",
        "-H", f"X-Device-Token: {device_token}",
        "-d", json_data
    ]
    
    print("🧪 Testing theme creation...")
    print(f"Creating theme: {theme_data['name']}")
    
    try:
        result = subprocess.run(curl_cmd, capture_output=True, text=True)
        print(f"Status: {result.returncode}")
        print(f"Response: {result.stdout}")
        if result.stderr:
            print(f"Error: {result.stderr}")
            
        # If successful, test activation
        if result.returncode == 0 and "Theme created successfully" in result.stdout:
            response_data = json.loads(result.stdout)
            theme_id = response_data.get("id")
            
            if theme_id:
                print(f"\n🎯 Testing theme activation...")
                activate_cmd = [
                    "curl",
                    "-X", "POST",
                    f"http://localhost:8000/device/themes/{theme_id}/activate",
                    "-H", f"X-Device-Token: {device_token}"
                ]
                
                activate_result = subprocess.run(activate_cmd, capture_output=True, text=True)
                print(f"Activation response: {activate_result.stdout}")
                
                # Test getting active theme
                print(f"\n📋 Testing get active theme...")
                active_cmd = [
                    "curl",
                    "-X", "GET",
                    "http://localhost:8000/device/themes/active",
                    "-H", f"X-Device-Token: {device_token}"
                ]
                
                active_result = subprocess.run(active_cmd, capture_output=True, text=True)
                print(f"Active theme response: {active_result.stdout}")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_create_theme()