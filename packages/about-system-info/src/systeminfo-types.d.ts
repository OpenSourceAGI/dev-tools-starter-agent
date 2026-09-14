/**
 * System Information Types
 * 
 * TypeScript type definitions for the system information API response.
 * All values are returned as clean strings without ANSI color codes or emojis.
 */

/**
 * Platform types supported by the system info service
 */
export type Platform = 'linux' | 'windows' | 'macos' | 'unknown';

/**
 * Complete system information object returned by the API
 */
export interface SystemInfo {
  /**
   * ISO 8601 timestamp indicating when the system information was collected
   * Format: "2025-01-15T10:30:00.000Z"
   * Always present regardless of platform
   * 
   * @example "2025-01-15T10:30:00.000Z"
   */
  timestamp: string;

  // =============================================================================
  // SYSTEM IDENTITY
  // =============================================================================

  /**
   * System hostname or computer name
   * The network name assigned to this machine
   * Empty string if unable to determine
   * 
   * @example "workstation-linux", "DESKTOP-ABC123", "MacBook-Pro"
   */
  hostname: string;

  /**
   * Username of the currently logged-in user
   * The user account running the system info service
   * Empty string if unable to determine
   * 
   * @example "admin", "john.doe", "deck"
   */
  user: string;

  /**
   * Operating system platform classification
   * Categorizes the underlying OS family
   * Always present, defaults to 'unknown' if detection fails
   */
  platform: Platform;

  // =============================================================================
  // OPERATING SYSTEM INFORMATION
  // =============================================================================

  /**
   * Operating system name and version string
   * Human-readable OS identification including version numbers
   * Empty string on detection failure
   * 
   * @example 
   * - Linux: "Ubuntu 22.04.3 LTS", "CachyOS Linux", "SteamOS 3.5.7"
   * - Windows: "Windows 11 Pro", "Windows 10 Enterprise" 
   * - macOS: "macOS Ventura 13.2.1"
   */
  os: string;

  /**
   * Kernel version string
   * The core OS kernel version currently running
   * Format varies by platform
   * Empty string if unavailable
   * 
   * @example
   * - Linux: "6.2.0-37-generic", "6.1.52-valve16-1-neptune-61"
   * - Windows: "10.0.22621.2428"
   * - macOS: "22.3.0"
   */
  kernel: string;

  /**
   * Current shell program being used
   * The command-line interface shell (Linux/Unix systems only)
   * Empty string on Windows or if unable to detect
   * 
   * @example "bash", "zsh", "fish", "powershell"
   */
  shell: string;

  // =============================================================================
  // HARDWARE SPECIFICATIONS
  // =============================================================================

  /**
   * CPU model name and specifications
   * Processor identification string, cleaned of unnecessary suffixes
   * "with Radeon Graphics" and similar text is automatically stripped
   * Empty string if detection fails
   * 
   * @example 
   * - "Intel Core i7-12700K"
   * - "AMD Ryzen 9 5900HX" 
   * - "Apple M2 Pro"
   * - "AMD Custom APU 0405" (Steam Deck)
   */
  cpu: string;

  /**
   * Graphics card model name(s)
   * All detected GPUs, comma-separated if multiple
   * Matches VGA, 3D controller, and Display controller devices
   * Extracted from lspci output (Linux) or WMI (Windows)
   * Empty string if no GPU detected or detection fails
   *
   * @example
   * - "NVIDIA GeForce RTX 4070"
   * - "GeForce RTX 3070, Radeon RX 6800 XT"
   * - "Intel UHD Graphics 770, NVIDIA GeForce RTX 4090"
   */
  gpu: string;

  /**
   * CPU benchmark score from Geekbench 6 multi-core
   * Shows performance score (in thousands) and ranking position
   * Uses fuzzy matching to find similar CPU models from top 1000 list
   * Empty string if CPU not found or benchmark data unavailable
   *
   * @example
   * - "37.9k #1" (top performing CPU)
   * - "20.5k #68" (mid-range CPU)
   * - "" (CPU not in benchmark database)
   */
  bench: string;

