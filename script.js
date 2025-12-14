// Configuración principal
const CONFIG = {
    canvasWidth: 640,
    canvasHeight: 400,
    gridSize: 16, // Tamaño de cada "bloque" teletext
    cols: 40,     // Columnas teletext
    rows: 25,     // Filas teletext
    blinkInterval: 500 // ms para parpadeo
};

// Estado global
const state = {
    tool: 'brush',
    fgColor: 7, // Blanco por defecto (índice)
    bgColor: 0, // Negro por defecto
    colors: [
        { name: 'black', hex: '#000000' },
        { name: 'red', hex: '#ff0000' },
        { name: 'green', hex: '#00ff00' },
        { name: 'yellow', hex: '#ffff00' },
        { name: 'blue', hex: '#0000ff' },
        { name: 'magenta', hex: '#ff00ff' },
        { name: 'cyan', hex: '#00ffff' },
        { name: 'white', hex: '#ffffff' }
    ],
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    showGrid: true,
    gridData: [], // Matriz de datos del lienzo
    blinkState: true,
    textInputActive: false
};

// Elementos DOM
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const gridOverlay = document.getElementById('grid-overlay');
const cursorPos = document.getElementById('cursor-pos');
const toolIndicator = document.getElementById('tool-indicator');
const messageLine = document.getElementById('message-line');
const timeDisplay = document.getElementById('time-display');
const statusIndicator = document.getElementById('status-indicator');

// Inicialización
function init() {
    setupCanvas();
    setupEventListeners();
    setupPalette();
    setupGrid();
    updateDisplay();
    startBlinkEffect();
    updateTime();
    
    // Actualizar hora cada minuto
    setInterval(updateTime, 60000);
    
    showMessage('SISTEMA TELETEXT PAINT INICIALIZADO. USO: RATÓN O TECLAS F1-F7.');
}

function setupCanvas() {
    // Ajustar canvas a tamaño display
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;
    
    // Limpiar con color fondo
    ctx.fillStyle = state.colors[state.bgColor].hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Inicializar gridData
    state.gridData = [];
    for (let y = 0; y < CONFIG.rows; y++) {
        state.gridData[y] = [];
        for (let x = 0; x < CONFIG.cols; x++) {
            state.gridData[y][x] = {
                fg: state.bgColor, // Por defecto igual al fondo
                bg: state.bgColor,
                char: null,
                blink: false
            };
        }
    }
}

function setupGrid() {
    // Crear overlay de rejilla
    if (state.showGrid) {
        let gridHTML = '';
        const cellWidth = CONFIG.gridSize;
        const cellHeight = CONFIG.gridSize;
        
        for (let y = 0; y < CONFIG.rows; y++) {
            for (let x = 0; x < CONFIG.cols; x++) {
                gridHTML += `<div class="grid-cell" 
                    style="position:absolute; 
                    left:${x * cellWidth}px; 
                    top:${y * cellHeight}px;
                    width:${cellWidth}px;
                    height:${cellHeight}px;
                    border:1px solid rgba(0, 255, 255, 0.2);
                    pointer-events:none;"></div>`;
            }
        }
        gridOverlay.innerHTML = gridHTML;
    } else {
        gridOverlay.innerHTML = '';
    }
}

function setupPalette() {
    const fgColors = document.getElementById('fg-colors');
    const bgColors = document.getElementById('bg-colors');
    const currentFg = document.getElementById('current-fg');
    const currentBg = document.getElementById('current-bg');
    
    fgColors.innerHTML = '';
    bgColors.innerHTML = '';
    
    state.colors.forEach((color, index) => {
        // Botones para color frontal
        const fgBtn = document.createElement('button');
        fgBtn.className = `color-btn color-${color.name}`;
        fgBtn.title = color.name.toUpperCase();
        fgBtn.addEventListener('click', () => {
            state.fgColor = index;
            updatePaletteDisplay();
            showMessage(`COLOR FRENTE: ${color.name.toUpperCase()}`);
        });
        fgColors.appendChild(fgBtn);
        
        // Botones para color de fondo
        const bgBtn = document.createElement('button');
        bgBtn.className = `color-btn color-${color.name}`;
        bgBtn.title = color.name.toUpperCase();
        bgBtn.addEventListener('click', () => {
            state.bgColor = index;
            updatePaletteDisplay();
            showMessage(`COLOR FONDO: ${color.name.toUpperCase()}`);
        });
        bgColors.appendChild(bgBtn);
    });
    
    updatePaletteDisplay();
}

