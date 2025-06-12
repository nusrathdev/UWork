#!/bin/bash

echo "Testing Remix routes..."

# Start the dev server in background
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 10

echo "Testing routes:"

echo "1. Testing root route:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/

echo "2. Testing auth/register route:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/auth/register

echo "3. Testing projects route:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/projects

echo "4. Testing auth/login route:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/auth/login

# Kill the dev server
kill $DEV_PID

echo "Test complete!"
