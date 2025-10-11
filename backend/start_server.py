#!/usr/bin/env python
"""
Startup script for SkillSwap platform with WebSocket support
Run this instead of 'python manage.py runserver'
"""
import os
import sys
import subprocess
import time
from pathlib import Path

def check_requirements():
    """Check if required packages are installed"""
    required_packages = [
        'django',
        'channels',
        'daphne',
        'djangorestframework',
        'djangorestframework-simplejwt',
        'django-cors-headers'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for pkg in missing_packages:
            print(f"   - {pkg}")
        print("\nInstall missing packages with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ All required packages are installed")
    return True

def run_migrations():
    """Run database migrations"""
    print("🔄 Running database migrations...")
    try:
        result = subprocess.run([
            sys.executable, 'manage.py', 'migrate'
        ], check=True, capture_output=True, text=True)
        print("✅ Migrations completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def collect_static():
    """Collect static files if needed"""
    print("🔄 Collecting static files...")
    try:
        subprocess.run([
            sys.executable, 'manage.py', 'collectstatic', '--noinput'
        ], check=True, capture_output=True, text=True)
        print("✅ Static files collected")
        return True
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Static collection failed (this is usually OK for development): {e}")
        return True

def start_daphne_server():
    """Start the server with Daphne (ASGI server with WebSocket support)"""
    print("🚀 Starting server with WebSocket support...")
    print("📍 Server will be available at: http://localhost:8000")
    print("🔌 WebSocket endpoints:")
    print("   - ws://localhost:8000/ws/activity/")
    print("   - ws://localhost:8000/ws/video-call/")
    print("\n🛑 Press Ctrl+C to stop the server\n")
    
    try:
        # Use daphne to run the ASGI application
        subprocess.run([
            sys.executable, '-m', 'daphne',
            '-b', '0.0.0.0',
            '-p', '8000',
            'skillswap.asgi:application'
        ], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Server failed to start: {e}")
        print("\nTrying fallback with manage.py runserver...")
        try:
            subprocess.run([
                sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
            ])
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")

def main():
    """Main startup function"""
    print("🎯 SkillSwap Platform Startup")
    print("=" * 40)
    
    # Change to backend directory if we're not already there
    if Path('manage.py').exists():
        print("📁 Already in backend directory")
    elif Path('backend/manage.py').exists():
        print("📁 Changing to backend directory")
        os.chdir('backend')
    else:
        print("❌ Cannot find manage.py. Please run this script from the project root or backend directory.")
        sys.exit(1)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Run migrations
    if not run_migrations():
        print("⚠️ Continuing despite migration issues...")
    
    # Collect static files
    collect_static()
    
    # Start server
    start_daphne_server()

if __name__ == "__main__":
    main()