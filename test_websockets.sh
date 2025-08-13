#!/bin/bash

echo "=== Wheelio WebSocket Flow Test ==="
echo

# Function to run websocat with timeout and capture output
run_ws_test() {
    local endpoint="$1"
    local message="$2"
    local description="$3"
    local timeout="${4:-3}"
    
    echo "🔄 $description"
    echo "   Endpoint: $endpoint"
    echo "   Message: $message"
    echo "   Response:"
    
    timeout ${timeout}s bash -c "echo '$message' | websocat ws://localhost:3000$endpoint" | while read line; do
        echo "   📨 $line"
    done
    echo
}

# Test 1: Sales rep connects to monitor queue
run_ws_test "/ws/calls/monitor" '{"type":"connect","salesRepId":"rep_alice"}' "Sales Rep Alice connects to monitor queue" 4

# Test 2: Shopper joins queue
run_ws_test "/ws/call" '{"type":"join_queue","shopperId":"shopper_john"}' "Shopper John joins the call queue" 3

# Test 3: Another shopper joins
run_ws_test "/ws/call" '{"type":"join_queue","shopperId":"shopper_jane"}' "Shopper Jane joins the call queue" 3

# Test 4: Sales rep claims a call (we'll use a background process to keep connection open)
echo "🔄 Sales Rep Alice claims call from Shopper John"
echo "   This test simulates claiming the call..."

# Create a temporary script for the sales rep session
cat > /tmp/sales_rep_session.sh << 'EOF'
#!/bin/bash
{
    echo '{"type":"connect","salesRepId":"rep_alice"}'
    sleep 1
    echo '{"type":"claim_call","shopperId":"shopper_john"}'
    sleep 2
} | websocat ws://localhost:3000/ws/calls/monitor
EOF

chmod +x /tmp/sales_rep_session.sh
timeout 5s /tmp/sales_rep_session.sh | while read line; do
    echo "   📨 $line"
done
echo

# Test 5: Sales rep releases the call
echo "🔄 Sales Rep Alice releases call from Shopper John"
cat > /tmp/sales_rep_release.sh << 'EOF'
#!/bin/bash
{
    echo '{"type":"connect","salesRepId":"rep_alice"}'
    sleep 1
    echo '{"type":"release_call","shopperId":"shopper_john"}'
    sleep 2
} | websocat ws://localhost:3000/ws/calls/monitor
EOF

chmod +x /tmp/sales_rep_release.sh
timeout 5s /tmp/sales_rep_release.sh | while read line; do
    echo "   📨 $line"
done
echo

# Test 6: Shopper leaves queue
run_ws_test "/ws/call" '{"type":"leave_queue","shopperId":"shopper_jane"}' "Shopper Jane leaves the call queue" 3

# Test 7: Invalid message test
run_ws_test "/ws/call" '{"type":"invalid_action","shopperId":"shopper_test"}' "Testing invalid message handling" 3

echo "=== WebSocket Flow Test Complete ==="

# Cleanup
rm -f /tmp/sales_rep_session.sh /tmp/sales_rep_release.sh