  /**
   * Detailed CPU benchmark information from Geekbench 6 multi-core
   * Shows score, rank, and architecture type (ARM/Intel/AMD)
   * Uses fuzzy matching to find similar CPU models
   * Empty string if CPU not found or benchmark data unavailable
   *
   * @example
   * - "Geekbench 6: 37.9k (Rank #1) - ARM" (Apple M4 Ultra)
   * - "Geekbench 6: 20.5k (Rank #68) - Intel" (Intel Core i9)
   * - "Geekbench 6: 19.2k (Rank #91) - AMD" (AMD Ryzen 9 7950X)
   * - "" (CPU not in benchmark database)
   */
  cpu_bench_info: string;

  /**
   * GPU benchmark score from Geekbench 6 OpenCL
   * Shows performance score (in thousands) and ranking position
   * Uses fuzzy matching to find similar GPU models from benchmark data
   * Empty string if GPU not found or benchmark data unavailable
   *
   * @example
   * - "37.9k #1" (top performing GPU)
   * - "20.5k #68" (mid-range GPU)
   * - "" (GPU not in benchmark database)
   */
  gpu_bench: string;

  /**
   * Detailed GPU benchmark information from Geekbench 6 OpenCL
   * Shows score, rank, and vendor type (NVIDIA/AMD/Intel)
   * Uses fuzzy matching to find similar GPU models
   * Empty string if GPU not found or benchmark data unavailable
   *
   * @example
   * - "Geekbench 6: 37.9k (Rank #1) - NVIDIA" (NVIDIA GPU)
   * - "Geekbench 6: 20.5k (Rank #68) - AMD" (AMD GPU)
   * - "" (GPU not in benchmark database)
   */
  gpu_bench_info: string;

  /**
   * Device or computer model name
   * Hardware model identification when available
   * Useful for laptops, prebuilt systems, and specialized devices
   * Empty string if not available or generic hardware
   * 
   * @example
   * - "Dell OptiPlex 7090"
   * - "ASUS TUF Gaming A15" 
   * - "Valve Steam Deck"
   * - "MacBook Pro 16-inch"
   */
  device: string;

  // =============================================================================
  // REAL-TIME RESOURCE USAGE
  // =============================================================================

  /**
   * Root filesystem disk usage percentage
   * Shows how full the primary disk partition is
   * Format: number followed by percent sign
   * Empty string if unable to determine
   * 
   * @example "45%", "78%", "12%"
   */
  disk_used: string;

  /**
   * Disk size (used/total) for each real disk
   * Format: "used/total GB" when a single real disk is found, or
   * "mount(used/total GB) ..." per disk when multiple are found
   * Pseudo filesystems and small system/boot partitions (under 10GB) are
   * excluded
   * Empty string if unable to determine
   *
   * @example "256/512GB", "/(100/500GB) /Volumes/Backup(900/2000GB)"
   */
  disk_size: string;

  /**
   * Memory usage in gigabytes
   * Format: "used/total GB" showing current RAM consumption
   * Calculated from system memory statistics
   * Empty string if detection fails
   * 
   * @example "12/32GB", "6/16GB", "8/64GB"
   */
  ram_used: string;

  /**
   * Highest CPU consuming process
   * Format: "percentage processname" of the most resource-intensive process
   * Percentage is rounded to whole number
   * Empty string if unable to determine (non-Linux systems)
   * 
   * @example "8% firefox", "15% chrome", "3% systemd", "25% game.exe"
   */
  top_process: string;

  /**
   * System uptime since last boot
   * Format: "Xd Yh Zm" where X=days, Y=hours, Z=minutes
   * Always present as calculated from system boot time
   * 
   * @example "2d 14h 23m", "0d 3h 45m", "15d 2h 1m"
   */
  uptime: string;

  // =============================================================================
  // HARDWARE STATUS (Linux-specific)
  // =============================================================================

