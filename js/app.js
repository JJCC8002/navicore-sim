/**
 * App.js - Punto de Entrada Enterprise 4.0 (Conducción WASD & Autonomía)
 * NaviCore Autonomous Navigation Software
 */

import { VehicleManager, VEHICLES, PRIORITIES, MISSIONS } from './vehicleManager.js';
import { MapRenderer } from './mapRenderer.js';
import { AStar } from './astar.js';
import { Telemetry } from './telemetry.js';
import { DecisionTable } from './decisionTable.js';
import { Exporter } from './exporter.js';
import { AudioManager } from './audioManager.js';
import { VoiceManager } from './voiceManager.js';

class NaviCoreApp {
    constructor() {
        this.vehicleMgr = new VehicleManager();
        this.renderer = new MapRenderer('mapa-canvas', 25, 16);
        this.astar = new AStar(25, 16);
        this.telemetry = new Telemetry();
        this.decisionTable = new DecisionTable();
        this.exporter = new Exporter();
        this.audio = new AudioManager();
        this.voice = new VoiceManager();

        this.algorithm = 'astar';
        this.animationTimer = null;
        this.movingObstacleTimer = null;
        this.animSpeedMs = 150;
        this.isPaused = false;
        this.lastPathResult = null;
        this.weather = 'clear';

        this.isManualDrive = false; // Modo WASD
        this.manualPos = { x: 2, y: 8, angle: 0 };

        this.activeBrush = 'obstacle';
        this.isMouseDown = false;

        this.init();
    }

    init() {
        this.populateDropdowns();
        this.bindEvents();
        this.bindTerminal();
        this.bindManualKeyboard();
        this.calculatePathAndTelemetry();
        this.addCopilotMessage('🚀 NaviCore Enterprise 4.0 listo. Presiona "🎮 Conducción Manual (WASD)" para conducir.');
        this.voice.speak('Bienvenido a NaviCore Enterprise 4.0. Sistema preparado.');
    }

    populateDropdowns() {
        const comboVehiculo = document.getElementById('combo-vehiculo');
        const comboPrioridad = document.getElementById('combo-prioridad');
        const comboMision = document.getElementById('combo-mision');

        if (comboVehiculo) {
            comboVehiculo.innerHTML = Object.keys(VEHICLES).map(key => 
                `<option value="${key}">${VEHICLES[key].name}</option>`
            ).join('');
            comboVehiculo.value = 'rover';
        }

        if (comboPrioridad) {
            comboPrioridad.innerHTML = Object.keys(PRIORITIES).map(key => 
                `<option value="${key}">${PRIORITIES[key].name}</option>`
            ).join('');
        }

        if (comboMision) {
            comboMision.innerHTML = Object.keys(MISSIONS).map(key => 
                `<option value="${key}">${MISSIONS[key].name}</option>`
            ).join('');
        }
    }