function updatePaletteDisplay() {
    const currentFg = document.getElementById('current-fg');
    const currentBg = document.getElementById('current-bg');
    
    currentFg.className = `color-box color-${state.colors[state.fgColor].name}`;
    currentBg.className = `color-box color-${state.colors[state.bgColor].name}`;
    
    // Resaltar botones seleccionados
    document.querySelectorAll('#fg-colors .color-btn').forEach((btn, index) => {
        btn.classList.toggle('selected', index === state.fgColor);
    });
    
    document.querySelectorAll('#bg-colors .color-btn').forEach((btn, index) => {
        btn.classList.toggle('selected', index === state.bgColor);
    });
}

function setupEventListeners() {
    // Eventos del canvas
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Botones de herramientas
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            setTool(tool);
        });
    });
    
    // Botones de control
    document.getElementById('btn-clear').addEventListener('click', clearCanvas);
    document.getElementById('btn-grid').addEventListener('click', toggleGrid);
    document.getElementById('btn-export').addEventListener('click', exportCanvas);
    
    // Atajos de teclado
    document.addEventListener('keydown', handleKeyPress);
    
    // Actualizar posición del cursor
    canvas.addEventListener('mousemove', updateCursorPosition);
}

function setTool(tool) {
    state.tool = tool;
    
    // Actualizar UI
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    
    toolIndicator.textContent = `HERRAMIENTA: ${tool.toUpperCase()}`;
    
    // Cambiar cursor
    const cursorMap = {
        brush: 'crosshair',
        eraser: 'cell',
        line: 'crosshair',
        rect: 'crosshair',
        circle: 'crosshair',
        fill: 'crosshair',
        text: 'text',
        select: 'default'
    };
    canvas.style.cursor = cursorMap[tool] || 'crosshair';
    
    showMessage(`HERRAMIENTA ACTIVA: ${tool.toUpperCase()}`);
}

function startDrawing(e) {
    if (state.textInputActive) return;
    
    const { x, y } = getGridCoordinates(e);
    state.isDrawing = true;
    state.lastX = x;
    state.lastY = y;
    
    // Ejecutar acción según herramienta
    switch(state.tool) {
        case 'brush':
            drawPixel(x, y);
            break;
        case 'eraser':
            erasePixel(x, y);
            break;
        case 'fill':
            floodFill(x, y);
            break;
    }
}

function draw(e) {
    if (!state.isDrawing || state.textInputActive) return;
    
    const { x, y } = getGridCoordinates(e);
    
    switch(state.tool) {
        case 'brush':
            drawLine(state.lastX, state.lastY, x, y);
            state.lastX = x;
            state.lastY = y;
            break;
        case 'eraser':
            eraseLine(state.lastX, state.lastY, x, y);
            state.lastX = x;
            state.lastY = y;
            break;
    }
}

function stopDrawing() {
    state.isDrawing = false;
}

function getGridCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    const gridX = Math.floor(canvasX / CONFIG.gridSize);
    const gridY = Math.floor(canvasY / CONFIG.gridSize);
    
    return {
        x: Math.max(0, Math.min(gridX, CONFIG.cols - 1)),
        y: Math.max(0, Math.min(gridY, CONFIG.rows - 1)),
        canvasX: canvasX,
        canvasY: canvasY
    };
}

function drawPixel(x, y) {
    if (x < 0 || x >= CONFIG.cols || y < 0 || y >= CONFIG.rows) return;
    
    // Actualizar datos
    state.gridData[y][x].fg = state.fgColor;
    state.gridData[y][x].bg = state.bgColor;
    
    // Dibujar en canvas
    ctx.fillStyle = state.colors[state.bgColor].hex;
    ctx.fillRect(x * CONFIG.gridSize, y * CONFIG.gridSize, CONFIG.gridSize, CONFIG.gridSize);
    
    ctx.fillStyle = state.colors[state.fgColor].hex;
    ctx.fillRect(x * CONFIG.gridSize + 1, y * CONFIG.gridSize + 1, CONFIG.gridSize - 2, CONFIG.gridSize - 2);
}

