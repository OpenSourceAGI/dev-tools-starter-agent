#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';


export class FileManager {
  constructor() {
    this.currentPath = process.cwd();
    this.selectedIndex = 0;
    this.items = [];
    this.showHidden = false;
    this.sortBy = 'name'; // 'name', 'size', 'date', 'type'
    this.sortOrder = 'asc'; // 'asc', 'desc'
    this.clipboard = [];
    this.clipboardAction = null; // 'copy' or 'cut'
    this.viewMode = 'detailed'; // 'detailed', 'simple', 'grid'
    this.filterText = '';
    this.bookmarks = this.loadBookmarks();
    this.history = [process.cwd()];
    this.historyIndex = 0;
    this.selectedItems = new Set();
    this.multiSelectMode = false;
    this.searchMode = false;
    this.previewMode = false;
    this.splitView = false;
    this.rightPanePath = os.homedir();
    this.activePane = 'left'; // 'left', 'right'
    
    // File type icons
    this.fileIcons = {
      // Documents
      '.pdf': '📄', '.doc': '📝', '.docx': '📝', '.txt': '📄', '.md': '📋',
      '.rtf': '📝', '.odt': '📝', '.pages': '📝',
      // Images
      '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🎞️', '.bmp': '🖼️',
      '.svg': '🎨', '.ico': '🖼️', '.tiff': '🖼️', '.webp': '🖼️',
      // Videos
      '.mp4': '🎬', '.avi': '🎬', '.mov': '🎬', '.wmv': '🎬', '.flv': '🎬',
      '.mkv': '🎬', '.webm': '🎬', '.m4v': '🎬',
      // Audio
      '.mp3': '🎵', '.wav': '🎵', '.flac': '🎵', '.aac': '🎵', '.ogg': '🎵',
      '.wma': '🎵', '.m4a': '🎵',
      // Archives
      '.zip': '🗜️', '.rar': '🗜️', '.7z': '🗜️', '.tar': '🗜️', '.gz': '🗜️',
      '.bz2': '🗜️', '.xz': '🗜️',
      // Code
      '.js': '📜', '.html': '🌐', '.css': '🎨', '.json': '📋', '.xml': '📋',
      '.py': '🐍', '.java': '☕', '.cpp': '⚙️', '.c': '⚙️', '.h': '⚙️',
      '.php': '🐘', '.rb': '💎', '.go': '🐹', '.rs': '🦀', '.swift': '🦉',
      '.kt': '🎯', '.ts': '📘', '.jsx': '⚛️', '.tsx': '⚛️', '.vue': '💚',
      // Config
      '.ini': '⚙️', '.conf': '⚙️', '.cfg': '⚙️', '.yaml': '📋', '.yml': '📋',
      '.toml': '📋', '.env': '🔧',
      // Executables
      '.exe': '⚙️', '.msi': '📦', '.deb': '📦', '.rpm': '📦', '.dmg': '💿',
      '.app': '📱', '.AppImage': '📱',
      // Default
      'default': '📄'
    };
    
    // Toolbar icons
    this.toolbarIcons = [
      { icon: '🏠', action: 'home', tooltip: 'Go Home' },
      { icon: '⬆️', action: 'up', tooltip: 'Parent Directory' },
      { icon: '⬅️', action: 'back', tooltip: 'Back' },
      { icon: '➡️', action: 'forward', tooltip: 'Forward' },
      { icon: '🔄', action: 'refresh', tooltip: 'Refresh' },
      { icon: '📋', action: 'copy', tooltip: 'Copy' },
      { icon: '✂️', action: 'cut', tooltip: 'Cut' },
      { icon: '📄', action: 'paste', tooltip: 'Paste' },
      { icon: '🗑️', action: 'delete', tooltip: 'Delete' },
      { icon: '📁', action: 'newdir', tooltip: 'New Folder' },
      { icon: '📄', action: 'newfile', tooltip: 'New File' },
      { icon: '🔍', action: 'search', tooltip: 'Search' },
      { icon: '👁️', action: 'preview', tooltip: 'Preview' },
      { icon: '📊', action: 'view', tooltip: 'View Mode' },
      { icon: '📖', action: 'bookmark', tooltip: 'Bookmarks' },
      { icon: '🔧', action: 'settings', tooltip: 'Settings' }
    ];
    
    // Setup readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Enable mouse support
    process.stdout.write('\x1b[?1000h'); // Enable mouse tracking
    process.stdout.write('\x1b[?1006h'); // Enable SGR mouse mode
    
    // Enable raw mode for immediate key detection
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    // Hide cursor
    process.stdout.write('\x1B[?25l');
    
    // Handle cleanup on exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  cleanup() {
    // Show cursor
    process.stdout.write('\x1B[?25h');
    // Disable mouse tracking
    process.stdout.write('\x1b[?1000l');
    process.stdout.write('\x1b[?1006l');
    // Clear screen
    console.clear();
    this.saveBookmarks();
    process.exit(0);
  }

