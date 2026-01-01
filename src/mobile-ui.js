/**
 * Mobile Bottom Sheet UI for Bikemap
 * Handles swipeable bottom sheet interactions and mobile navigation
 */

(function() {
  'use strict';

  // Only initialize on mobile devices
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  
  // State management
  let sheetState = {
    isOpen: false,
    isExpanded: false,
    currentPanel: null,
    startY: 0,
    currentY: 0,
    isDragging: false
  };

  // DOM Elements (populated after DOM ready)
  let elements = {};

  /**
   * Initialize mobile UI
   */
  function init() {
    if (!isMobile && !window.forceMobileUI) {
      console.log('[MobileUI] Desktop detected, skipping mobile UI initialization');
      return;
    }

    console.log('[MobileUI] Initializing mobile UI...');
    
    createMobileElements();
    cacheElements();
    bindEvents();
    
    // Listen for resize to handle orientation changes
    window.addEventListener('resize', debounce(handleResize, 250));
    
    console.log('[MobileUI] Mobile UI initialized');
  }

  /**
   * Create mobile UI elements and inject into DOM
   */
  function createMobileElements() {
    // Create bottom navigation bar
    const bottomNav = document.createElement('nav');
    bottomNav.className = 'mobile-bottom-nav';
    bottomNav.innerHTML = `
      <button class="mobile-nav-btn" data-panel="info" aria-label="Route Info">
        <i class="fa fa-info-circle"></i>
        <span>Info</span>
      </button>
      <button class="mobile-nav-btn" data-panel="overlays" aria-label="Overlays">
        <i class="fa fa-th-list"></i>
        <span>Layers</span>
      </button>
      <button class="mobile-nav-btn" data-panel="offline" aria-label="Offline Mode">
        <i class="fa fa-cloud-download"></i>
        <span>Offline</span>
      </button>
      <button class="mobile-nav-btn" data-panel="about" aria-label="About">
        <i class="fa fa-question-circle-o"></i>
        <span>About</span>
      </button>
    `;

    // Create bottom sheet
    const bottomSheet = document.createElement('div');
    bottomSheet.className = 'mobile-bottom-sheet';
    bottomSheet.innerHTML = `
      <div class="sheet-handle" aria-label="Drag to resize"></div>
      <div class="sheet-header">
        <h3 class="sheet-title">Info</h3>
        <button class="sheet-close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="sheet-content">
        <!-- Info Panel -->
        <div class="sheet-panel" id="mobile-panel-info">
          <div id="mobile-sidebar-content">
            <h4>Route Info</h4>
            <p>Please select a route to load details.</p>
          </div>
          <div id="mobile-sidebar-description"></div>
          <div id="mobile-elevation-container"></div>
          <div id="mobile-data-summary" class="route-stats">
            <div class="stat-item">
              <div class="stat-label">Length</div>
              <div class="stat-value" id="mobile-stat-length">--</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Max Elevation</div>
              <div class="stat-value" id="mobile-stat-maxele">--</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Min Elevation</div>
              <div class="stat-value" id="mobile-stat-minele">--</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Elevation Gain</div>
              <div class="stat-value" id="mobile-stat-gain">--</div>
            </div>
          </div>
        </div>

        <!-- Overlays Panel -->
        <div class="sheet-panel" id="mobile-panel-overlays">
          <h4>Overlays</h4>
          <div class="overlay-item">
            <span>Recreation Sites BC</span>
            <label class="switch">
              <input type="checkbox" id="mobile-bcrec" onclick="layerControl('bcrec')">
              <span class="slider round"></span>
            </label>
          </div>
          <h4 style="margin-top: 24px;">Routes</h4>
          <a href="routes/t2s/index.html" style="display: block; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <i class="fa fa-map" style="margin-right: 8px;"></i> Tree to Sea 2022
          </a>
        </div>

        <!-- Offline Panel -->
        <div class="sheet-panel" id="mobile-panel-offline">
          <h4>Offline Mode</h4>
          <p>Download map tiles and routes to use Bikemap offline.</p>
          
          <div style="margin: 16px 0; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <p style="margin: 0;"><strong>Service Worker:</strong> <span id="mobile-sw-status" style="color: #4685d6;">Checking...</span></p>
          </div>

          <div style="margin: 16px 0; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <p style="margin: 0 0 4px;"><strong>GPX Routes:</strong> <span id="mobile-gpx-status" style="color: #9c27b0;">Loading...</span></p>
            <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 0;">Road & Connector routes auto-cached</p>
          </div>

          <div style="margin: 16px 0;">
            <p><strong>Map Tiles:</strong> <span id="mobile-storage">0</span> tiles</p>
          </div>

          <h5 style="margin: 20px 0 12px;">Download Tiles</h5>
          <div style="margin-bottom: 12px;">
            <label for="mobile-zoom-level">Zoom Level: <span id="mobile-zoom-value">13</span></label>
            <input type="range" id="mobile-zoom-level" min="11" max="15" value="13" style="width: 100%;">
          </div>
          
          <div class="grid-buttons">
            <button id="mobile-download-tiles-btn" class="button">
              <i class="fa fa-download"></i> Download
            </button>
            <button id="mobile-clear-tiles-btn" class="button" style="background: #d32f2f;">
              <i class="fa fa-trash"></i> Clear
            </button>
          </div>

          <h5 style="margin: 20px 0 12px;">Download Routes</h5>
          <div class="grid-buttons" style="margin-bottom: 8px;">
            <button id="mobile-cache-gravel-btn" class="button" style="background: #8bc34a;">
              <i class="fa fa-download"></i> Gravel
            </button>
            <button id="mobile-cache-recon-btn" class="button" style="background: #ffc107;">
              <i class="fa fa-download"></i> Recon
            </button>
          </div>
          <button id="mobile-cache-all-btn" class="button" style="background: #ff6f00; width: 100%;">
            <i class="fa fa-download"></i> Download All Routes
          </button>

          <div id="mobile-progress-wrapper" style="display: none; margin-top: 16px;">
            <div style="font-size: 13px; margin-bottom: 8px;">
              <span id="mobile-progress-text">Downloading...</span>
              <span id="mobile-progress-count" style="float: right;">0/0</span>
            </div>
            <div style="background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
              <div id="mobile-progressbar" style="
                background: #4CAF50;
                height: 8px;
                width: 0%;
                transition: width 0.3s ease;
              "></div>
            </div>
          </div>
        </div>

        <!-- About Panel -->
        <div class="sheet-panel" id="mobile-panel-about">
          <h4>What is this site?</h4>
          <p>This site is a personal project of Joel Barrette, designed to help with route planning for bikepacking/gravel biking adventures.</p>
          <p>It's being manually maintained as a kind of blog for all past trips as well as planned future trips. Some routes from other riders' trip reports have been included but links to their posts are in the description.</p>
        </div>
      </div>
    `;

    // Append to body
    document.body.appendChild(bottomNav);
    document.body.appendChild(bottomSheet);
  }

  /**
   * Cache DOM element references
   */
  function cacheElements() {
    elements = {
      bottomNav: document.querySelector('.mobile-bottom-nav'),
      bottomSheet: document.querySelector('.mobile-bottom-sheet'),
      sheetHandle: document.querySelector('.sheet-handle'),
      sheetHeader: document.querySelector('.sheet-header'),
      sheetTitle: document.querySelector('.sheet-title'),
      sheetCloseBtn: document.querySelector('.sheet-close-btn'),
      sheetContent: document.querySelector('.sheet-content'),
      navButtons: document.querySelectorAll('.mobile-nav-btn'),
      panels: document.querySelectorAll('.sheet-panel')
    };
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Navigation button clicks
    elements.navButtons.forEach(btn => {
      btn.addEventListener('click', handleNavClick);
    });

    // Close button
    elements.sheetCloseBtn.addEventListener('click', closeSheet);

    // Sheet handle drag events
    elements.sheetHandle.addEventListener('touchstart', handleDragStart, { passive: true });
    elements.sheetHandle.addEventListener('touchmove', handleDrag, { passive: false });
    elements.sheetHandle.addEventListener('touchend', handleDragEnd);

    // Also allow dragging from header
    elements.sheetHeader.addEventListener('touchstart', handleDragStart, { passive: true });
    elements.sheetHeader.addEventListener('touchmove', handleDrag, { passive: false });
    elements.sheetHeader.addEventListener('touchend', handleDragEnd);

    // Close sheet when clicking outside (on the map)
    document.getElementById('map')?.addEventListener('click', () => {
      if (sheetState.isOpen) {
        closeSheet();
      }
    });

    // Sync mobile UI with desktop sidebar state changes
    syncWithDesktopSidebar();

    // Sync checkbox states
    syncCheckboxStates();

    // Sync offline status
    syncOfflineStatus();
  }

  /**
   * Handle navigation button click
   */
  function handleNavClick(e) {
    const panel = e.currentTarget.dataset.panel;
    
    // Update active state
    elements.navButtons.forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');

    // If same panel is clicked and sheet is open, close it
    if (sheetState.currentPanel === panel && sheetState.isOpen) {
      closeSheet();
      return;
    }

    // Show the panel
    showPanel(panel);
    openSheet();
  }

  /**
   * Show a specific panel
   */
  function showPanel(panelId) {
    const panelTitles = {
      'info': 'Route Info',
      'overlays': 'Layers & Routes',
      'offline': 'Offline Mode',
      'about': 'About'
    };

    // Hide all panels
    elements.panels.forEach(panel => panel.classList.remove('active'));

    // Show target panel
    const targetPanel = document.getElementById(`mobile-panel-${panelId}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      elements.sheetTitle.textContent = panelTitles[panelId] || 'Info';
      sheetState.currentPanel = panelId;
    }
  }

  /**
   * Open the bottom sheet
   */
  function openSheet() {
    elements.bottomSheet.classList.add('open');
    sheetState.isOpen = true;
  }

  /**
   * Close the bottom sheet
   */
  function closeSheet() {
    elements.bottomSheet.classList.remove('open', 'expanded');
    sheetState.isOpen = false;
    sheetState.isExpanded = false;
    
    // Remove active state from nav buttons
    elements.navButtons.forEach(btn => btn.classList.remove('active'));
  }

  /**
   * Toggle sheet expanded state
   */
  function toggleExpanded() {
    sheetState.isExpanded = !sheetState.isExpanded;
    elements.bottomSheet.classList.toggle('expanded', sheetState.isExpanded);
  }

  /**
   * Handle drag start
   */
  function handleDragStart(e) {
    if (e.touches && e.touches.length === 1) {
      sheetState.startY = e.touches[0].clientY;
      sheetState.isDragging = true;
    }
  }

  /**
   * Handle dragging
   */
  function handleDrag(e) {
    if (!sheetState.isDragging || !e.touches) return;

    const currentY = e.touches[0].clientY;
    const deltaY = sheetState.startY - currentY;

    // Prevent default to stop page scrolling while dragging handle
    if (Math.abs(deltaY) > 10) {
      e.preventDefault();
    }
  }

  /**
   * Handle drag end
   */
  function handleDragEnd(e) {
    if (!sheetState.isDragging) return;

    const endY = e.changedTouches[0].clientY;
    const deltaY = sheetState.startY - endY;
    const threshold = 50;

    if (deltaY > threshold) {
      // Swiped up - expand or open
      if (!sheetState.isOpen) {
        openSheet();
      } else if (!sheetState.isExpanded) {
        toggleExpanded();
      }
    } else if (deltaY < -threshold) {
      // Swiped down - collapse or close
      if (sheetState.isExpanded) {
        toggleExpanded();
      } else {
        closeSheet();
      }
    }

    sheetState.isDragging = false;
  }

  /**
   * Sync with desktop sidebar content changes
   */
  function syncWithDesktopSidebar() {
    // Watch for content changes in the desktop sidebar
    const desktopContent = document.getElementById('sidebar-content');
    const desktopDescription = document.getElementById('sidebar-info-description');

    if (desktopContent) {
      const observer = new MutationObserver(() => {
        const mobileContent = document.getElementById('mobile-sidebar-content');
        if (mobileContent) {
          mobileContent.innerHTML = desktopContent.innerHTML;
        }
      });

      observer.observe(desktopContent, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });
    }

    // Create independent elevation chart for mobile
    createMobileElevationChart();

    // Sync data summary values
    const syncDataSummary = () => {
      const mappings = [
        { desktop: '.totlen .summaryvalue', mobile: '#mobile-stat-length' },
        { desktop: '.maxele .summaryvalue', mobile: '#mobile-stat-maxele' },
        { desktop: '.minele .summaryvalue', mobile: '#mobile-stat-minele' },
        { desktop: '.gain .summaryvalue', mobile: '#mobile-stat-gain' }
      ];

      mappings.forEach(({ desktop, mobile }) => {
        const desktopEl = document.querySelector(desktop);
        const mobileEl = document.querySelector(mobile);
        if (desktopEl && mobileEl) {
          mobileEl.textContent = desktopEl.textContent || '--';
        }
      });
    };

    // Watch data summary for changes
    const dataSummary = document.getElementById('data-summary');
    if (dataSummary) {
      const summaryObserver = new MutationObserver(syncDataSummary);
      summaryObserver.observe(dataSummary, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });
    }
  }

  /**
   * Create independent elevation chart for mobile using D3
   * This draws a responsive chart that fills its container
   */
  function createMobileElevationChart() {
    const mobileContainer = document.getElementById('mobile-elevation-container');
    if (!mobileContainer) return;

    // Store elevation data reference
    let elevationData = [];

    // Function to draw the elevation chart
    const drawChart = () => {
      if (!elevationData || elevationData.length < 2) return;

      // Clear previous content
      mobileContainer.innerHTML = '';

      // Get container dimensions - use actual rendered width
      const containerWidth = mobileContainer.clientWidth || mobileContainer.offsetWidth || 300;
      const containerHeight = 120;
      const margin = { top: 5, right: 10, bottom: 20, left: 35 };
      const width = containerWidth - margin.left - margin.right;
      const height = containerHeight - margin.top - margin.bottom;

      // Create SVG
      const svg = d3.select(mobileContainer)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%')
        .style('height', `${containerHeight}px`)
        .style('display', 'block');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Extract distance and altitude data
      const xExtent = d3.extent(elevationData, d => d.dist);
      const yExtent = d3.extent(elevationData, d => d.z);

      // Add some padding to y extent
      const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

      // Create scales
      const x = d3.scaleLinear()
        .domain(xExtent)
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height, 0]);

      // Create area generator
      const area = d3.area()
        .x(d => x(d.dist))
        .y0(height)
        .y1(d => y(d.z))
        .curve(d3.curveLinear);

      // Create line generator for top stroke
      const line = d3.line()
        .x(d => x(d.dist))
        .y(d => y(d.z))
        .curve(d3.curveLinear);

      // Draw grid lines
      const yTicks = y.ticks(3);
      g.selectAll('.grid-line')
        .data(yTicks)
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => y(d))
        .attr('y2', d => y(d))
        .attr('stroke', 'rgba(255,255,255,0.1)')
        .attr('stroke-dasharray', '2,2');

      // Draw the area
      g.append('path')
        .datum(elevationData)
        .attr('class', 'elevation-area')
        .attr('fill', 'rgba(73, 73, 73, 0.95)')
        .attr('d', area);

      // Draw the line on top
      g.append('path')
        .datum(elevationData)
        .attr('class', 'elevation-line')
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.5)')
        .attr('stroke-width', 1.5)
        .attr('d', line);

      // X axis
      const xAxis = d3.axisBottom(x)
        .ticks(4)
        .tickFormat(d => d.toFixed(1) + ' km');

      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .selectAll('text')
        .attr('fill', 'rgba(255,255,255,0.7)')
        .attr('font-size', '8px');

      g.selectAll('.x-axis line, .x-axis path')
        .attr('stroke', 'rgba(255,255,255,0.3)');

      // Y axis
      const yAxis = d3.axisLeft(y)
        .ticks(3)
        .tickFormat(d => d.toFixed(0) + 'm');

      g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .selectAll('text')
        .attr('fill', 'rgba(255,255,255,0.7)')
        .attr('font-size', '8px');

      g.selectAll('.y-axis line, .y-axis path')
        .attr('stroke', 'rgba(255,255,255,0.3)');
    };

    // Listen for elevation data from the main elevation control
    // We need to wait for `el` to be defined (it's created in index.html)
    const waitForElevationControl = () => {
      if (typeof el !== 'undefined' && el) {
        // Listen for new elevation data
        el.on('eledata_added', ({ track_info }) => {
          // Get the data from the elevation control
          if (el._data && el._data.length > 0) {
            elevationData = el._data;
            // Wait a brief moment for container to be visible/sized, then draw
            requestAnimationFrame(() => {
              setTimeout(drawChart, 50);
            });
          }
        });

        // Also listen for clear events
        el.on('eledata_clear', () => {
          elevationData = [];
          mobileContainer.innerHTML = '';
        });
      } else {
        // Retry after a delay
        setTimeout(waitForElevationControl, 500);
      }
    };

    waitForElevationControl();

    // Redraw on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (elevationData.length > 0) {
          drawChart();
        }
      }, 250);
    });

    // Also redraw when the sheet opens (container might not have been visible)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const sheet = document.querySelector('.mobile-bottom-sheet');
          if (sheet && sheet.classList.contains('sheet-open') && elevationData.length > 0) {
            setTimeout(drawChart, 100);
          }
        }
      });
    });

    const sheet = document.querySelector('.mobile-bottom-sheet');
    if (sheet) {
      observer.observe(sheet, { attributes: true });
    }
  }

  /**
   * Sync checkbox states between desktop and mobile
   */
  function syncCheckboxStates() {
    // Sync Recreation Sites checkbox
    const desktopBcrec = document.getElementById('bcrec');
    const mobileBcrec = document.getElementById('mobile-bcrec');

    if (desktopBcrec && mobileBcrec) {
      // Initial sync
      mobileBcrec.checked = desktopBcrec.checked;

      // Two-way sync
      desktopBcrec.addEventListener('change', () => {
        mobileBcrec.checked = desktopBcrec.checked;
      });

      mobileBcrec.addEventListener('change', () => {
        desktopBcrec.checked = mobileBcrec.checked;
      });
    }
  }

  /**
   * Sync offline status between desktop and mobile
   */
  function syncOfflineStatus() {
    // Sync Service Worker status
    const syncStatus = (desktopId, mobileId) => {
      const desktopEl = document.getElementById(desktopId);
      const mobileEl = document.getElementById(mobileId);
      if (desktopEl && mobileEl) {
        const observer = new MutationObserver(() => {
          mobileEl.textContent = desktopEl.textContent;
        });
        observer.observe(desktopEl, { childList: true, characterData: true, subtree: true });
        // Initial sync
        mobileEl.textContent = desktopEl.textContent;
      }
    };

    syncStatus('sw-status', 'mobile-sw-status');
    syncStatus('gpx-status', 'mobile-gpx-status');
    syncStatus('storage', 'mobile-storage');

    // Sync zoom slider
    const desktopZoom = document.getElementById('zoom-level');
    const mobileZoom = document.getElementById('mobile-zoom-level');
    const mobileZoomValue = document.getElementById('mobile-zoom-value');

    if (mobileZoom && mobileZoomValue) {
      mobileZoom.addEventListener('input', () => {
        mobileZoomValue.textContent = mobileZoom.value;
        if (desktopZoom) {
          desktopZoom.value = mobileZoom.value;
          // Trigger the desktop zoom value display update
          const zoomValueDisplay = document.getElementById('zoom-value');
          if (zoomValueDisplay) {
            zoomValueDisplay.textContent = mobileZoom.value;
          }
        }
      });
    }

    // Forward button clicks to desktop buttons
    const buttonMappings = [
      { mobile: 'mobile-download-tiles-btn', desktop: 'download-tiles-btn' },
      { mobile: 'mobile-clear-tiles-btn', desktop: 'clear-tiles-btn' },
      { mobile: 'mobile-cache-gravel-btn', desktop: 'cache-gravel-btn' },
      { mobile: 'mobile-cache-recon-btn', desktop: 'cache-recon-btn' },
      { mobile: 'mobile-cache-all-btn', desktop: 'cache-all-gpx-btn' }
    ];

    buttonMappings.forEach(({ mobile, desktop }) => {
      const mobileBtn = document.getElementById(mobile);
      const desktopBtn = document.getElementById(desktop);
      if (mobileBtn && desktopBtn) {
        mobileBtn.addEventListener('click', () => {
          desktopBtn.click();
        });
      }
    });

    // Sync progress bar
    const syncProgress = () => {
      const desktopWrapper = document.getElementById('progress-wrapper');
      const mobileWrapper = document.getElementById('mobile-progress-wrapper');
      const desktopBar = document.getElementById('progressbar');
      const mobileBar = document.getElementById('mobile-progressbar');
      const desktopText = document.getElementById('progress-text');
      const mobileText = document.getElementById('mobile-progress-text');
      const desktopCount = document.getElementById('progress-count');
      const mobileCount = document.getElementById('mobile-progress-count');

      if (desktopWrapper && mobileWrapper) {
        const observer = new MutationObserver(() => {
          mobileWrapper.style.display = desktopWrapper.style.display;
          if (desktopBar && mobileBar) {
            mobileBar.style.width = desktopBar.style.width;
          }
          if (desktopText && mobileText) {
            mobileText.textContent = desktopText.textContent;
          }
          if (desktopCount && mobileCount) {
            mobileCount.textContent = desktopCount.textContent;
          }
        });

        observer.observe(desktopWrapper, { 
          attributes: true, 
          childList: true, 
          subtree: true 
        });
      }
    };

    syncProgress();
  }

  /**
   * Handle window resize
   */
  function handleResize() {
    const nowMobile = window.matchMedia('(max-width: 767px)').matches;
    
    // If switching from desktop to mobile
    if (nowMobile && !elements.bottomNav) {
      init();
    }
  }

  /**
   * Utility: Debounce function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Public API for opening specific panels programmatically
   */
  window.MobileUI = {
    openPanel: function(panelId) {
      if (!elements.bottomSheet) return;
      showPanel(panelId);
      openSheet();
    },
    closeSheet: closeSheet,
    isOpen: () => sheetState.isOpen,
    updateRouteInfo: function(data) {
      // Update mobile route info display
      if (data.name) {
        const content = document.getElementById('mobile-sidebar-content');
        if (content) {
          content.innerHTML = `<h4>${data.name}</h4>` + (data.description || '');
        }
      }
      if (data.stats) {
        const stats = data.stats;
        if (stats.length) document.getElementById('mobile-stat-length').textContent = stats.length;
        if (stats.maxEle) document.getElementById('mobile-stat-maxele').textContent = stats.maxEle;
        if (stats.minEle) document.getElementById('mobile-stat-minele').textContent = stats.minEle;
        if (stats.gain) document.getElementById('mobile-stat-gain').textContent = stats.gain;
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
