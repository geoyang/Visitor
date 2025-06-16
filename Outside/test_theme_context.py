#!/usr/bin/env python3
"""
Test the complete theme activation flow
"""

import subprocess
import json

def test_complete_theme_flow():
    """Test theme activation and verify it works end-to-end"""
    
    device_token = "_efjZIct5eKDf_tjEyK08usZLCyhhvTY86nQqFO9Nzo"
    
    print("🧪 Testing Complete Theme Activation Flow")
    print("=" * 50)
    
    # 1. Get all themes
    print("\n1️⃣ Getting all available themes...")
    cmd = ["curl", "-s", "-X", "GET", "http://localhost:8000/device/themes", "-H", f"X-Device-Token: {device_token}"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        themes = json.loads(result.stdout)
        print(f"✅ Found {len(themes)} themes:")
        for i, theme in enumerate(themes, 1):
            print(f"   {i}. {theme['name']} ({theme['category']}) - ID: {theme['id']}")
    else:
        print("❌ Failed to get themes")
        return
    
    # 2. Check current active theme
    print("\n2️⃣ Checking current active theme...")
    cmd = ["curl", "-s", "-X", "GET", "http://localhost:8000/device/themes/active", "-H", f"X-Device-Token: {device_token}"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    current_active = None
    if result.returncode == 0:
        active_data = json.loads(result.stdout)
        if active_data.get('isActive'):
            current_active = active_data['theme']
            print(f"✅ Currently active: {current_active['name']} (ID: {current_active['id']})")
        else:
            print("ℹ️ No active theme")
    
    # 3. Test activating different themes
    test_themes = [
        ("High Tech", "built-in"),
        ("Test Save Theme", "custom"),
        ("Law Firm", "built-in")
    ]
    
    for theme_name, theme_type in test_themes:
        print(f"\n3️⃣ Testing {theme_type} theme activation: {theme_name}")
        
        # Find theme by name
        target_theme = next((t for t in themes if theme_name in t['name']), None)
        if not target_theme:
            print(f"❌ Theme '{theme_name}' not found")
            continue
            
        theme_id = target_theme['id']
        print(f"   Theme ID: {theme_id}")
        
        # Activate theme
        cmd = ["curl", "-s", "-X", "POST", f"http://localhost:8000/device/themes/{theme_id}/activate", "-H", f"X-Device-Token: {device_token}"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            response = json.loads(result.stdout)
            if "successfully" in response.get("message", ""):
                print(f"   ✅ Activated successfully")
                
                # Verify activation
                cmd = ["curl", "-s", "-X", "GET", "http://localhost:8000/device/themes/active", "-H", f"X-Device-Token: {device_token}"]
                verify_result = subprocess.run(cmd, capture_output=True, text=True)
                
                if verify_result.returncode == 0:
                    verify_data = json.loads(verify_result.stdout)
                    if verify_data.get('isActive') and verify_data['theme']['name'] == theme_name:
                        print(f"   ✅ Verification: {theme_name} is now active")
                        print(f"   🎨 Primary color: {verify_data['theme']['colors']['primary']}")
                    else:
                        print(f"   ❌ Verification failed - wrong theme active")
                else:
                    print(f"   ❌ Verification request failed")
            else:
                print(f"   ❌ Activation failed: {response}")
        else:
            print(f"   ❌ Request failed")
    
    print(f"\n🎉 Theme activation testing complete!")
    print("\n💡 Next steps:")
    print("   1. Open your React Native app")
    print("   2. Go to Theme Management") 
    print("   3. Click 'Apply' on different themes")
    print("   4. Watch the app colors change immediately!")

if __name__ == "__main__":
    test_complete_theme_flow()