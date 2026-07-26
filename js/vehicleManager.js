/**
 * VehicleManager - Perfiles de vehículos, prioridades y misiones
 * Módulo de NaviCore Autonomous Navigation System
 */

export const VEHICLES = {
    drone: {
        id: 'drone',
        name: '🚁 Dron de Entrega (Aéreo)',
        speed: 80, // km/h base
        batteryCap: 50, // kWh
        consumptionRate: 0.8, // u/step
        terrainCosts: { road: 1.0, dirt: 1.0, water: 1.0 }, // vuela sobre agua
        color: '#00f0ff'
    },
    rover: {
        id: 'rover',
        name: '🤖 Rover Autónomo (Ligero)',
        speed: 45,
        batteryCap: 80,
        consumptionRate: 0.5,
        terrainCosts: { road: 1.0, dirt: 1.6, water: 4.0 },
        color: '#00e676'
    },
    truck: {
        id: 'truck',
        name: '🚛 Camión Eléctrico (Pesado)',
        speed: 60,
        batteryCap: 250,
        consumptionRate: 1.8,
        terrainCosts: { road: 1.0, dirt: 2.2, water: 99.0 }, // inaccesible agua
        color: '#8957e5'
    },
    agv: {
        id: 'agv',
        name: '🏭 AGV Industrial (Fábrica)',
        speed: 25,
        batteryCap: 40,
        consumptionRate: 0.4,
        terrainCosts: { road: 1.0, dirt: 3.0, water: 99.0 },
        color: '#ffaa00'
    }
};

export const PRIORITIES = {
    time: { id: 'time', name: '⚡ Tiempo Mínimo (Ruta Rápida)', weightTime: 0.7, weightEnergy: 0.3 },
    energy: { id: 'energy', name: '🔋 Consumo Mínimo (Eco-Efficient)', weightTime: 0.2, weightEnergy: 0.8 },
    balanced: { id: 'balanced', name: '⚖️ Ruta Balanceada', weightTime: 0.5, weightEnergy: 0.5 }
};

export const MISSIONS = {
    delivery: { id: 'delivery', name: '📦 Entrega de Paquetes Urgente' },
    recon: { id: 'recon', name: '🛰️ Reconocimiento Terrestre' },
    heavyCargo: { id: 'heavyCargo', name: '🏗️ Transporte de Carga Pesada' },
    factory: { id: 'factory', name: '⚙️ Abastecimiento en Línea de Ensamblaje' }
};

export class VehicleManager {
    constructor() {
        this.selectedVehicle = VEHICLES.rover;
        this.selectedPriority = PRIORITIES.time;
        this.selectedMission = MISSIONS.delivery;
    }

    setVehicle(vehicleId) {
        if (VEHICLES[vehicleId]) {
            this.selectedVehicle = VEHICLES[vehicleId];
        }
    }

    setPriority(priorityId) {
        if (PRIORITIES[priorityId]) {
            this.selectedPriority = PRIORITIES[priorityId];
        }
    }

    setMission(missionId) {
        if (MISSIONS[missionId]) {
            this.selectedMission = MISSIONS[missionId];
        }
    }
}
