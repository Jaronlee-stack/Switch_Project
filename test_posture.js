#!/usr/bin/env node
// Simple test script to verify the posture detection pipeline
// Usage: node test_posture.js [image_path]
// If no image path is provided, creates a minimal test case

const fs = require('fs');
const path = require('path');
const http = require('http');

const SERVER_URL = 'http://localhost:5000';
const FRAME_ENDPOINT = `${SERVER_URL}/frame`;

// Helper: encode a file to base64
function fileToBase64(filePath) {
  const data = fs.readFileSync(filePath);
  return data.toString('base64');
}

// Helper: send a POST request to the server
function sendFrame(base64Image, frameId = 0) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      image_b64: base64Image,
      frame_id: frameId
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/frame',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Helper: check server health
function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
  });
}

// Main test function
async function runTests() {
  const imagePath = process.argv[2];

  // Step 1: check server is running
  console.log('[TEST] Checking if server is running...');
  let attempts = 0;
  while (attempts < 5) {
    const isHealthy = await checkHealth();
    if (isHealthy) {
      console.log('[TEST] ✓ Server is running');
      break;
    }
    attempts++;
    if (attempts < 5) {
      console.log('[TEST] Waiting for server...');
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (attempts === 5) {
    console.error('[TEST] ✗ Server did not start. Run: node posture_server.js');
    process.exit(1);
  }

  // Step 2: if image provided, test with it
  if (imagePath) {
    console.log(`\n[TEST] Testing with image: ${imagePath}`);
    if (!fs.existsSync(imagePath)) {
      console.error(`[TEST] ✗ File not found: ${imagePath}`);
      process.exit(1);
    }

    const base64 = fileToBase64(imagePath);
    console.log(`[TEST] Image size: ${base64.length} bytes`);

    try {
      console.log('[TEST] Sending frame to server...');
      const result = await sendFrame(base64, 1);

      console.log(`[TEST] Response status: ${result.statusCode}`);
      console.log('[TEST] Response body:');
      console.log(JSON.stringify(result.body, null, 2));

      if (result.body.posture) {
        console.log(`\n[TEST] ✓ Posture detected: ${result.body.posture}`);
        if (result.body.issues && result.body.issues.length > 0) {
          console.log(`[TEST] Issues: ${result.body.issues.join(', ')}`);
        }
        if (result.body.neck_angle !== null) {
          console.log(`[TEST] Neck angle: ${result.body.neck_angle}°`);
        }
        if (result.body.trunk_lean !== null) {
          console.log(`[TEST] Trunk lean: ${result.body.trunk_lean}°`);
        }
      }
    } catch (e) {
      console.error('[TEST] ✗ Error sending frame:', e.message);
      process.exit(1);
    }
  } else {
    console.log('\n[TEST] No image provided. To test:');
    console.log('  1. Start server: node posture_server.js');
    console.log('  2. In another terminal: node test_posture.js <image.jpg>');
    console.log('\n[TEST] Server is ready to receive frames!');
  }
}

runTests().catch(console.error);