  loadBookmarks() {
    try {
      const bookmarksPath = path.join(os.homedir(), '.fileman-bookmarks.json');
      if (fs.existsSync(bookmarksPath)) {
        return JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
      }
    } catch (error) {
      // Ignore errors, return default bookmarks
    }
    return {
      'Home': os.homedir(),
      'Documents': path.join(os.homedir(), 'Documents'),
      'Downloads': path.join(os.homedir(), 'Downloads'),
      'Desktop': path.join(os.homedir(), 'Desktop')
    };
  }

  saveBookmarks() {
    try {
      const bookmarksPath = path.join(os.homedir(), '.fileman-bookmarks.json');
      fs.writeFileSync(bookmarksPath, JSON.stringify(this.bookmarks, null, 2));
    } catch (error) {
      // Ignore save errors
    }
  }

  getFileIcon(item) {
    if (item.isDirectory) {
      if (item.name.startsWith('.')) return '📂';
      return '📁';
    }
    
    const ext = path.extname(item.name).toLowerCase();
    return this.fileIcons[ext] || this.fileIcons.default;
  }

  async loadDirectory(dirPath = this.currentPath) {
    try {
      const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      let items = files
        .filter(item => this.showHidden || !item.name.startsWith('.'))
        .filter(item => !this.filterText || item.name.toLowerCase().includes(this.filterText.toLowerCase()))
        .map(item => {
          const fullPath = path.join(dirPath, item.name);
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch (e) {
            stats = { size: 0, mtime: new Date(), mode: 0 };
          }
          
          return {
            name: item.name,
            isDirectory: item.isDirectory(),
            isFile: item.isFile(),
            isSymbolicLink: item.isSymbolicLink(),
            size: stats.size,
            mtime: stats.mtime,
            mode: stats.mode,
            fullPath,
            permissions: this.getPermissions(stats.mode),
            type: item.isDirectory() ? 'directory' : path.extname(item.name).toLowerCase()
          };
        });

      // Sort items
      this.sortItems(items);
      
      if (dirPath === this.currentPath) {
        this.items = items;
        // Adjust selected index if necessary
        if (this.selectedIndex >= this.items.length) {
          this.selectedIndex = Math.max(0, this.items.length - 1);
        }
      }
      
      return items;
    } catch (error) {
      if (dirPath === this.currentPath) {
        this.items = [];
        this.selectedIndex = 0;
      }
      return [];
    }
  }

  getPermissions(mode) {
    const perms = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
    return [
      perms[(mode >> 6) & 7],  // Owner
      perms[(mode >> 3) & 7],  // Group
      perms[mode & 7]          // Others
    ].join('');
  }