  /**
   * System temperature reading
   * CPU or system temperature from thermal sensors (Linux only)
   * Format: number followed by "°C"
   * Empty string if no temperature sensors available or non-Linux
   * 
   * @example "42°C", "65°C", "38°C"
   */
  temperature: string;

  /**
   * Battery charge level and charging status
   * Format: "percentage" optionally followed by "+" if charging
   * Only available on battery-powered devices (laptops, handhelds)
   * Empty string if no battery present or detection fails
   * 
   * @example 
   * - "85%" (discharging)
   * - "73%+" (charging) 
   * - "100%" (full)
   */
  battery: string;

  /**
   * System load averages (Linux only)
   * Format: "1min 5min 15min" showing system load over time periods
   * Values represent average system load, where 1.0 = full utilization
   * Empty string on non-Linux systems
   * 
   * @example "0.8 1.2 1.5", "2.1 1.8 1.6", "0.1 0.3 0.4"
   */
  load_average: string;

  // =============================================================================
  // NETWORK INFORMATION
  // =============================================================================

  /**
   * Public IP address
   * External internet-facing IPv4 address
   * Obtained from ipinfo.io service
   * Empty string if no internet connection or service unavailable
   * 
   * @example "203.0.113.42", "198.51.100.15", "192.0.2.1"
   */
  ip: string;

  /**
   * Local/private IP address(es)
   * Internal network IP addresses (RFC 1918 ranges)
   * Multiple addresses separated by spaces if available
   * Empty string if no network interfaces active
   * 
   * @example 
   * - "192.168.1.100"
   * - "10.0.0.50 192.168.1.100" (multiple interfaces)
   * - "172.16.0.10"
   */
  iplocal: string;

  /**
   * Geographic city location
   * City name based on public IP geolocation
   * Obtained from ipinfo.io service
   * Empty string if no internet connection or location unavailable
   * 
   * @example "San Francisco", "New York", "London", "Tokyo"
   */
  city: string;

  /**
   * Reverse DNS hostname with HTTP prefix
   * Format: "http://hostname" from reverse DNS lookup of public IP
   * Empty string if reverse DNS unavailable or no internet connection
   * 
   * @example "http://example.com", "http://host-203-0-113-42.example.net"
   */
  domain: string;

  /**
   * Internet Service Provider name
   * ISP identification from public IP ownership data
   * AS (Autonomous System) number prefix is automatically removed
   * Empty string if no internet connection or data unavailable
   * 
   * @example "Comcast Cable", "Verizon Business", "T-Mobile USA", "Cloudflare Inc"
   */
  isp: string;

  // =============================================================================
  // SOFTWARE AND DEVELOPMENT TOOLS
  // =============================================================================

  /**
   * Available package managers and development tools
   * Space-separated list of detected command-line tools
   * Includes package managers, editors, and development utilities
   * Empty string if no recognized tools found
   * 
   * @example 
   * - "apt npm pip docker nvim yay" (Linux development setup)
   * - "pacman yay flatpak" (Arch-based system)
   * - "npm pip docker hx bun" (Node.js developer setup)
   */
  pacman: string;

  /**
   * Open network ports with associated services
   * Space-separated list of "port+service" combinations
   * Shows ports that are actively listening for connections
   * Empty string if no open ports detected or non-Linux system
   * 
   * @example 
   * - "22ssh 80http 443https" (web server with SSH)
   * - "3000node 5432postgres" (development services)
   * - "8080java 9000python" (application servers)
   */
  ports: string;

  /**
   * Running Docker containers with exposed ports
   * Space-separated list of container names followed by port numbers
   * Only shows currently running containers
   * Empty string if Docker not installed, no containers running, or access denied
   * 
   * @example 
   * - "web-server 80 db-postgres 5432"
   * - "redis-cache 6379 nginx-proxy 443"
   * - "app-backend 8080"
   */
  containers: string;

