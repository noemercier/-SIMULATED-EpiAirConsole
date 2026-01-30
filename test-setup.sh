#!/bin/bash

# Testing Setup Script
# This script helps you test EpiAirConsole on your phone

echo "🎮 EpiAirConsole - Testing Setup"
echo "================================"
echo ""

# Get local IP
LOCAL_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1 | head -n 1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect local IP address"
    echo "Please find it manually:"
    echo "  Linux: ip addr or ifconfig"
    echo "  Mac: ifconfig"
    echo "  Windows: ipconfig"
else
    echo "✅ Your local IP address: $LOCAL_IP"
    echo ""
    echo "📋 Testing Instructions:"
    echo "========================"
    echo ""
    echo "1. Make sure your phone and computer are on the SAME WiFi"
    echo ""
    echo "2. On your COMPUTER (Host):"
    echo "   Open: http://localhost:3000"
    echo "   Click 'Create Room (Host)'"
    echo ""
    echo "3. On your PHONE (Controller):"
    echo "   Open: http://$LOCAL_IP:3000"
    echo "   Click 'Join Room (Controller)'"
    echo "   Enter the room code shown on computer"
    echo ""
    echo "🔗 Quick Links:"
    echo "   Computer: http://localhost:3000"
    echo "   Phone:    http://$LOCAL_IP:3000"
    echo ""
fi

echo "💡 Tips:"
echo "   - Both devices must be on the same WiFi network"
echo "   - Make sure firewall allows port 3000"
echo "   - Use incognito/private mode if you have issues"
echo ""
echo "Ready to test! 🚀"