  sortItems(items) {
    items.sort((a, b) => {
      // Directories first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      
      let result = 0;
      switch (this.sortBy) {
        case 'size':
          result = a.size - b.size;
          break;
        case 'date':
          result = a.mtime - b.mtime;
          break;
        case 'type':
          result = a.type.localeCompare(b.type);
          break;
        default:
          result = a.name.localeCompare(b.name, undefined, { numeric: true });
      }
      // Ties (e.g. a symlink and its target share size/mtime) fall back to name,
      // so order never depends on the filesystem's readdir order
      if (result === 0) result = a.name.localeCompare(b.name, undefined, { numeric: true });
      
      return this.sortOrder === 'desc' ? -result : result;
    });
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  renderToolbar() {
    const terminalWidth = process.stdout.columns;
    let toolbar = '\x1b[44m\x1b[37m'; // Blue background, white text
    
    // Render clickable icons
    for (let i = 0; i < this.toolbarIcons.length; i++) {
      const icon = this.toolbarIcons[i];
      toolbar += ` ${icon.icon} `;
    }
    
    // Fill remaining space
    const usedSpace = this.toolbarIcons.length * 3;
    const remainingSpace = Math.max(0, terminalWidth - usedSpace);
    toolbar += ' '.repeat(remainingSpace);
    
    toolbar += '\x1b[0m'; // Reset colors
    console.log(toolbar);
  }

  renderStatusBar() {
    const terminalWidth = process.stdout.columns;
    let statusBar = '\x1b[42m\x1b[30m'; // Green background, black text
    
    // Left side - current info
    const selectedItem = this.items[this.selectedIndex];
    let leftInfo = '';
    
    if (selectedItem) {
      leftInfo = `${selectedItem.name} | ${selectedItem.isDirectory ? '<DIR>' : this.formatSize(selectedItem.size)}`;
      if (this.selectedItems.size > 0) {
        leftInfo += ` | Selected: ${this.selectedItems.size}`;
      }
    }
    
    // Right side - stats
    const rightInfo = `${this.items.length} items | Sort: ${this.sortBy} ${this.sortOrder} | View: ${this.viewMode}`;
    
    // Calculate spacing
    const totalInfo = leftInfo.length + rightInfo.length;
    const spacing = Math.max(1, terminalWidth - totalInfo);
    
    statusBar += leftInfo + ' '.repeat(spacing) + rightInfo;
    
    // Trim if too long
    if (statusBar.length > terminalWidth + 10) { // +10 for color codes
      statusBar = statusBar.substring(0, terminalWidth + 10);
    }
    
    statusBar += '\x1b[0m'; // Reset colors
    console.log(statusBar);
  }

  renderFileList() {
    const terminalHeight = process.stdout.rows - 7; // Account for toolbar, header, status
    const terminalWidth = process.stdout.columns;
    
    if (this.splitView) {
      this.renderSplitView(terminalHeight, terminalWidth);
      return;
    }
    
    if (this.items.length === 0) {
      console.log('\x1b[2m  Empty directory\x1b[0m');
      return;
    }
    
    // Calculate start index for scrolling
    const startIndex = Math.max(0, this.selectedIndex - Math.floor(terminalHeight / 2));
    const endIndex = Math.min(this.items.length, startIndex + terminalHeight);
    
    for (let i = startIndex; i < endIndex; i++) {
      this.renderFileItem(i, terminalWidth);
    }
    
    // Show scroll indicator
    if (this.items.length > terminalHeight) {
      const scrollPercent = Math.round((this.selectedIndex / (this.items.length - 1)) * 100);
      console.log(`\x1b[2m[${scrollPercent}%] ${this.selectedIndex + 1}/${this.items.length}\x1b[0m`);
    }
  }

  renderFileItem(index, terminalWidth) {
    const item = this.items[index];
    const isSelected = index === this.selectedIndex;
    const isMultiSelected = this.selectedItems.has(index);
    
    let prefix = '  ';
    let suffix = '\x1b[0m';
    
    if (isSelected && isMultiSelected) {
      prefix = '\x1b[43m\x1b[30m> '; // Yellow background for selected + multi-selected
    } else if (isSelected) {
      prefix = '\x1b[47m\x1b[30m> '; // White background for selected
    } else if (isMultiSelected) {
      prefix = '\x1b[46m\x1b[30m* '; // Cyan background for multi-selected
    }
    
    const icon = this.getFileIcon(item);
    let nameColor = this.getFileColor(item);
    
    if (this.viewMode === 'simple') {
      const displayName = this.truncateName(item.name, terminalWidth - 10);
      console.log(prefix + icon + ' ' + nameColor + displayName + suffix);
    } else if (this.viewMode === 'detailed') {
      const sizeStr = item.isDirectory ? '<DIR>' : this.formatSize(item.size);
      const dateStr = this.formatDate(item.mtime);
      const permStr = item.permissions;
      
      const maxNameLength = Math.max(20, terminalWidth - 45);
      const displayName = this.truncateName(item.name, maxNameLength);
      
      console.log(prefix + icon + ' ' + nameColor + displayName.padEnd(maxNameLength) + 
                 '\x1b[0m ' + permStr + ' ' + sizeStr.padStart(8) + ' ' + dateStr + suffix);
    } else if (this.viewMode === 'grid') {
      // Grid view implementation would go here
      const displayName = this.truncateName(item.name, 15);
      process.stdout.write(prefix + icon + ' ' + nameColor + displayName.padEnd(15) + suffix + '  ');
      if ((index - (Math.max(0, this.selectedIndex - Math.floor((process.stdout.rows - 7) / 2)))) % 4 === 3) {
        console.log('');
      }
    }
  }

  renderSplitView(terminalHeight, terminalWidth) {
    const halfWidth = Math.floor(terminalWidth / 2) - 1;
    
    // Render left pane (current directory)
    console.log('\x1b[1m\x1b[34mLeft Pane: ' + this.currentPath + '\x1b[0m');
    // Left pane file list would go here
    
    // Render right pane
    console.log('\x1b[1m\x1b[35mRight Pane: ' + this.rightPanePath + '\x1b[0m');
    // Right pane file list would go here
  }

  getFileColor(item) {
    if (item.isSymbolicLink) return '\x1b[36m'; // Cyan for symlinks
    if (item.isDirectory) return '\x1b[34m'; // Blue for directories
    if (item.name.startsWith('.')) return '\x1b[2m'; // Dim for hidden files
    if (item.mode & 0o111) return '\x1b[32m'; // Green for executables
    
    // Color by file type
    const ext = path.extname(item.name).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(ext)) return '\x1b[35m'; // Magenta for images
    if (['.mp3', '.wav', '.flac', '.aac', '.ogg'].includes(ext)) return '\x1b[33m'; // Yellow for audio
    if (['.mp4', '.avi', '.mov', '.wmv', '.mkv'].includes(ext)) return '\x1b[31m'; // Red for video
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return '\x1b[91m'; // Bright red for archives
    
    return '\x1b[37m'; // White for regular files
  }

