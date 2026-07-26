/**
 * Exporter - Exportador de Reportes de Misión
 * Módulo de NaviCore Autonomous Navigation System
 */

export class Exporter {
    constructor() {}

    generateReportData(telemetry, vehicleManager, astarResult) {
        return {
            software: 'NaviCore Autonomous Navigation Software',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            mission: {
                vehicle: vehicleManager.selectedVehicle.name,
                priority: vehicleManager.selectedPriority.name,
                type: vehicleManager.selectedMission.name
            },
            telemetry: {
                distanceKm: telemetry.distanceKm,
                estimatedTimeSec: telemetry.estimatedTimeSec,
                energyConsumptionUnits: telemetry.totalConsumptionUnits,
                batteryRemainingPercent: telemetry.batteryPercent,
                rechargesNeeded: telemetry.rechargeCount,
                obstaclesAvoided: telemetry.obstaclesAvoided,
                energyEfficiencyKmPerUnit: telemetry.efficiency
            },
            algorithm: {
                name: 'A* (A-Star) Pathfinding',
                pathSteps: astarResult.steps,
                nodesExplored: astarResult.nodesExplored,
                pathFound: astarResult.success
            }
        };
    }

    exportJSON(reportData) {
        const jsonStr = JSON.stringify(reportData, null, 2);
        this.downloadFile(jsonStr, `NaviCore_Report_${Date.now()}.json`, 'application/json');
    }

    exportTXT(reportData) {
        let txt = `====================================================\n`;
        txt += `       NAVICORE AUTONOMOUS NAVIGATION REPORT        \n`;
        txt += `====================================================\n`;
        txt += `Fecha: ${reportData.timestamp}\n\n`;
        txt += `[MISIÓN Y VEHÍCULO]\n`;
        txt += `- Vehículo: ${reportData.mission.vehicle}\n`;
        txt += `- Prioridad: ${reportData.mission.priority}\n`;
        txt += `- Tipo Misión: ${reportData.mission.type}\n\n`;
        txt += `[RESULTADOS TELEMETRÍA]\n`;
        txt += `- Distancia Recorrida: ${reportData.telemetry.distanceKm} km\n`;
        txt += `- Tiempo Estimado: ${reportData.telemetry.estimatedTimeSec} segundos\n`;
        txt += `- Consumo Energético: ${reportData.telemetry.energyConsumptionUnits} u\n`;
        txt += `- Batería Restante: ${reportData.telemetry.batteryRemainingPercent}%\n`;
        txt += `- Recargas Necesarias: ${reportData.telemetry.rechargesNeeded}\n`;
        txt += `- Obstáculos Evitados: ${reportData.telemetry.obstaclesAvoided}\n\n`;
        txt += `[ALGORITMO A*]\n`;
        txt += `- Estado: ${reportData.algorithm.pathFound ? 'Éxito' : 'Fallido'}\n`;
        txt += `- Pasos de Ruta: ${reportData.algorithm.pathSteps}\n`;
        txt += `- Nodos Explorados: ${reportData.algorithm.nodesExplored}\n`;

        this.downloadFile(txt, `NaviCore_Report_${Date.now()}.txt`, 'text/plain');
    }

    exportHTML(reportData) {
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte NaviCore - ${reportData.timestamp}</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #060e1a; color: #fff; padding: 40px; }
                    h1 { color: #00f0ff; border-bottom: 2px solid #00f0ff; padding-bottom: 10px; }
                    .card { background: #091426; border: 1px solid rgba(0,240,255,0.3); padding: 20px; border-radius: 12px; margin-bottom: 20px; }
                    .stat { font-size: 1.1rem; margin: 8px 0; }
                    .val { color: #00f0ff; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>🚀 Reporte NaviCore Autonomous Navigation</h1>
                <div class="card">
                    <h2>Misión y Configuración</h2>
                    <p class="stat">Vehículo: <span class="val">${reportData.mission.vehicle}</span></p>
                    <p class="stat">Prioridad: <span class="val">${reportData.mission.priority}</span></p>
                    <p class="stat">Misión: <span class="val">${reportData.mission.type}</span></p>
                </div>
                <div class="card">
                    <h2>Resultados de Telemetría</h2>
                    <p class="stat">Distancia: <span class="val">${reportData.telemetry.distanceKm} km</span></p>
                    <p class="stat">Tiempo Estimado: <span class="val">${reportData.telemetry.estimatedTimeSec} sec</span></p>
                    <p class="stat">Consumo Energético: <span class="val">${reportData.telemetry.energyConsumptionUnits} u</span></p>
                    <p class="stat">Batería Restante: <span class="val">${reportData.telemetry.batteryRemainingPercent}%</span></p>
                    <p class="stat">Nodos Explorados A*: <span class="val">${reportData.algorithm.nodesExplored}</span></p>
                </div>
            </body>
            </html>
        `;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        win.focus();
    }

    downloadFile(content, fileName, contentType) {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}
