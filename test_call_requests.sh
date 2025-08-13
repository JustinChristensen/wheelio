#!/bin/bash

echo "=== Testing AI Call Request Detection ==="
echo

# Function to test chat endpoint with call requests
test_chat_call() {
    local message="$1"
    local description="$2"
    
    echo "🔄 $description"
    echo "   Message: \"$message\""
    echo "   Response:"
    
    curl -s -X POST http://localhost:3000/chat \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$message\"}" | jq '.'
    echo
}

# Test 1: Request to talk to human agent
test_chat_call "I want to talk to a human agent" "Testing call start request"

# Test 2: Different ways to request human agent
test_chat_call "Can I speak to a real person?" "Testing alternative call start request"

# Test 3: Request to end call
test_chat_call "End the call please" "Testing call end request"

# Test 4: Different way to end call
test_chat_call "Hang up" "Testing alternative call end request"

# Test 5: Mixed request with car preferences and call request
test_chat_call "I'm looking for a Honda SUV but I think I need to talk to someone" "Testing mixed preferences and call request"

# Test 6: Normal message (should not trigger call)
test_chat_call "What cars do you have under $30000?" "Testing normal message (no call request)"

echo "=== Call Request Detection Test Complete ==="
