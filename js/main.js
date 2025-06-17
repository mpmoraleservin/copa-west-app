// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'copaWestState';
    let roulette1, roulette2;

    // ========================================================================
    // LÓGICA DE ALMACENAMIENTO (LOCALSTORAGE)
    // ========================================================================

    function saveState() {
        const state = {
            scores: [],
            roulette1Items: roulette1.items,
            roulette2Items: roulette2.items,
        };

        for (let i = 1; i <= 4; i++) {
            state.scores.push({
                team: document.getElementById(`selector${i}`).value,
                score: document.getElementById(`contador${i}`).value
            });
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        console.log("Estado guardado:", state);
    }

    function loadState() {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            return JSON.parse(savedState);
        }
        return null; // No hay estado guardado
    }

    // ========================================================================
    // INICIALIZACIÓN DE COMPONENTES
    // ========================================================================

    // Carga el estado guardado al iniciar
    const initialState = loadState();

    // --- LÓGICA DE LAS RULETAS ---
    roulette1 = new Roulette({
        rouletteSvgId: 'roulette1',
        resultId: 'result1',
        itemListId: 'itemList1',
        newItemId: 'newItem1',
        spinButtonSelector: '#roulette-section1 .spin-btn',
        addButtonSelector: '#edit-section1 .add-btn',
        placeholderText: 'Sumar estilo',
        initialItems: initialState ? initialState.roulette1Items : undefined,
        onStateChange: saveState // Pasa la función de guardado como callback
    });

    roulette2 = new Roulette({
        rouletteSvgId: 'roulette2',
        resultId: 'result2',
        itemListId: 'itemList2',
        newItemId: 'newItem2',
        spinButtonSelector: '#roulette-section2 .spin-btn',
        addButtonSelector: '#edit-section2 .add-btn',
        placeholderText: 'Sumar Juego',
        initialItems: initialState ? initialState.roulette2Items : undefined,
        onStateChange: saveState // Pasa la función de guardado como callback
    });

    // --- LÓGICA DE LOS CONTADORES DE PUNTOS ---
    function setupCounter(id) {
        const plusBtn = document.getElementById(`mas${id}`);
        const minusBtn = document.getElementById(`menos${id}`);
        const display = document.getElementById(`contador${id}`);
        
        // Carga el puntaje inicial si existe
        if (initialState && initialState.scores[id-1]) {
            display.value = initialState.scores[id-1].score;
        } else {
            display.value = "0";
        }
        
        plusBtn.addEventListener('click', () => {
            let currentValue = parseInt(display.value, 10) || 0;
            display.value = currentValue + 1;
            saveState();
        });

        minusBtn.addEventListener('click', () => {
            let currentValue = parseInt(display.value, 10) || 0;
            if (currentValue > 0) {
                display.value = currentValue - 1;
                saveState();
            }
        });

        display.addEventListener('input', () => {
            display.value = display.value.replace(/[^0-9]/g, '');
            saveState();
        });
    }
    
    // Configura los 4 contadores
    [1, 2, 3, 4].forEach(id => setupCounter(id));

    // --- LÓGICA PARA CAMBIAR CLASE DE EQUIPO ---
    const selectores = document.querySelectorAll('.selector');
    selectores.forEach((selector, index) => {
        const id = index + 1;
        const contenedor = document.getElementById(`contenedor${id}`);
        
        // Carga la selección de equipo inicial si existe
        if (initialState && initialState.scores[index]) {
            selector.value = initialState.scores[index].team;
        }
        
        // Aplica la clase inicial
        contenedor.className = 'base-team';
        if (selector.value) {
            contenedor.classList.add(selector.value);
        }

        selector.addEventListener('change', function () {
            contenedor.className = 'base-team';
            if (this.value) {
                contenedor.classList.add(this.value);
            }
            saveState();
        });
    });

    // --- LÓGICA DEL TEMPORIZADOR (sin persistencia) ---
    const minutesInput = document.querySelector("#minutes");
    const secondsInput = document.querySelector("#seconds");
    const startBtn = document.querySelector(".start");
    const stopBtn = document.querySelector(".stop");
    const resetBtn = document.querySelector(".reset");
    let countdownInterval;

    startBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearInterval(countdownInterval);
        countdownInterval = setInterval(handleCountdown, 1000);
    });

    stopBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearInterval(countdownInterval);
    });

    resetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearInterval(countdownInterval);
        minutesInput.value = 0;
        secondsInput.value = 0;
    });

    function handleCountdown() {
        let mins = parseInt(minutesInput.value, 10) || 0;
        let secs = parseInt(secondsInput.value, 10) || 0;

        if (mins === 0 && secs === 0) {
            clearInterval(countdownInterval);
            return;
        }
        if (secs > 0) {
            secs--;
        } else {
            mins--;
            secs = 59;
        }
        minutesInput.value = mins;
        secondsInput.value = secs < 10 ? '0' + String(secs) : secs;
    }
});