  /**
   * Number of active system services
   * Count of running systemd services (Linux only)  
   * Format: "number services"
   * Empty string on non-Linux systems or if systemctl unavailable
   * 
   * @example "145 services", "89 services", "203 services"
   */
  services_running: string;

  // =============================================================================
  // EXTENDED SYSTEM INFORMATION (Linux-specific)
  // =============================================================================

  /**
   * Available system memory (Linux only)
   * Amount of memory available for new processes
   * Format: "number GB available" 
   * Based on MemAvailable from /proc/meminfo
   * Empty string on non-Linux systems
   * 
   * @example "18GB available", "4GB available", "32GB available"
   */
  memory_available: string;

  /**
   * Swap usage statistics (Linux only)
   * Virtual memory usage percentage and size
   * Format: "percentage (size) swap"
   * Empty string on non-Linux systems or if no swap configured
   * 
   * @example "2% (512MB) swap", "0% (0MB) swap", "15% (2048MB) swap"
   */
  swap_used: string;

  /**
   * Number of logged-in users (Linux only)
   * Count of active user sessions
   * Format: "number users"
   * Empty string on non-Linux systems
   * 
   * @example "2 users", "1 users", "5 users"
   */
  users_logged_in: string;

  /**
   * Active network interface names (Linux only)
   * Space-separated list of network interface names with active IPv4 addresses
   * Excludes loopback interface (lo)
   * Empty string on non-Linux systems or no active interfaces
   * 
   * @example 
   * - "eth0 wlan0" (wired and wireless)
   * - "enp3s0" (single ethernet interface)
   * - "wlp2s0 docker0" (wireless and Docker bridge)
   */
  network_interfaces: string;

  /**
   * Non-root filesystem mount points with usage (Linux only)
   * Space-separated list of "mountpoint(usage%)" 
   * Excludes system mounts (/dev, /proc, /sys) and root (/)
   * Shows up to 3 mount points to prevent excessive output
   * Empty string on non-Linux systems or only root filesystem mounted
   * 
   * @example 
   * - "/home(85%) /var(23%)"
   * - "/opt(12%) /tmp(5%) /boot(45%)"
   * - "/mnt/data(67%)"
   */
  mount_points: string;

  /**
   * Display screen resolution (Linux with X11 only)
   * Current display resolution from xrandr
   * Format: "widthxheight"
   * Empty string if no X11 display, non-Linux, or detection fails
   * 
   * @example "1920x1080", "2560x1440", "3840x2160", "1280x800"
   */
  screen_resolution: string;
}

/**
 * Options for configuring system info collection and output
 */
export interface SystemInfoOptions {
  /** Return JSON object instead of formatted output */
  json_output?: boolean;
  
  /** Force single-line vs multi-line display mode */
  single_line?: boolean;
  
  /** Return data object instead of printing to console (module usage) */
  returnData?: boolean;
}

/**
 * Error object returned when system information collection fails
 */
export interface SystemInfoError {
  /** Error type identifier */
  error: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional error details if available */
  details?: string;
  
  /** Timestamp when error occurred */
  timestamp: string;
}

/**
 * Function type for getting system information as JSON
 * @returns Promise resolving to complete system information object
 */
export type GetSystemInfoFunction = () => Promise<SystemInfo>;

/**
 * Function type for displaying system information with options
 * @param options Configuration options for output format and behavior
 * @returns Promise resolving to SystemInfo object if JSON output requested
 */
export type DisplaySystemInfoFunction = (options?: SystemInfoOptions) => Promise<SystemInfo | void>;

/**
 * Platform-specific field availability matrix
 * Indicates which fields are typically available on each platform
 */
export interface PlatformAvailability {
  /** Fields available on all platforms */
  universal: Array<keyof SystemInfo>;
  
  /** Fields primarily available on Linux */
  linux_specific: Array<keyof SystemInfo>;
  
  /** Fields that may be empty on certain platforms */
  conditional: Array<keyof SystemInfo>;
}
