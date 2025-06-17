// js/roulette.js

const SOFT_COLORS = ["#d66c6c", "#6c8ed6", "#6cd67f", "#a0a0a0", "#d66ccb", "#d30098", "#d69d6c", "#00aee0", "#00d096", "#5a5a5a"];

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
        
        // Estado de la ruleta (cargado desde la configuración o por defecto)
        this.items = config.initialItems || [
            { text: "Opción 1", color: SOFT_COLORS[0] }, { text: "Opción 2", color: SOFT_COLORS[1] },
            { text: "Opción 3", color: SOFT_COLORS[2] }, { text: "Opción 4", color: SOFT_COLORS[3] },
            { text: "Opción 5", color: SOFT_COLORS[4] },
        ];
        this.spinning = false;
        this.currentRotation = 0;

        // Inicializar
        this.setupEventListeners();
        this.updateItemList();
        this.draw();
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

        const width = 690, height = 690, cx = width / 2, cy = height / 2, r = 345;

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
            path.setAttribute('fill', this.items[i].color || SOFT_COLORS[i % SOFT_COLORS.length]);
            path.setAttribute('stroke', '#fff');
            path.setAttribute('stroke-width', 0.8);
            this.svg.appendChild(path);

            const textAngle = (startAngle + endAngle) / 2;
            const tx = cx + (r * 0.65) * Math.cos(textAngle);
            const ty = cy + (r * 0.65) * Math.sin(textAngle);

            const textContent = this.items[i].text || "";
            
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', tx);
            text.setAttribute('y', ty);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-size', '30');
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-family', 'Outfit, sans-serif');
            text.setAttribute('font-weight', '700');
            text.setAttribute('transform', `rotate(${textAngle * 180 / Math.PI + 90}, ${tx}, ${ty})`);
            text.textContent = textContent;
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
        
        const h = Math.floor(Math.random() * 360);
        const s = Math.floor(Math.random() * 20) + 70;
        const l = Math.floor(Math.random() * 20) + 60;
        const color = `hsl(${h},${s}%,${l}%)`;

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