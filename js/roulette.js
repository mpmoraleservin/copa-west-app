// js/roulette.js

// Paleta divertida y vibrante para la ruleta
const FUN_COLORS = [
    "#FF6B6B", // coral
    "#FF8E72", // peach
    "#FFA62B", // amber
    "#FFD166", // sunflower
    "#8AC926", // lime
    "#06D6A0", // mint
    "#00BBF9", // cyan
    "#118AB2", // blue
    "#3A86FF", // bright blue
    "#4D96FF", // denim
    "#9D4EDD", // violet
    "#C77DFF", // lavender
    "#F72585", // magenta
    "#FF006E", // vivid magenta
    "#FB5607", // orange
    "#FFD23F", // vivid yellow
    "#80ED99", // mint green
    "#00F5D4", // aqua
    "#FFADAD", // light red
    "#BDE0FE"  // baby blue
];

class Roulette {
    constructor(config) {
        // IDs y configuración
        this.rouletteSvgId = config.rouletteSvgId;
        this.resultId = config.resultId;
        this.itemListId = config.itemListId;
        this.newItemId = config.newItemId;
        this.spinButtonSelector = config.spinButtonSelector;
        this.addButtonSelector = config.addButtonSelector;
        this.placeholderText = config.placeholderText || "Añadir opción";
        
        // Callback para notificar cambios de estado
        this.onStateChange = config.onStateChange || function() {};
        
        // Elementos del DOM
        this.svg = document.getElementById(this.rouletteSvgId);
        this.resultEl = document.getElementById(this.resultId);
        this.itemListEl = document.getElementById(this.itemListId);
        this.newItemEl = document.getElementById(this.newItemId);
        this.spinButton = document.querySelector(this.spinButtonSelector);
        this.addButton = document.querySelector(this.addButtonSelector);
        
        // Colores bonitos y distintos para la inicialización
        this.baseColors = [
            "#00B4D8", // celeste
            "#52B788", // verde
            "#FFD23F", // amarillo
            "#FF9F1C", // naranja
            "#E63946"  // rojo
        ];
        this.usedColors = new Set();
        // Estado de la ruleta (cargado desde la configuración o por defecto), usando colores base
        this.items = config.initialItems || this.baseColors.map((color, i) => {
            this.usedColors.add(color);
            return { text: `Opción ${i+1}`, color: this.ensureContrast(color, 0.25) };
        });
        // Generar paleta extendida para items adicionales
        this.extendedPalette = this.generateExtendedPalette();
        this.nextColorIndex = 0;
        this.spinning = false;
        this.currentRotation = 0;
        // Contexto para medir ancho de texto (para hacer saltos de línea por ancho máximo)
        const offscreenCanvas = document.createElement('canvas');
        this.measureCtx = offscreenCanvas.getContext('2d');

        // Inicializar
        this.setupEventListeners();
        this.updateItemList();
        this.draw();
    }
    
    // -----------------------------
    // Utilidades de color/contraste
    // -----------------------------

