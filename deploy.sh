#!/bin/bash

# Ace Paste Deployment Script
echo "🚀 Deploying Ace Paste..."

# Build the app for web
echo "📦 Building for web..."
bunx expo export --platform web

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📁 Built files are in the 'dist' directory"
echo ""
echo "🌐 To deploy online, you can:"
echo "1. Upload the 'dist' folder contents to any static hosting service"
echo "2. Use Netlify Drop: https://app.netlify.com/drop"
echo "3. Use Vercel: https://vercel.com/new"
echo "4. Use GitHub Pages (if you push to a gh-pages branch)"
echo ""
echo "🔗 Local preview available at: http://localhost:8080"
echo "   (Run: cd dist && python3 -m http.server 8080)"
