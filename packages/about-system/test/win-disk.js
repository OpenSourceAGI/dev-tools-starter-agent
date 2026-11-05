const { spawn } = require('child_process');

// First get the top CPU process
const cpuProcess = spawn('powershell.exe', [
  '-NoProfile',
  '-Command',
  `
 Select-Object -ExpandProperty CounterSamples | 
Where-Object { $_.InstanceName -notin @("_Total", "Idle") } |
Sort-Object CookedValue -Descending |
Select-Object -First 1 | 
Select-Object InstanceName, @{Name="CPU %"; Expression = {[math]::Round($_.CookedValue,2)}}

`
]);

let cpuOutput = '';
cpuProcess.stdout.on('data', (data) => cpuOutput += data.toString());
cpuProcess.stderr.on('data', (data) => console.error(data.toString()));

cpuProcess.on('close', () => {
  console.log(cpuOutput);
  // Parse CPU process info
  const lines = cpuOutput.trim().split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const parts = lines[0].trim().split(/\s+/);
    if (parts.length >= 2) {
      const processName = parts[0];
      const cpuPercent = parts[1];
      console.log(`🔝 ${cpuPercent}% ${processName}`);
    }
  }

  return;

  // Then get the computer name/model
  const deviceIdProcess = spawn('wmic', ['csproduct', 'get', 'name']);
  let deviceId = '';

  deviceIdProcess.stdout.on('data', (data) => {
    deviceId += data.toString();
  });

  deviceIdProcess.on('close', () => {
    // Parse device ID and clean it up
    const deviceName = deviceId.split('\n')
      .filter(line => line.trim() && !line.includes('Name'))
      .map(line => line.trim())
      .join('') || 'Unknown Device';

    // Now get disk information
    const pwsh = spawn('powershell.exe', [
      '-Command',
      `Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID,FreeSpace,Size | Format-Table -HideTableHeaders`
    ]);

    let output = '';
    pwsh.stdout.on('data', (data) => output += data.toString());
    pwsh.stderr.on('data', (data) => console.error(data.toString()));

    pwsh.on('close', () => {
      console.log(`Device: ${deviceName}`);
      console.log('');
      
      const lines = output.trim().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 3) {
          const device = parts[0];
          const freeGB = parseFloat(parts[1]) / (1024 ** 3);
          const sizeGB = parseFloat(parts[2]) / (1024 ** 3);
          const percentFree = sizeGB ? ((freeGB / sizeGB) * 100).toFixed(0) : 0;
          console.log(`${percentFree}% ${sizeGB.toFixed(0)}GB (${device})`);
        }
      });
    });
  });
});