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
        if (!path || path.length < 2) {
            this.reset();
            this.updateUI(vehicle);
            return;
        }

        const stepDistanceKm = 0.25;
        let totalDist = (path.length - 1) * stepDistanceKm;
        let totalEnergy = 0;
        let obstaclesCount = 0;

        this.historyBattery = [100];
        this.historyLabels = ['0s'];

        for (let i = 0; i < path.length; i++) {
            const pt = path[i];
            const cell = grid[pt.y][pt.x];

            if (cell.terrainType === 'recharge') {
                // Zona de recarga ⚡ recarga 15% de batería
                totalEnergy = Math.max(0, totalEnergy - 15);
            } else {
                const terrainMult = vehicle.terrainCosts[cell.terrainType] || 1.0;
                totalEnergy += vehicle.consumptionRate * terrainMult;
            }

            const remBat = Math.max(0, 100 - (totalEnergy / vehicle.batteryCap) * 100);
            this.historyBattery.push(remBat.toFixed(1));
            this.historyLabels.push(`${i * 2}s`);
        }

        this.distanceKm = totalDist;
        this.totalConsumptionUnits = totalEnergy;

        const speedKmMin = vehicle.speed / 60;
        this.estimatedTimeSec = Math.round((totalDist / speedKmMin) * 60);

        const batteryUsed = (totalEnergy / vehicle.batteryCap) * 100;
        this.batteryPercent = Math.max(0, 100 - batteryUsed);

        this.updateUI(vehicle);
        this.updateChart();
    }

    updateUI(vehicle, currentStepProgress = 1.0) {
        document.getElementById('stat-vehiculo').textContent = vehicle.name.split(' ')[1] || vehicle.name;
        document.getElementById('stat-velocidad').textContent = `${vehicle.speed} km/h`;
        document.getElementById('stat-pasos').textContent = this.historyLabels.length;

        const currentBattery = (100 - (100 - this.batteryPercent) * currentStepProgress).toFixed(1);
        document.getElementById('stat-bateria').textContent = `${currentBattery}%`;

        const barFill = document.getElementById('bateria-fill');
        const barText = document.getElementById('bateria-text');
        if (barFill && barText) {
            barFill.style.width = `${currentBattery}%`;
            barText.textContent = `${currentBattery}%`;
        }

        document.getElementById('stat-consumo').textContent = `${(this.totalConsumptionUnits * currentStepProgress).toFixed(1)} u`;
    }

    updateChart() {
        if (!this.chart) return;
        this.chart.data.labels = this.historyLabels;
        this.chart.data.datasets[0].data = this.historyBattery;
        this.chart.update();
    }
}