  truncateName(name, maxLength) {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  }

  render() {
    console.clear();
    
    const terminalWidth = process.stdout.columns;
    
    // Header with path
    console.log('\x1b[1m\x1b[34m' + '='.repeat(terminalWidth) + '\x1b[0m');
    let pathDisplay = this.currentPath;
    if (pathDisplay.length > terminalWidth - 20) {
      pathDisplay = '...' + pathDisplay.substring(pathDisplay.length - (terminalWidth - 23));
    }
    console.log('\x1b[1m\x1b[36mFile Manager\x1b[0m - \x1b[33m' + pathDisplay + '\x1b[0m');
    
    // Render toolbar
    this.renderToolbar();
    
    // Filter/Search bar
    if (this.searchMode || this.filterText) {
      console.log('\x1b[43m\x1b[30mSearch: ' + this.filterText + '_\x1b[0m');
    }
    
    console.log('\x1b[1m\x1b[34m' + '='.repeat(terminalWidth) + '\x1b[0m');
    
    // File list
    this.renderFileList();
    
    // Preview pane
    if (this.previewMode && this.items.length > 0) {
      this.renderPreview();
    }
    
    // Status bar
    this.renderStatusBar();
    
    // Show clipboard status
    if (this.clipboard.length > 0) {
      const action = this.clipboardAction === 'copy' ? 'Copied' : 'Cut';
      const items = this.clipboard.length === 1 ? 
        path.basename(this.clipboard[0]) : 
        `${this.clipboard.length} items`;
      console.log(`\x1b[33m${action}: ${items}\x1b[0m`);
    }
  }

  renderPreview() {
    const selectedItem = this.items[this.selectedIndex];
    if (!selectedItem) return;
    
    console.log('\x1b[1m\x1b[36m--- Preview ---\x1b[0m');
    
    if (selectedItem.isDirectory) {
      // Show directory contents
      this.loadDirectory(selectedItem.fullPath).then(items => {
        console.log(`\x1b[2mDirectory contains ${items.length} items\x1b[0m`);
        items.slice(0, 5).forEach(item => {
          console.log(`\x1b[2m  ${this.getFileIcon(item)} ${item.name}\x1b[0m`);
        });
        if (items.length > 5) {
          console.log(`\x1b[2m  ... and ${items.length - 5} more\x1b[0m`);
        }
      });
    } else {
      // Show file info and content preview
      console.log(`\x1b[2mSize: ${this.formatSize(selectedItem.size)}\x1b[0m`);
      console.log(`\x1b[2mModified: ${this.formatDate(selectedItem.mtime)}\x1b[0m`);
      console.log(`\x1b[2mPermissions: ${selectedItem.permissions}\x1b[0m`);
      
      // Try to show file content preview for text files
      const ext = path.extname(selectedItem.name).toLowerCase();
      if (['.txt', '.md', '.js', '.json', '.html', '.css', '.py', '.java'].includes(ext)) {
        try {
          const content = fs.readFileSync(selectedItem.fullPath, 'utf8');
          const lines = content.split('\n').slice(0, 3);
          console.log('\x1b[2mContent preview:\x1b[0m');
          lines.forEach(line => {
            console.log(`\x1b[2m  ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}\x1b[0m`);
          });
        } catch (error) {
          console.log('\x1b[2mCannot preview file content\x1b[0m');
        }
      }
    }
  }

