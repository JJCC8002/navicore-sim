/**
 * AStar - Motor de Algoritmos de Búsqueda Comparativos (A*, Dijkstra, Greedy, BFS)
 * Módulo de NaviCore Autonomous Navigation System
 */

export class AStar {
    constructor(gridCols = 25, gridRows = 16) {
        this.cols = gridCols;
        this.rows = gridRows;
    }

    heuristic(pos0, pos1) {
        if (!pos0 || !pos1) return 0;
        const dx = Math.abs(pos0.x - pos1.x);
        const dy = Math.abs(pos0.y - pos1.y);
        return Math.sqrt(dx * dx + dy * dy);
    }

    getNeighbors(grid, node, allowDiagonal = true) {
        const neighbors = [];
        if (!grid || !node) return neighbors;

        const x = node.x;
        const y = node.y;

        const dirs = [
            { x: 0, y: -1, cost: 1.0 },
            { x: 1, y: 0, cost: 1.0 },
            { x: 0, y: 1, cost: 1.0 },
            { x: -1, y: 0, cost: 1.0 }
        ];

        if (allowDiagonal) {
            dirs.push(
                { x: -1, y: -1, cost: 1.414 },
                { x: 1, y: -1, cost: 1.414 },
                { x: -1, y: 1, cost: 1.414 },
                { x: 1, y: 1, cost: 1.414 }
            );
        }

        for (const dir of dirs) {
            const nx = x + dir.x;
            const ny = y + dir.y;

            if (ny >= 0 && ny < grid.length && nx >= 0 && grid[ny] && nx < grid[ny].length) {
                const neighbor = grid[ny][nx];
                if (neighbor && !neighbor.isObstacle) {
                    neighbors.push({ node: neighbor, moveCost: dir.cost });
                }
            }
        }

        return neighbors;
    }

    findPath(grid, startPos, endPos, vehicleTerrainCosts = { road: 1.0, dirt: 1.6, water: 4.0 }, algorithm = 'astar') {
        const emptyResult = {
            success: false,
            path: [],
            totalCost: 0,
            steps: 0,
            nodesExplored: 0,
            exploredHistory: []
        };

        if (!grid || !Array.isArray(grid) || grid.length === 0) return emptyResult;
        if (!startPos || !endPos) return emptyResult;
        if (!grid[startPos.y] || !grid[startPos.y][startPos.x]) return emptyResult;
        if (!grid[endPos.y] || !grid[endPos.y][endPos.x]) return emptyResult;

        const startNode = grid[startPos.y][startPos.x];
        const endNode = grid[endPos.y][endPos.x];

        for (let r = 0; r < grid.length; r++) {
            if (!grid[r]) continue;
            for (let c = 0; c < grid[r].length; c++) {
                const node = grid[r][c];
                if (!node) continue;
                node.g = Infinity;
                node.h = 0;
                node.f = Infinity;
                node.parent = null;
                node.visited = false;
                node.closed = false;
            }
        }

        const openSet = [];
        const exploredHistory = [];

        startNode.g = 0;
        startNode.h = this.heuristic(startNode, endNode);
        startNode.f = algorithm === 'dijkstra' ? 0 : startNode.h;
        openSet.push(startNode);

        while (openSet.length > 0) {
            let currentIndex = 0;

            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[currentIndex].f) {
                    currentIndex = i;
                }
            }

            const current = openSet[currentIndex];

            if (current.x === endNode.x && current.y === endNode.y) {
                const path = [];
                let temp = current;
                while (temp) {
                    path.push({ x: temp.x, y: temp.y });
                    temp = temp.parent;
                }
                path.reverse();

                return {
                    success: true,
                    path: path,
                    totalCost: current.g,
                    steps: path.length,
                    nodesExplored: exploredHistory.length,
                    exploredHistory: exploredHistory
                };
            }

            openSet.splice(currentIndex, 1);
            current.closed = true;
            exploredHistory.push({ x: current.x, y: current.y });

            const neighbors = this.getNeighbors(grid, current);
            for (const { node: neighbor, moveCost } of neighbors) {
                if (neighbor.closed) continue;

                const terrainCost = vehicleTerrainCosts[neighbor.terrainType] || 1.0;
                if (terrainCost >= 99.0) continue;

                const tentativeG = current.g + (moveCost * terrainCost);

                if (!neighbor.visited || tentativeG < neighbor.g) {
                    neighbor.visited = true;
                    neighbor.parent = current;
                    neighbor.g = tentativeG;
                    neighbor.h = this.heuristic(neighbor, endNode);

                    if (algorithm === 'dijkstra') {
                        neighbor.f = neighbor.g;
                    } else if (algorithm === 'greedy') {
                        neighbor.f = neighbor.h;
                    } else if (algorithm === 'bfs') {
                        neighbor.f = openSet.length;
                    } else {
                        neighbor.f = neighbor.g + neighbor.h;
                    }

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return {
            success: false,
            path: [],
            totalCost: 0,
            steps: 0,
            nodesExplored: exploredHistory.length,
            exploredHistory: exploredHistory
        };
    }
}