    shuffle(array) {
        const a = array.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    generateExtendedPalette() {
        // Generar colores adicionales bonitos y distintos
        const additionalColors = [
            "#7209B7", // violeta
            "#F72585", // magenta
            "#06FFA5", // verde neón
            "#FF6B6B", // coral
            "#4ECDC4", // turquesa
            "#45B7D1", // azul claro
            "#96CEB4", // verde menta
            "#FFEAA7", // amarillo claro
            "#DDA0DD", // ciruela
            "#98D8C8", // verde agua
            "#F7DC6F", // amarillo dorado
            "#BB8FCE", // lavanda
            "#85C1E9", // azul cielo
            "#F8C471", // melocotón
            "#82E0AA"  // verde lima
        ];
        return additionalColors.map(color => this.ensureContrast(color, 0.25));
    }
    hexToRgb(hex) {
        const clean = hex.replace('#', '');
        const bigint = parseInt(clean, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }
    rgbToHex(r, g, b) {
        const c = (x) => x.toString(16).padStart(2, '0');
        return `#${c(r)}${c(g)}${c(b)}`;
    }
    hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const k = (n) => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const r = Math.round(255 * f(0));
        const g = Math.round(255 * f(8));
        const b = Math.round(255 * f(4));
        return this.rgbToHex(r, g, b);
    }
    relativeLuminance(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const srgb = [r, g, b].map(v => v / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    }
    contrastRatioWithWhite(hex) {
        const L1 = 1.0; // blanco
        const L2 = this.relativeLuminance(hex);
        return (L1 + 0.05) / (L2 + 0.05);
    }
    darkenColor(hex, factor) {
        const { r, g, b } = this.hexToRgb(hex);
        const dr = Math.max(0, Math.floor(r * factor));
        const dg = Math.max(0, Math.floor(g * factor));
        const db = Math.max(0, Math.floor(b * factor));
        return this.rgbToHex(dr, dg, db);
    }
    ensureContrast(hex, targetLuminance = 0.25) {
        // Si ya cumple contraste mínimo con blanco (~3:1), dejarlo tal cual
        const luminance = this.relativeLuminance(hex);
        if (luminance <= targetLuminance) return hex;
        // Oscurecer progresivamente hasta alcanzar la luminancia objetivo
        let factor = 0.95;
        let color = hex;
        let safety = 0;
        while (this.relativeLuminance(color) > targetLuminance && safety < 30) {
            color = this.darkenColor(color, factor);
            factor -= 0.05;
            if (factor < 0.4) factor = 0.4;
            safety++;
        }
        return color;
    }
    
    /**
     * Devuelve el ancho en píxeles del texto según la fuente actual
     */
    getTextWidth(text, fontPx) {
        const fontSpec = `700 ${fontPx}px Outfit, sans-serif`;
        this.measureCtx.font = fontSpec;
        return this.measureCtx.measureText(text).width;
    }
    
    /**
     * Envuelve el texto en múltiples líneas para que cada línea no supere maxWidth.
     * Limita a 3 líneas y recorta con elipsis (…)
     */
    wrapTextToWidth(text, maxWidth, baseFontPx) {
        const words = text.split(/\s+/).filter(Boolean);
        const lines = [];
        let currentLine = '';
        const fontPx = baseFontPx;
        
        const pushCurrentLine = () => {
            if (currentLine.trim().length > 0) lines.push(currentLine.trim());
            currentLine = '';
        };
        
        for (const word of words) {
            const tentative = currentLine ? `${currentLine} ${word}` : word;
            if (this.getTextWidth(tentative, fontPx) <= maxWidth) {
                currentLine = tentative;
            } else {
                if (currentLine === '') {
                    // Palabra sola que no entra: recortar con elipsis
                    let cut = word;
                    while (cut.length > 1 && this.getTextWidth(`${cut}…`, fontPx) > maxWidth) {
                        cut = cut.slice(0, -1);
                    }
                    lines.push(`${cut}…`);
                } else {
                    pushCurrentLine();
                    // Intentar meter la palabra en la siguiente línea, recortando si no entra
                    if (this.getTextWidth(word, fontPx) <= maxWidth) {
                        currentLine = word;
                    } else {
                        let cut = word;
                        while (cut.length > 1 && this.getTextWidth(`${cut}…`, fontPx) > maxWidth) {
                            cut = cut.slice(0, -1);
                        }
                        lines.push(`${cut}…`);
                        currentLine = '';
                    }
                }
            }
        }
        pushCurrentLine();
        
        const maxLines = 3;
        if (lines.length > maxLines) {
            const kept = lines.slice(0, maxLines - 1);
            // Unir resto en la última con elipsis
            const rest = lines.slice(maxLines - 1).join(' ');
            let last = rest;
            while (last.length > 1 && this.getTextWidth(`${last}…`, fontPx) > maxWidth) {
                last = last.slice(0, -1);
            }
            kept.push(`${last}…`);
            return { lines: kept, fontPx };
        }
        return { lines, fontPx };
    }
    
    setupEventListeners() {
        this.spinButton.onclick = () => this.spin();
        this.addButton.onclick = () => this.addItem();
        window.addEventListener('resize', () => this.draw());
    }

    draw() {
        this.svg.innerHTML = '';
        const n = this.items.length;
        if (n === 0) return;

        const width = 800, height = 800, cx = width / 2, cy = height / 2, r = 400;

        for (let i = 0; i < n; i++) {
            const startAngle = (2 * Math.PI * i) / n - Math.PI / 2;
            const endAngle = (2 * Math.PI * (i + 1)) / n - Math.PI / 2;
            const largeArc = ((endAngle - startAngle) > Math.PI) ? 1 : 0;

            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy + r * Math.sin(endAngle);

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute('d', `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`);
            const baseColor = this.items[i].color || this.extendedPalette[i % this.extendedPalette.length];
            const fillColor = this.ensureContrast(baseColor, 0.25);
            path.setAttribute('fill', fillColor);
            path.setAttribute('stroke', '#fff');
            path.setAttribute('stroke-width', 1);
            this.svg.appendChild(path);

            const textAngle = (startAngle + endAngle) / 2;
            const textContent = this.items[i].text || "";

            // Radio en el que colocaremos el texto y ancho máximo según arco del segmento
            const baseFontPx = 26;
            const textRadius = r * 0.6;
            const arcAngle = (2 * Math.PI) / n;
            const maxWidth = 2 * textRadius * Math.sin(arcAngle / 2) - 22; // margen

            const { lines, fontPx } = this.wrapTextToWidth(textContent, maxWidth, baseFontPx);

            const tx = cx + textRadius * Math.cos(textAngle);
            const ty = cy + textRadius * Math.sin(textAngle);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', tx);
            text.setAttribute('y', ty);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-size', `${fontPx}`);
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-family', 'Outfit, sans-serif');
            text.setAttribute('font-weight', '700');
            text.setAttribute('transform', `rotate(${textAngle * 180 / Math.PI + 90}, ${tx}, ${ty})`);

            // Centrar verticalmente el bloque de líneas y apilar "hacia abajo"
            const lineHeight = fontPx * 1.15;
            const totalHeight = lineHeight * (lines.length - 1);
            let dy = -totalHeight / 2; // primera línea sube para centrar el bloque

            lines.forEach((line, idx) => {
                const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan.setAttribute('x', tx);
                tspan.setAttribute('dy', `${idx === 0 ? dy : lineHeight}`);
                tspan.textContent = line;
                text.appendChild(tspan);
            });
            this.svg.appendChild(text);
        }
        this.svg.style.transform = `rotate(${this.currentRotation}deg)`;
    }
    
    updateItemList() {
        this.itemListEl.innerHTML = '';
        this.items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'item-row';
            li.dataset.idx = idx;

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.value = item.text;
            textInput.className = 'item-input';
            textInput.placeholder = this.placeholderText;
            textInput.onchange = e => {
                this.items[idx].text = e.target.value;
                this.draw();
                this.onStateChange(); // Notifica que el estado cambió
            };
            li.appendChild(textInput);

            const delBtn = document.createElement('button');
            delBtn.className = 'remove-btn';
            delBtn.textContent = '−';
            delBtn.title = "Eliminar";
            delBtn.onclick = () => {
                this.items.splice(idx, 1);
                this.updateItemList();
                this.draw();
                this.resultEl.textContent = '';
                this.onStateChange(); // Notifica que el estado cambió
            };
            li.appendChild(delBtn);
            this.itemListEl.appendChild(li);
        });
    }