  async handleKeyPress(key) {
    // Handle mouse input
    if (key.startsWith('\x1b[M') || key.startsWith('\x1b[<')) {
      this.handleMouseInput(key);
      return;
    }
    
    // Handle search mode
    if (this.searchMode) {
      if (key === '\x1b' || key === '\r' || key === '\n') { // Escape or Enter
        this.searchMode = false;
        if (key === '\r' || key === '\n') {
          await this.loadDirectory();
        }
      } else if (key === '\x7f' || key === '\b') { // Backspace
        this.filterText = this.filterText.slice(0, -1);
        await this.loadDirectory();
      } else if (key.length === 1 && key >= ' ') {
        this.filterText += key;
        await this.loadDirectory();
      }
      return;
    }
    
    switch (key) {
      case '\u001b[A': // Up arrow
      case 'k':
        this.moveSelection(-1);
        break;
        
      case '\u001b[B': // Down arrow
      case 'j':
        this.moveSelection(1);
        break;
        
      case '\r': // Enter
      case '\n':
        await this.openSelected();
        break;
        
      case '\u001b[D': // Left arrow
      case 'h':
        await this.goUp();
        break;
        
      case '\u001b[C': // Right arrow
      case 'l':
        if (this.items.length > 0 && this.items[this.selectedIndex].isDirectory) {
          await this.openSelected();
        }
        break;
        
      case ' ': // Space for multi-select
        this.toggleMultiSelect();
        break;
        
      case 'a': // Select all
        this.selectAll();
        break;
        
      case 'A': // Deselect all
        this.selectedItems.clear();
        break;
        
      case 's': // Sort
        this.cycleSortMode();
        await this.loadDirectory();
        break;
        
      case 'S': // Sort order
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        await this.loadDirectory();
        break;
        
      case 'v': // View mode
        this.cycleViewMode();
        break;
        
      case 'H': // Toggle hidden files
        this.showHidden = !this.showHidden;
        await this.loadDirectory();
        break;
        
      case 'c': // Copy
        this.copySelected();
        break;
        
      case 'x': // Cut
        this.cutSelected();
        break;
        
      case 'p': // Paste
        await this.paste();
        break;
        
      case 'd': // Delete
        await this.deleteSelected();
        break;
        
      case 'n': // New file
        await this.createNew();
        break;
        
      case 'N': // New directory
        await this.createNew('directory');
        break;
        
      case 'r': // Rename
        await this.renameSelected();
        break;
        
      case 'f': // Search
      case '/':
        this.searchMode = true;
        this.filterText = '';
        break;
        
      case 'g': // Go to top
        this.selectedIndex = 0;
        break;
        
      case 'G': // Go to bottom
        this.selectedIndex = Math.max(0, this.items.length - 1);
        break;
        
      case 'b': // Bookmarks
        await this.showBookmarks();
        break;
        
      case 'B': // Add bookmark
        await this.addBookmark();
        break;
        
      case 'P': // Toggle preview
        this.previewMode = !this.previewMode;
        break;
        
      case 'T': // Toggle split view
        this.splitView = !this.splitView;
        break;
        
      case 'R': // Refresh
        await this.loadDirectory();
        break;
        
      case 'u': // Go back in history
        this.goBack();
        break;
        
      case 'U': // Go forward in history
        this.goForward();
        break;
        
      case 'q': // Quit
      case '\u0003': // Ctrl+C
        this.cleanup();
        break;
        
      case '?': // Help
        await this.showHelp();
        break;
    }
  }

  handleMouseInput(sequence) {
    // Parse mouse input for toolbar clicks
    // This is a simplified implementation
    if (sequence.includes('0;')) {
      // Mouse click on first row (toolbar)
      const clickX = parseInt(sequence.match(/;(\d+)/)?.[1] || '0');
      const iconIndex = Math.floor(clickX / 3);
      
      if (iconIndex >= 0 && iconIndex < this.toolbarIcons.length) {
        this.executeToolbarAction(this.toolbarIcons[iconIndex].action);
      }
    }
  }

