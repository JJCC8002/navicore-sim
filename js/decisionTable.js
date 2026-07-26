/**
 * DecisionTable - Matriz Comparativa y Tabla de Decisiones
 * Módulo de NaviCore Autonomous Navigation System
 */

import { VEHICLES } from './vehicleManager.js';

export class DecisionTable {
    constructor() {}

    generateMatrix(astar, grid, startPos, endPos) {
        const results = [];

        for (const key of Object.keys(VEHICLES)) {
            const vehicle = VEHICLES[key];
            const pathResult = astar.findPath(grid, startPos, endPos, vehicle.terrainCosts);

            if (pathResult.success) {
                const stepDist = 0.25; // km por celda
                const distKm = (pathResult.path.length - 1) * stepDist;
                const speedKmMin = vehicle.speed / 60;
                const timeSec = Math.round((distKm / speedKmMin) * 60);

                let totalEnergy = 0;
                for (const pt of pathResult.path) {
                    const cell = grid[pt.y][pt.x];
                    const terrainMult = vehicle.terrainCosts[cell.terrainType] || 1.0;
                    totalEnergy += vehicle.consumptionRate * terrainMult;
                }

                // Puntaje de Eficiencia compuesto (menor tiempo + menor consumo = mejor)
                const score = (timeSec * 0.5) + (totalEnergy * 10 * 0.5);

                results.push({
                    vehicle: vehicle.name,
                    distKm: distKm.toFixed(2),
                    timeSec: timeSec,
                    energyUnits: totalEnergy.toFixed(1),
                    nodes: pathResult.nodesExplored,
                    score: score,
                    feasible: true
                });
            } else {
                results.push({
                    vehicle: vehicle.name,
                    distKm: 'N/A',
                    timeSec: 'N/A',
                    energyUnits: 'N/A',
                    nodes: pathResult.nodesExplored,
                    score: 999999,
                    feasible: false
                });
            }
        }

        // Ordenar por mejor puntaje
        results.sort((a, b) => a.score - b.score);
        return results;
    }

    renderHTML(matrixData) {
        let html = `
            <table class="decision-table">
                <thead>
                    <tr>
                        <th>Ranking</th>
                        <th>Vehículo</th>
                        <th>Distancia</th>
                        <th>Tiempo Est.</th>
                        <th>Consumo Energético</th>
                        <th>Nodos Explorados</th>
                        <th>Estado Misión</th>
                    </tr>
                </thead>
                <tbody>
        `;

        matrixData.forEach((row, index) => {
            const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : 'rank-3';
            const rankBadge = row.feasible ? `<span class="rank-badge ${rankClass}">#${index + 1} ${index === 0 ? '🏆 Recomendado' : ''}</span>` : '<span class="rank-badge">N/A</span>';
            const statusTag = row.feasible ? '<span style="color:#00e676; font-weight:700;">✅ Viable</span>' : '<span style="color:#ff3d71; font-weight:700;">❌ Inaccesible</span>';

            html += `
                <tr>
                    <td>${rankBadge}</td>
                    <td><strong>${row.vehicle}</strong></td>
                    <td>${row.distKm} km</td>
                    <td>${row.timeSec} s</td>
                    <td>${row.energyUnits} u</td>
                    <td>${row.nodes}</td>
                    <td>${statusTag}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        return html;
    }
}
