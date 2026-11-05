import { getSystemInfo } from '../src/system-info-api.js';

// Example 1: Get all system information
async function example1() {
  console.log('=== Example 1: Get all system information ===\n');

  const info = await getSystemInfo();
  console.log(JSON.stringify(info, null, 2));
}

// Example 2: Get specific fields
async function example2() {
  console.log('\n=== Example 2: Get specific fields ===\n');

  const info = await getSystemInfo();

  console.log('User:', info.user);
  console.log('Hostname:', info.hostname);
  console.log('OS:', info.os);
  console.log('CPU:', info.cpu);
  console.log('RAM Used:', info.ram_used);
  console.log('Disk Used:', info.disk_used);
}

// Example 3: Get network information
async function example3() {
  console.log('\n=== Example 3: Network information ===\n');

  const info = await getSystemInfo();

  console.log('Public IP:', info.ip);
  console.log('Local IP:', info.iplocal);
  console.log('City:', info.city);
  console.log('ISP:', info.isp);
}

// Example 4: Get hardware information
async function example4() {
  console.log('\n=== Example 4: Hardware information ===\n');

  const info = await getSystemInfo();

  console.log('Device:', info.device);
  console.log('CPU:', info.cpu);
  console.log('GPU:', info.gpu);
  console.log('Kernel:', info.kernel);
  console.log('Temperature:', info.temperature || 'N/A');
  console.log('Battery:', info.battery || 'N/A');
}

// Run all examples
async function main() {
  await example1();
  await example2();
  await example3();
  await example4();
}

main().catch(console.error);