  async executeToolbarAction(action) {
    switch (action) {
      case 'home':
        this.currentPath = os.homedir();
        this.selectedIndex = 0;
        await this.loadDirectory();
        break;
      case 'up':
        await this.goUp();
        break;
      case 'back':
        this.goBack();
        break;
      case 'forward':
        this.goForward();
        break;
      case 'refresh':
        await this.loadDirectory();
        break;
      case 'copy':
        this.copySelected();
        break;
      case 'cut':
        this.cutSelected();
        break;
      case 'paste':
        await this.paste();
        break;
      case 'delete':
        await this.deleteSelected();
        break;
      case 'newdir':
        await this.createNew('directory');
        break;
      case 'newfile':
        await this.createNew('file');
        break;
      case 'search':
        this.searchMode = true;
        this.filterText = '';
        break;
      case 'preview':
        this.previewMode = !this.previewMode;
        break;
      case 'view':
        this.cycleViewMode();
        break;
      case 'bookmark':
        await this.showBookmarks();
        break;
      case 'settings':
        await this.showSettings();
        break;
    }
  }

  moveSelection(direction) {
    const newIndex = this.selectedIndex + direction;
    if (newIndex >= 0 && newIndex < this.items.length) {
      this.selectedIndex = newIndex;
    }
  }

  toggleMultiSelect() {
    if (this.selectedItems.has(this.selectedIndex)) {
      this.selectedItems.delete(this.selectedIndex);
    } else {
      this.selectedItems.add(this.selectedIndex);
    }
    this.multiSelectMode = this.selectedItems.size > 0;
  }

  selectAll() {
    for (let i = 0; i < this.items.length; i++) {
      this.selectedItems.add(i);
    }
    this.multiSelectMode = true;
  }

  cycleSortMode() {
    const modes = ['name', 'size', 'date', 'type'];
    const currentIndex = modes.indexOf(this.sortBy);
    this.sortBy = modes[(currentIndex + 1) % modes.length];
  }

  cycleViewMode() {
    const modes = ['detailed', 'simple', 'grid'];
    const currentIndex = modes.indexOf(this.viewMode);
    this.viewMode = modes[(currentIndex + 1) % modes.length];
  }

  async openSelected() {
    if (this.items.length === 0) return;
    
    const selected = this.items[this.selectedIndex];
    
    if (selected.isDirectory) {
      this.currentPath = selected.fullPath;
      this.addToHistory(this.currentPath);
      this.selectedIndex = 0;
      this.selectedItems.clear();
      await this.loadDirectory();
    } else {
      // Try to open file with system default application
      try {
        const command = process.platform === 'win32' ? 'start' : 
                       process.platform === 'darwin' ? 'open' : 'xdg-open';
        execSync(`${command} "${selected.fullPath}"`, { stdio: 'ignore' });
      } catch (error) {
        console.log(`\x1b[31mCannot open file: ${selected.name}\x1b[0m`);
        await this.waitForKey();
      }
    }
  }

  async goUp() {
    const parentPath = path.dirname(this.currentPath);
    if (parentPath !== this.currentPath) {
      this.currentPath = parentPath;
      this.addToHistory(this.currentPath);
      this.selectedIndex = 0;
      this.selectedItems.clear();
      await this.loadDirectory();
    }
  }