function drawLine(x1, y1, x2, y2) {
    // Algoritmo de línea simple
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    
    while(true) {
        drawPixel(x1, y1);
        
        if (x1 === x2 && y1 === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
    }
}

function erasePixel(x, y) {
    if (x < 0 || x >= CONFIG.cols || y < 0 || y >= CONFIG.rows) return;
    
    // Restaurar a fondo
    state.gridData[y][x].fg = state.bgColor;
    state.gridData[y][x].bg = state.bgColor;
    
    ctx.fillStyle = state.colors[state.bgColor].hex;
    ctx.fillRect(x * CONFIG.gridSize, y * CONFIG.gridSize, CONFIG.gridSize, CONFIG.gridSize);
}

function eraseLine(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    
    while(true) {
        erasePixel(x1, y1);
        
        if (x1 === x2 && y1 === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
    }
}

function floodFill(x, y) {
    // Implementación básica de relleno
    const targetColor = state.gridData[y][x].fg;
    if (targetColor === state.fgColor) return;
    
    const queue = [[x, y]];
    
    while(queue.length > 0) {
        const [cx, cy] = queue.shift();
        
        if (cx < 0 || cx >= CONFIG.cols || cy < 0 || cy >= CONFIG.rows) continue;
        if (state.gridData[cy][cx].fg !== targetColor) continue;
        
        drawPixel(cx, cy);
        
        queue.push([cx + 1, cy]);
        queue.push([cx - 1, cy]);
        queue.push([cx, cy + 1]);
        queue.push([cx, cy - 1]);
    }
}

function clearCanvas() {
    if (confirm('¿BORRAR TODO EL LIENZO? (TELETEXT Pág 100)')) {
        ctx.fillStyle = state.colors[state.bgColor].hex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Reset gridData
        for (let y = 0; y < CONFIG.rows; y++) {
            for (let x = 0; x < CONFIG.cols; x++) {
                state.gridData[y][x].fg = state.bgColor;
                state.gridData[y][x].bg = state.bgColor;
            }
        }
        
        showMessage('LIENZO BORRADO. LISTO PARA NUEVO DISEÑO.');
    }
}

function toggleGrid() {
    state.showGrid = !state.showGrid;
    setupGrid();
    showMessage(`REJILLA: ${state.showGrid ? 'ACTIVADA' : 'DESACTIVADA'}`);
}

function exportCanvas() {
    // Crear enlace de descarga
    const link = document.createElement('a');
    link.download = `teletext-paint-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showMessage('EXPORTADO COMO IMAGEN PNG. COMPROBAR DESCARGAS.');
}

function updateCursorPosition(e) {
    const { x, y } = getGridCoordinates(e);
    cursorPos.textContent = `X: ${x}, Y: ${y}`;
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    timeDisplay.textContent = timeStr;
}

function updateDisplay() {
    // Actualizar indicadores de estado
    statusIndicator.textContent = state.isDrawing ? 
        '● EDITANDO' : '● EN LÍNEA';
}

function showMessage(msg) {
    messageLine.textContent = msg;
    
    // Limpiar mensaje después de 3 segundos
    setTimeout(() => {
        if (messageLine.textContent === msg) {
            messageLine.textContent = 'LISTO. USO: RATÓN O TECLAS F1-F7.';
        }
    }, 3000);
}

function handleKeyPress(e) {
    // Atajos de herramientas
    const toolKeys = {
        'b': 'brush',
        'e': 'eraser',
        'l': 'line',
        'r': 'rect',
        'c': 'circle',
        'f': 'fill',
        't': 'text',
        's': 'select'
    };
    
    if (toolKeys[e.key.toLowerCase()]) {
        setTool(toolKeys[e.key.toLowerCase()]);
        e.preventDefault();
    }
    
    // Teclas de función
    if (e.key === 'F1') {
        showMessage('AYUDA: B=PINCEL E=BORRADOR L=LÍNEA R=RECT C=CÍRCULO F=RELLENO T=TEXTO');
    }
    if (e.key === 'F2') {
        saveProject();
    }
    if (e.key === 'F3') {
        loadProject();
    }
    if (e.key === 'F4') {
        exportCanvas();
    }
    if (e.key === 'F5') {
        clearCanvas();
    }
    if (e.key === 'F6') {
        toggleBlinkMode();
    }
    if (e.key === 'F7') {
        toggleRevealMode();
    }
}

function startBlinkEffect() {
    setInterval(() => {
        state.blinkState = !state.blinkState;
        // Aquí se implementaría el efecto de parpadeo en elementos
    }, CONFIG.blinkInterval);
}

function toggleBlinkMode() {
    showMessage('MODO PARPADEO: ' + (state.blinkState ? 'ACTIVADO' : 'DESACTIVADO'));
}

function toggleRevealMode() {
    showMessage('MODO OCULTAR/REVELAR ACTIVADO (SIMULADO)');
    // Implementar efecto de revelar contenido oculto
}

function saveProject() {
    const project = {
        metadata: {
            name: 'Teletext Paint Project',
            date: new Date().toISOString(),
            version: '1.0'
        },
        config: CONFIG,
        gridData: state.gridData,
        colors: state.colors,
        state: {
            fgColor: state.fgColor,
            bgColor: state.bgColor,
            tool: state.tool
        }
    };
    
    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.download = 'teletext-project.json';
    link.href = dataUri;
    link.click();
    
    showMessage('PROYECTO GUARDADO COMO teletext-project.json');
}

function loadProject() {
    showMessage('CARGAR PROYECTO: IMPLEMENTAR SELECTOR DE ARCHIVOS');
    // Implementar carga de archivo JSON
}

// Iniciar la aplicación cuando se carga la página
window.addEventListener('load', init);