    bindEvents() {
        // Conducción Manual WASD
        document.getElementById('btn-manual-drive')?.addEventListener('click', () => {
            this.toggleManualDrive();
        });

        // Escenarios Presets
        document.getElementById('combo-preset')?.addEventListener('change', (e) => {
            this.loadPresetScenario(e.target.value);
        });

        // Algoritmo Selector
        document.getElementById('combo-algoritmo')?.addEventListener('change', (e) => {
            this.algorithm = e.target.value;
            const textMap = { astar: 'A* Standard', dijkstra: 'Dijkstra', greedy: 'Greedy Best-First', bfs: 'BFS' };
            const statAlgo = document.getElementById('stat-algoritmo');
            if (statAlgo) statAlgo.textContent = textMap[this.algorithm] || 'A* Standard';
            this.calculatePathAndTelemetry();
        });

        document.getElementById('combo-vehiculo')?.addEventListener('change', (e) => {
            this.vehicleMgr.setVehicle(e.target.value);
            this.audio.playPing();
            this.calculatePathAndTelemetry();
        });

        document.getElementById('combo-clima')?.addEventListener('change', (e) => {
            this.weather = e.target.value;
            const textMap = { clear: '☀️ Despejado', rain: '🌧️ Lluvia (+30% consumo)', fog: '🌫️ Niebla (-25% velocidad)', night: '🌙 Noche (Luces + Focos)' };
            const statClima = document.getElementById('stat-clima');
            if (statClima) statClima.textContent = textMap[this.weather] || '☀️ Despejado';
            this.calculatePathAndTelemetry();
        });

        // Toggles
        document.getElementById('toggle-range')?.addEventListener('change', (e) => {
            this.renderer.showRangeRing = e.target.checked;
            this.renderer.render();
        });

        document.getElementById('toggle-voz')?.addEventListener('change', (e) => {
            this.voice.enabled = e.target.checked;
        });

        document.getElementById('toggle-lidar')?.addEventListener('change', (e) => {
            this.renderer.enableLidar = e.target.checked;
        });

        document.getElementById('toggle-heatmap')?.addEventListener('change', (e) => {
            this.renderer.showHeatmap = e.target.checked;
            this.renderer.render();
        });

        document.getElementById('toggle-audio')?.addEventListener('change', (e) => {
            this.audio.enabled = e.target.checked;
        });

        document.getElementById('btn-emergencia')?.addEventListener('click', () => {
            this.triggerEmergencyProtocol();
        });

        document.querySelectorAll('.btn-brush').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-brush').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeBrush = btn.dataset.brush;
                this.audio.playPing();
            });
        });

        document.getElementById('btn-flota')?.addEventListener('click', () => {
            this.runFleetSimulation();
        });

        document.getElementById('btn-calcular')?.addEventListener('click', () => {
            this.runSimulationAnimation();
        });

        document.getElementById('btn-pausa')?.addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('btn-reiniciar')?.addEventListener('click', () => {
            this.stopAnimation();
            this.renderer.setVehiclePosition(null);
            this.renderer.setFleetPositions([]);
            this.calculatePathAndTelemetry();
            const hudSpeed = document.getElementById('hud-speed-val');
            if (hudSpeed) hudSpeed.textContent = '0';
        });

        document.getElementById('btn-nuevo-mapa')?.addEventListener('click', () => {
            this.stopAnimation();
            this.renderer.generateNewRandomMap();
            this.calculatePathAndTelemetry();
            this.audio.playPing();
        });

        const sliderVel = document.getElementById('slider-velocidad');
        sliderVel?.addEventListener('input', (e) => {
            this.animSpeedMs = parseInt(e.target.value);
            const velVal = document.getElementById('velocidad-valor');
            if (velVal) velVal.textContent = `${this.animSpeedMs}ms`;
        });

        document.getElementById('btn-cam-2d')?.addEventListener('click', (e) => {
            this.setCameraMode('2d', e.target);
        });
        document.getElementById('btn-cam-3d')?.addEventListener('click', (e) => {
            this.setCameraMode('3d', e.target);
        });

        const canvas = document.getElementById('mapa-canvas');
        if (canvas) {
            canvas.addEventListener('mousedown', (e) => {
                this.isMouseDown = true;
                this.applyBrushAtMouse(e);
            });

            canvas.addEventListener('mousemove', (e) => {
                if (this.isMouseDown) this.applyBrushAtMouse(e);
            });
        }

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        document.getElementById('btn-comparar')?.addEventListener('click', () => this.openDecisionModal());
        document.getElementById('close-modal-decisiones')?.addEventListener('click', () => {
            const modal = document.getElementById('modal-decisiones');
            if (modal) modal.style.display = 'none';
        });

        document.getElementById('btn-exportar')?.addEventListener('click', () => {
            const modalExp = document.getElementById('modal-exportar');
            if (modalExp) modalExp.style.display = 'flex';
        });
        document.getElementById('close-modal-exportar')?.addEventListener('click', () => {
            const modalExp = document.getElementById('modal-exportar');
            if (modalExp) modalExp.style.display = 'none';
        });

        document.getElementById('btn-exp-json')?.addEventListener('click', () => {
            if (!this.lastPathResult) return;
            const data = this.exporter.generateReportData(this.telemetry, this.vehicleMgr, this.lastPathResult);
            this.exporter.exportJSON(data);
        });

        document.getElementById('btn-exp-txt')?.addEventListener('click', () => {
            if (!this.lastPathResult) return;
            const data = this.exporter.generateReportData(this.telemetry, this.vehicleMgr, this.lastPathResult);
            this.exporter.exportTXT(data);
        });

        document.getElementById('btn-exp-html')?.addEventListener('click', () => {
            if (!this.lastPathResult) return;
            const data = this.exporter.generateReportData(this.telemetry, this.vehicleMgr, this.lastPathResult);
            this.exporter.exportHTML(data);
        });
    }

    /* === CONDUCCIÓN MANUAL POR TECLADO (WASD / FLECHAS) === */
    toggleManualDrive() {
        this.isManualDrive = !this.isManualDrive;
        const hudWasd = document.getElementById('hud-wasd');
        const btn = document.getElementById('btn-manual-drive');

        if (this.isManualDrive) {
            if (hudWasd) hudWasd.style.display = 'flex';
            if (btn) btn.classList.add('btn-primary');
            this.manualPos = { x: this.renderer.startPos.x, y: this.renderer.startPos.y, angle: 0 };
            this.renderer.setVehiclePosition(this.manualPos);
            this.addCopilotMessage('🎮 Modo Conducción Manual ACTIVADO. Usa las teclas W, A, S, D para conducir.');
            this.voice.speak('Modo de conducción manual activado. Control por teclado listo.');
        } else {
            if (hudWasd) hudWasd.style.display = 'none';
            if (btn) btn.classList.remove('btn-primary');
            this.addCopilotMessage('🎮 Modo Conducción Manual DESACTIVADO.');
        }
    }

    bindManualKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (!this.isManualDrive) return;

            let nx = this.manualPos.x;
            let ny = this.manualPos.y;
            let angle = this.manualPos.angle;

            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup') {
                ny -= 1;
                angle = -Math.PI / 2;
            } else if (k === 's' || k === 'arrowdown') {
                ny += 1;
                angle = Math.PI / 2;
            } else if (k === 'a' || k === 'arrowleft') {
                nx -= 1;
                angle = Math.PI;
            } else if (k === 'd' || k === 'arrowright') {
                nx += 1;
                angle = 0;
            } else return;

            // Verificar límites y colisión con obstáculos
            if (nx >= 0 && nx < this.renderer.cols && ny >= 0 && ny < this.renderer.rows) {
                if (!this.renderer.grid[ny][nx].isObstacle) {
                    this.manualPos = { x: nx, y: ny, angle: angle };
                    this.renderer.setVehiclePosition(this.manualPos);
                    this.audio.playEngineHum();
                    const hudSpeed = document.getElementById('hud-speed-val');
                    if (hudSpeed) hudSpeed.textContent = this.vehicleMgr.selectedVehicle.speed;

                    // Si llega al destino
                    if (nx === this.renderer.endPos.x && ny === this.renderer.endPos.y) {
                        this.addCopilotMessage('🏆 <strong>¡Felicidades!</strong> Has conducido el vehículo con éxito hasta el objetivo.');
                        this.voice.speak('Felicidades. Has alcanzado el objetivo manualmente.');
                    }
                } else {
                    this.audio.playAlert();
                }
            }
        });
    }

    bindTerminal() {
        const input = document.getElementById('terminal-input');
        if (!input) return;

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value.trim();
                input.value = '';
                if (cmd) this.parseTerminalCommand(cmd);
            }
        });
    }

    parseTerminalCommand(cmdStr) {
        const out = document.getElementById('terminal-output');
        if (!out) return;

        const appendTerm = (txt) => {
            const div = document.createElement('div');
            div.className = 'term-line';
            div.textContent = txt;
            out.appendChild(div);
            out.scrollTop = out.scrollHeight;
        };

        appendTerm(`navicore@nav-ai:~$ ${cmdStr}`);
        const parts = cmdStr.toLowerCase().split(' ');
        const mainCmd = parts[0];

        switch (mainCmd) {
            case 'help':
                appendTerm('Comandos v4.0: help, run, drive, fleet, scan, emergency, clear, speed <val>');
                break;
            case 'drive':
                this.toggleManualDrive();
                appendTerm('🎮 Modo conducción manual cambiado.');
                break;
            case 'run':
            case 'start':
                this.runSimulationAnimation();
                break;
            case 'fleet':
                this.runFleetSimulation();
                break;
            case 'emergency':
                this.triggerEmergencyProtocol();
                break;
            case 'scan':
                this.audio.playPing();
                appendTerm('📡 Escáner LiDAR ejecutado.');
                break;
            case 'clear':
                this.renderer.generateNewRandomMap();
                this.calculatePathAndTelemetry();
                appendTerm('🗺️ Mapa reiniciado.');
                break;
            case 'speed':
                if (parts[1]) {
                    this.animSpeedMs = parseInt(parts[1]);
                    const slider = document.getElementById('slider-velocidad');
                    const velVal = document.getElementById('velocidad-valor');
                    if (slider) slider.value = this.animSpeedMs;
                    if (velVal) velVal.textContent = `${this.animSpeedMs}ms`;
                }
                break;
            default:
                appendTerm(`⚠️ Comando no reconocido: '${mainCmd}'.`);
                break;
        }
    }

    loadPresetScenario(presetKey) {
        const grid = this.renderer.grid;
        const rows = this.renderer.rows;
        const cols = this.renderer.cols;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                grid[r][c].isObstacle = false;
                grid[r][c].terrainType = 'road';
            }
        }

        if (presetKey === 'factory') {
            for (let r = 2; r < rows - 2; r += 3) {
                for (let c = 4; c < cols - 4; c++) {
                    if (c % 4 !== 0) grid[r][c].isObstacle = true;
                }
            }
            grid[8][12].terrainType = 'recharge';
            this.vehicleMgr.setVehicle('agv');
            const comboVehiculo = document.getElementById('combo-vehiculo');
            if (comboVehiculo) comboVehiculo.value = 'agv';
            this.voice.speak('Escenario de planta automotriz cargado.');
        } else if (presetKey === 'smartcity') {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (r % 4 === 0 || c % 6 === 0) grid[r][c].terrainType = 'road';
                    else grid[r][c].isObstacle = true;
                }
            }
            this.vehicleMgr.setVehicle('rover');
            const comboVehiculo = document.getElementById('combo-vehiculo');
            if (comboVehiculo) comboVehiculo.value = 'rover';
            this.voice.speak('Escenario Smart City cargado.');
        } else if (presetKey === 'mine') {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (Math.random() < 0.4) grid[r][c].terrainType = 'dirt';
                    else if (Math.random() < 0.15) grid[r][c].terrainType = 'water';
                    else if (Math.random() < 0.2) grid[r][c].isObstacle = true;
                }
            }
            this.vehicleMgr.setVehicle('truck');
            const comboVehiculo = document.getElementById('combo-vehiculo');
            if (comboVehiculo) comboVehiculo.value = 'truck';
            this.voice.speak('Escenario de mina cargado.');
        }

        this.calculatePathAndTelemetry();
    }

    setCameraMode(mode, targetBtn) {
        document.querySelectorAll('.btn-view').forEach(btn => btn.classList.remove('active'));
        if (targetBtn) targetBtn.classList.add('active');
        this.renderer.setViewMode(mode);
    }

    applyBrushAtMouse(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const col = Math.floor(mouseX / this.renderer.cellWidth);
        const row = Math.floor(mouseY / this.renderer.cellHeight);

        if (col < 0 || col >= this.renderer.cols || row < 0 || row >= this.renderer.rows) return;

        if (this.activeBrush === 'waypoint') {
            this.renderer.waypoints.push({ x: col, y: row });
            const wpCount = document.getElementById('hud-waypoints-count');
            if (wpCount) wpCount.textContent = `WP: ${this.renderer.waypoints.length}`;
        } else if (this.activeBrush === 'obstacle') {
            this.renderer.grid[row][col].isObstacle = true;
        } else {
            this.renderer.grid[row][col].isObstacle = false;
            this.renderer.grid[row][col].terrainType = this.activeBrush;
        }

        this.calculatePathAndTelemetry();
    }

    calculatePathAndTelemetry() {
        let vehicle = Object.assign({}, this.vehicleMgr.selectedVehicle);
        
        if (this.weather === 'rain') vehicle.consumptionRate *= 1.3;
        if (this.weather === 'fog') vehicle.speed *= 0.75;

        const waypoints = [this.renderer.startPos, ...this.renderer.waypoints, this.renderer.endPos];
        let fullPath = [];
        let totalNodesExplored = 0;
        let totalCost = 0;
        let allSuccess = true;
        let allExplored = [];

        for (let i = 0; i < waypoints.length - 1; i++) {
            const p1 = waypoints[i];
            const p2 = waypoints[i + 1];

            const segResult = this.astar.findPath(this.renderer.grid, p1, p2, vehicle.terrainCosts, this.algorithm);
            if (segResult.success) {
                if (fullPath.length > 0) segResult.path.shift();
                fullPath = fullPath.concat(segResult.path);
                totalNodesExplored += segResult.nodesExplored;
                totalCost += segResult.totalCost;
                allExplored = allExplored.concat(segResult.exploredHistory);
            } else {
                allSuccess = false;
                break;
            }
        }

        const chainedResult = {
            success: allSuccess,
            path: fullPath,
            totalCost: totalCost,
            steps: fullPath.length,
            nodesExplored: totalNodesExplored,
            exploredHistory: allExplored
        };

        this.lastPathResult = chainedResult;

        if (chainedResult.success) {
            this.renderer.setPath(chainedResult.path, chainedResult.exploredHistory);
            this.telemetry.calculate(chainedResult.path, vehicle, this.renderer.grid);
            this.renderer.batteryPercent = this.telemetry.batteryPercent;
            this.updateStatus('ready', 'Ruta Óptima Calculada');
        } else {
            this.renderer.setPath([], chainedResult.exploredHistory);
            this.telemetry.reset();
            this.telemetry.updateUI(vehicle);
            this.updateStatus('busy', '⚠️ Ruta Inaccesible');
            this.audio.playAlert();
        }
    }

    triggerEmergencyProtocol() {
        this.stopAnimation();
        this.audio.playAlert();
        this.updateStatus('busy', '🚨 FALLA DE MOTOR REGISTRADA');
        this.voice.speak('Alerta crítica. Falla de motor registrada. Iniciando protocolo de emergencia.');

        let nearestRecharge = null;
        let minDist = Infinity;
        const currentPos = this.renderer.vehiclePos || this.renderer.startPos;

        for (let r = 0; r < this.renderer.rows; r++) {
            for (let c = 0; c < this.renderer.cols; c++) {
                if (this.renderer.grid[r][c].terrainType === 'recharge') {
                    const dist = Math.abs(currentPos.x - c) + Math.abs(currentPos.y - r);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestRecharge = { x: c, y: r };
                    }
                }
            }
        }

        if (nearestRecharge) {
            this.renderer.endPos = nearestRecharge;
            this.calculatePathAndTelemetry();
            this.runSimulationAnimation();
        }
    }

    runSimulationAnimation() {
        if (!this.lastPathResult || !this.lastPathResult.success) return;

        this.stopAnimation();
        this.audio.playPing();
        const path = this.lastPathResult.path;
        let step = 0;

        this.updateStatus('busy', 'Simulación En Curso...');
        this.voice.speak('Iniciando simulación de ruta.');

        this.animationTimer = setInterval(() => {
            if (this.isPaused) return;

            if (step < path.length) {
                const currentPt = path[step];
                let angle = 0;
                if (step < path.length - 1) {
                    const nextPt = path[step + 1];
                    angle = Math.atan2(nextPt.y - currentPt.y, nextPt.x - currentPt.x);
                }

                const vPos = { x: currentPt.x, y: currentPt.y, angle: angle };
                this.renderer.setVehiclePosition(vPos);

                const progress = (step + 1) / path.length;
                this.telemetry.updateUI(this.vehicleMgr.selectedVehicle, progress);
                this.renderer.batteryPercent = Math.max(0, 100 - (100 - this.telemetry.batteryPercent) * progress);

                this.audio.playEngineHum();
                const hudSpeed = document.getElementById('hud-speed-val');
                if (hudSpeed) hudSpeed.textContent = this.vehicleMgr.selectedVehicle.speed;

                step++;
            } else {
                this.stopAnimation();
                this.updateStatus('ready', '🎯 Misión Completada');
                this.voice.speak('Misión completada. Objetivo alcanzado.');
                const hudSpeed = document.getElementById('hud-speed-val');
                if (hudSpeed) hudSpeed.textContent = '0';
            }
        }, this.animSpeedMs);
    }

    runFleetSimulation() {
        this.stopAnimation();
        this.audio.playPing();
        this.updateStatus('busy', '🛸 Despachando Flota Completa...');
        this.voice.speak('Despachando flota completa de vehículos.');

        const fleetKeys = Object.keys(VEHICLES);
        const fleetPaths = fleetKeys.map(key => {
            const v = VEHICLES[key];
            return {
                vehicle: v,
                pathResult: this.astar.findPath(this.renderer.grid, this.renderer.startPos, this.renderer.endPos, v.terrainCosts, this.algorithm)
            };
        });

        let step = 0;
        this.animationTimer = setInterval(() => {
            if (this.isPaused) return;

            const positions = [];
            let allDone = true;

            fleetPaths.forEach(({ vehicle, pathResult }) => {
                if (pathResult.success && step < pathResult.path.length) {
                    const pt = pathResult.path[step];
                    positions.push({ x: pt.x, y: pt.y, color: vehicle.color });
                    allDone = false;
                } else if (pathResult.success) {
                    const pt = pathResult.path[pathResult.path.length - 1];
                    positions.push({ x: pt.x, y: pt.y, color: vehicle.color });
                }
            });

            this.renderer.setFleetPositions(positions);
            this.audio.playEngineHum();
            step++;

            if (allDone) {
                this.stopAnimation();
                this.updateStatus('ready', '🏆 Toda la Flota Completó Misión');
                this.voice.speak('Misión de flota completada.');
            }
        }, this.animSpeedMs);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btnPausa = document.getElementById('btn-pausa');
        if (btnPausa) {
            btnPausa.textContent = this.isPaused ? '▶️ Reanudar' : '⏸ Pausar';
        }
    }

    stopAnimation() {
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
        this.isPaused = false;
    }

    updateStatus(type, message) {
        const ind = document.getElementById('status-indicator');
        const txt = document.getElementById('status-text');
        if (ind) ind.className = `status-indicator ${type}`;
        if (txt) txt.textContent = message;
    }

    addCopilotMessage(msg) {
        const box = document.getElementById('copilot-log-box');
        if (!box) return;

        const div = document.createElement('div');
        div.className = 'copilot-msg';
        div.innerHTML = msg;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }

    openDecisionModal() {
        const matrix = this.decisionTable.generateMatrix(
            this.astar,
            this.renderer.grid,
            this.renderer.startPos,
            this.renderer.endPos
        );
        const html = this.decisionTable.renderHTML(matrix);
        const modalContent = document.getElementById('modal-decisiones-content');
        const modal = document.getElementById('modal-decisiones');
        if (modalContent) modalContent.innerHTML = html;
        if (modal) modal.style.display = 'flex';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new NaviCoreApp();
});