  // Records the directory just navigated *to*, so back/forward can return to it.
  addToHistory(path) {
    // Remove forward history when adding new path
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(path);
    this.historyIndex = this.history.length - 1;
    
    // Limit history size
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentPath = this.history[this.historyIndex];
      this.selectedIndex = 0;
      this.selectedItems.clear();
      this.loadDirectory();
    }
  }

  goForward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.currentPath = this.history[this.historyIndex];
      this.selectedIndex = 0;
      this.selectedItems.clear();
      this.loadDirectory();
    }
  }

  copySelected() {
    if (this.selectedItems.size > 0) {
      this.clipboard = Array.from(this.selectedItems).map(i => this.items[i].fullPath);
    } else if (this.items.length > 0) {
      this.clipboard = [this.items[this.selectedIndex].fullPath];
    }
    this.clipboardAction = 'copy';
  }

  cutSelected() {
    if (this.selectedItems.size > 0) {
      this.clipboard = Array.from(this.selectedItems).map(i => this.items[i].fullPath);
    } else if (this.items.length > 0) {
      this.clipboard = [this.items[this.selectedIndex].fullPath];
    }
    this.clipboardAction = 'cut';
  }

  async paste() {
    if (this.clipboard.length === 0) return;
    
    try {
      for (const sourcePath of this.clipboard) {
        const fileName = path.basename(sourcePath);
        const destPath = path.join(this.currentPath, fileName);
        
        if (this.clipboardAction === 'copy') {
          await this.copyFile(sourcePath, destPath);
        } else {
          await fs.promises.rename(sourcePath, destPath);
        }
      }
      
      if (this.clipboardAction === 'cut') {
        this.clipboard = [];
        this.clipboardAction = null;
      }
      
      this.selectedItems.clear();
      await this.loadDirectory();
    } catch (error) {
      console.log(`\x1b[31mPaste failed: ${error.message}\x1b[0m`);
      await this.waitForKey();
    }
  }

  async copyFile(src, dest) {
    const stat = await fs.promises.stat(src);
    
    if (stat.isDirectory()) {
      await fs.promises.mkdir(dest, { recursive: true });
      const files = await fs.promises.readdir(src);
      
      for (const file of files) {
        await this.copyFile(path.join(src, file), path.join(dest, file));
      }
    } else {
      await fs.promises.copyFile(src, dest);
    }
  }

  async deleteSelected() {
    const itemsToDelete = this.selectedItems.size > 0 ? 
      Array.from(this.selectedItems).map(i => this.items[i]) : 
      this.items.length > 0 ? [this.items[this.selectedIndex]] : [];
    
    if (itemsToDelete.length === 0) return;
    
    const names = itemsToDelete.map(item => item.name).join(', ');
    console.log(`\x1b[31mDelete ${itemsToDelete.length} item(s): ${names}? (y/N)\x1b[0m`);
    
    const confirmation = await this.getInput();
    if (confirmation.toLowerCase() === 'y') {
      try {
        for (const item of itemsToDelete) {
          if (item.isDirectory) {
            await fs.promises.rmdir(item.fullPath, { recursive: true });
          } else {
            await fs.promises.unlink(item.fullPath);
          }
        }
        
        this.selectedItems.clear();
        if (this.selectedIndex >= this.items.length - itemsToDelete.length) {
          this.selectedIndex = Math.max(0, this.selectedIndex - itemsToDelete.length);
        }
        
        await this.loadDirectory();
      } catch (error) {
        console.log(`\x1b[31mDelete failed: ${error.message}\x1b[0m`);
        await this.waitForKey();
      }
    }
  }

  async renameSelected() {
    if (this.items.length === 0) return;
    
    const selected = this.items[this.selectedIndex];
    console.log(`\x1b[33mRename "${selected.name}" to:\x1b[0m`);
    
    const newName = await this.getInput();
    if (newName.trim() && newName.trim() !== selected.name) {
      try {
        const newPath = path.join(this.currentPath, newName.trim());
        await fs.promises.rename(selected.fullPath, newPath);
        await this.loadDirectory();
      } catch (error) {
        console.log(`\x1b[31mRename failed: ${error.message}\x1b[0m`);
        await this.waitForKey();
      }
    }
  }

  async createNew(type = null) {
    if (!type) {
      console.log('\x1b[33mCreate (f)ile or (d)irectory? (f/d)\x1b[0m');
      const typeInput = await this.getInput();
      type = typeInput.toLowerCase() === 'd' ? 'directory' : 'file';
    }
    
    const itemType = type === 'directory' ? 'directory' : 'file';
    console.log(`\x1b[33mEnter ${itemType} name:\x1b[0m`);
    const name = await this.getInput();
    
    if (name.trim()) {
      try {
        const fullPath = path.join(this.currentPath, name.trim());
        
        if (type === 'directory') {
          await fs.promises.mkdir(fullPath);
        } else {
          await fs.promises.writeFile(fullPath, '');
        }
        
        await this.loadDirectory();
      } catch (error) {
        console.log(`\x1b[31mCreate failed: ${error.message}\x1b[0m`);
        await this.waitForKey();
      }
    }
  }

  async showBookmarks() {
    console.clear();
    console.log('\x1b[1m\x1b[36m=== Bookmarks ===\x1b[0m');
    
    const bookmarkNames = Object.keys(this.bookmarks);
    for (let i = 0; i < bookmarkNames.length; i++) {
      const name = bookmarkNames[i];
      const path = this.bookmarks[name];
      console.log(`${i + 1}. ${name} -> ${path}`);
    }
    
    console.log('\nEnter bookmark number to navigate, or press Enter to cancel:');
    const input = await this.getInput();
    const num = parseInt(input);
    
    if (num > 0 && num <= bookmarkNames.length) {
      const bookmarkName = bookmarkNames[num - 1];
      const bookmarkPath = this.bookmarks[bookmarkName];
      
      if (fs.existsSync(bookmarkPath)) {
        this.currentPath = bookmarkPath;
        this.addToHistory(this.currentPath);
        this.selectedIndex = 0;
        this.selectedItems.clear();
        await this.loadDirectory();
      } else {
        console.log(`\x1b[31mBookmark path does not exist: ${bookmarkPath}\x1b[0m`);
        await this.waitForKey();
      }
    }
  }

  async addBookmark() {
    console.log(`\x1b[33mAdd bookmark for "${this.currentPath}".\nEnter bookmark name:\x1b[0m`);
    const name = await this.getInput();
    
    if (name.trim()) {
      this.bookmarks[name.trim()] = this.currentPath;
      this.saveBookmarks();
      console.log(`\x1b[32mBookmark "${name.trim()}" added!\x1b[0m`);
      await this.waitForKey();
    }
  }

  async showSettings() {
    console.clear();
    console.log('\x1b[1m\x1b[36m=== Settings ===\x1b[0m');
    console.log(`1. Show hidden files: ${this.showHidden ? 'ON' : 'OFF'}`);
    console.log(`2. Sort by: ${this.sortBy}`);
    console.log(`3. Sort order: ${this.sortOrder}`);
    console.log(`4. View mode: ${this.viewMode}`);
    console.log(`5. Preview mode: ${this.previewMode ? 'ON' : 'OFF'}`);
    console.log(`6. Split view: ${this.splitView ? 'ON' : 'OFF'}`);
    console.log('\nEnter setting number to toggle, or press Enter to cancel:');
    
    const input = await this.getInput();
    const num = parseInt(input);
    
    switch (num) {
      case 1:
        this.showHidden = !this.showHidden;
        await this.loadDirectory();
        break;
      case 2:
        this.cycleSortMode();
        await this.loadDirectory();
        break;
      case 3:
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        await this.loadDirectory();
        break;
      case 4:
        this.cycleViewMode();
        break;
      case 5:
        this.previewMode = !this.previewMode;
        break;
      case 6:
        this.splitView = !this.splitView;
        break;
    }
  }

  async showHelp() {
    console.clear();
    console.log('\x1b[1m\x1b[36m=== File Manager Help ===\x1b[0m');
    console.log('\x1b[1mNavigation:\x1b[0m');
    console.log('  ↑/↓, j/k     - Move up/down');
    console.log('  ←/→, h/l     - Parent dir/Enter dir');
    console.log('  Enter        - Open file/directory');
    console.log('  g/G          - Go to top/bottom');
    console.log('  u/U          - Back/Forward in history');
    console.log('');
    console.log('\x1b[1mFile Operations:\x1b[0m');
    console.log('  Space        - Multi-select toggle');
    console.log('  a/A          - Select all/Deselect all');
    console.log('  c/x/p        - Copy/Cut/Paste');
    console.log('  d            - Delete');
    console.log('  r            - Rename');
    console.log('  n/N          - New file/New directory');
    console.log('');
    console.log('\x1b[1mView & Search:\x1b[0m');
    console.log('  v            - Cycle view mode');
    console.log('  s/S          - Sort by/Sort order');
    console.log('  H            - Toggle hidden files');
    console.log('  f,/          - Search/Filter');
    console.log('  P            - Toggle preview');
    console.log('  T            - Toggle split view');
    console.log('  R            - Refresh');
    console.log('');
    console.log('\x1b[1mBookmarks & Other:\x1b[0m');
    console.log('  b/B          - Show bookmarks/Add bookmark');
    console.log('  ?            - Show this help');
    console.log('  q            - Quit');
    console.log('');
    console.log('\x1b[1mToolbar:\x1b[0m');
    console.log('  Click on toolbar icons for quick actions');
    console.log('');
    console.log('Press any key to continue...');
    await this.waitForKey();
  }

  async getInput() {
    // Show cursor temporarily
    process.stdout.write('\x1B[?25h');
    
    return new Promise((resolve) => {
      this.rl.question('', (answer) => {
        // Hide cursor again
        process.stdout.write('\x1B[?25l');
        resolve(answer);
      });
    });
  }

  async waitForKey() {
    return new Promise((resolve) => {
      const handler = () => {
        process.stdin.removeListener('data', handler);
        resolve();
      };
      process.stdin.once('data', handler);
    });
  }

  async run() {
    await this.loadDirectory();
    this.render();
    
    process.stdin.on('data', async (key) => {
      await this.handleKeyPress(key);
      this.render();
    });
  }
}

/**
 * True when this file is the program being run (the `fm` bin), as opposed to
 * being imported — so importing the class for tests doesn't take over the
 * terminal. `realpath` on both sides because npm links bins through symlinks.
 */
function isMainModule() {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  new FileManager().run();
}