    addItem() {
        const text = this.newItemEl.value.trim();
        if (!text) return;
        
        // Asignar el siguiente color de una paleta aleatoria pre-barajada
        // Usar colores de la paleta extendida, evitando repetir
        let color;
        if (this.nextColorIndex < this.extendedPalette.length) {
            color = this.extendedPalette[this.nextColorIndex];
            this.nextColorIndex++;
        } else {
            // Si se agotaron, generar nueva paleta
            this.extendedPalette = this.generateExtendedPalette();
            this.nextColorIndex = 0;
            color = this.extendedPalette[0];
            this.nextColorIndex = 1;
        }

        this.items.push({ text, color });
        this.newItemEl.value = '';
        this.updateItemList();
        this.draw();
        this.resultEl.textContent = '';
        this.onStateChange(); // Notifica que el estado cambió
    }

    spin() {
        if (this.spinning || this.items.length === 0) return;
        this.spinning = true;
        this.resultEl.textContent = '';

        const n = this.items.length;
        const degPerItem = 360 / n;
        const fullSpins = 8;
        const randomOffset = Math.random() * 360;
        const finalDeg = fullSpins * 360 + randomOffset;
        const duration = 5000;

        let start = null;
        const initialRotation = this.currentRotation % 360;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 5);
            
            const angle = initialRotation + (finalDeg - initialRotation) * easeOut;
            this.currentRotation = angle;
            this.svg.style.transform = `rotate(${angle}deg)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.spinning = false;
                const finalAngle = this.currentRotation % 360;
                const pointerDeg = (360 - finalAngle + 90) % 360;
                const sectorIndex = Math.floor(pointerDeg / degPerItem);
                this.resultEl.textContent = this.items[sectorIndex]?.text || "";
            }
        };
        requestAnimationFrame(animate);
    }
}