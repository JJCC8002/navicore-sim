/**
 * Telemetry - Calculador de telemetría y Gráficos Chart.js en Vivo
 * Módulo de NaviCore Autonomous Navigation System
 */

export class Telemetry {
    constructor() {
        this.reset();
        this.chart = null;
        this.initChart();
    }

    reset() {
        this.distanceKm = 0;
        this.estimatedTimeSec = 0;
        this.totalConsumptionUnits = 0;
        this.batteryPercent = 100.0;
        this.rechargeCount = 0;
        this.obstaclesAvoided = 0;
        this.efficiency = 0;
        this.historyBattery = [100];
        this.historyLabels = ['0s'];
    }

    initChart() {
        const ctx = document.getElementById('telemetry-chart');
        if (!ctx || !window.Chart) return;

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.historyLabels,
                datasets: [{
                    label: 'Batería (%)',
                    data: this.historyBattery,
                    borderColor: '#00f0ff',
                    backgroundColor: 'rgba(0, 240, 255, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { color: '#8b9bb4', font: { size: 10 } },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
    }

    calculate(path, vehicle, grid) {
        if (!path || path.length < 2 || !vehicle || !grid) {
            this.reset();
            this.updateUI(vehicle);
            return;
        }

        const stepDistanceKm = 0.25;
        let totalDist = (path.length - 1) * stepDistanceKm;
        let totalEnergy = 0;

        this.historyBattery = [100];
        this.historyLabels = ['0s'];

        for (let i = 0; i < path.length; i++) {
            const pt = path[i];
            
            // Guardián para la matriz de cuadrícula
            if (!pt || !grid[pt.y] || !grid[pt.y][pt.x]) continue;
            
            const cell = grid[pt.y][pt.x];

            if (cell.terrainType === 'recharge') {
                totalEnergy = Math.max(0, totalEnergy - 15);
            } else {
                const terrainMult = vehicle.terrainCosts ? (vehicle.terrainCosts[cell.terrainType] || 1.0) : 1.0;
                totalEnergy += (vehicle.consumptionRate || 1.0) * terrainMult;
            }

            const batteryCap = vehicle.batteryCap || 100;
            const remBat = Math.max(0, 100 - (totalEnergy / batteryCap) * 100);
            this.historyBattery.push(remBat.toFixed(1));
            this.historyLabels.push(`${i * 2}s`);
        }

        this.distanceKm = totalDist;
        this.totalConsumptionUnits = totalEnergy;

        const vehicleSpeed = vehicle.speed || 40;
        const speedKmMin = vehicleSpeed / 60;
        this.estimatedTimeSec = Math.round((totalDist / speedKmMin) * 60);

        const batteryCap = vehicle.batteryCap || 100;
        const batteryUsed = (totalEnergy / batteryCap) * 100;
        this.batteryPercent = Math.max(0, 100 - batteryUsed);

        this.updateUI(vehicle);
        this.updateChart();
    }

    updateUI(vehicle, currentStepProgress = 1.0) {
        if (!vehicle) return;

        // Asignador seguro para evitar "Cannot set properties of null"
        const setSafeText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        const vehicleName = vehicle.name ? (vehicle.name.split(' ')[1] || vehicle.name) : 'Rover';
        setSafeText('stat-vehiculo', vehicleName);
        setSafeText('stat-velocidad', `${vehicle.speed || 0} km/h`);
        setSafeText('stat-pasos', this.historyLabels.length);

        const currentBattery = (100 - (100 - this.batteryPercent) * currentStepProgress).toFixed(1);
        setSafeText('stat-bateria', `${currentBattery}%`);

        const barFill = document.getElementById('bateria-fill');
        const barText = document.getElementById('bateria-text');
        if (barFill) barFill.style.width = `${currentBattery}%`;
        if (barText) barText.textContent = `${currentBattery}%`;

        setSafeText('stat-consumo', `${(this.totalConsumptionUnits * currentStepProgress).toFixed(1)} u`);
    }

    updateChart() {
        if (!this.chart) return;
        this.chart.data.labels = this.historyLabels;
        this.chart.data.datasets[0].data = this.historyBattery;
        this.chart.update();
    }
}
