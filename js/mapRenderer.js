/**
 * MapRenderer - Motor de Renderizado Ultra 60 FPS (Sharp Canvas & Smooth Lerp)
 * Módulo de NaviCore Autonomous Navigation Software
 */

export class MapRenderer {
    constructor(canvasId, cols = 25, rows = 16) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.cols = cols;
        this.rows = rows;

        this.viewMode = '2d';
        this.startPos = { x: 2, y: 8 };
        this.endPos = { x: 22, y: 8 };
        this.waypoints = [];
        this.enableLidar = true;
        this.showHeatmap = false;
        this.showRangeRing = true;
        this.batteryPercent = 100;

        this.grid = [];
        this.calculatedPath = [];
        this.exploredNodes = [];
        
        this.targetVehiclePos = null;
        this.currentVehiclePos = null;
        this.fleetPositions = [];

        this.lidarAngle = 0;
        this.isLoopRunning = false;

        this.initGrid();
        this.resizeCanvas();
        this.initThreeJS();
        this.startRenderLoop();

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                let terrain = 'road';
                let isObstacle = false;

                if ((c === 8 && r >= 3 && r <= 12) || (c === 16 && r >= 4 && r <= 14)) {
                    isObstacle = true;
                } else if (r === 5 && c >= 10 && c <= 14) {
                    terrain = 'dirt';
                } else if (r === 11 && c >= 10 && c <= 14) {
                    terrain = 'water';
                } else if (r === 8 && c === 12) {
                    terrain = 'recharge';
                }

                row.push({ x: c, y: r, isObstacle: isObstacle, terrainType: terrain });
            }
            this.grid.push(row);
        }
    }

    generateNewRandomMap() {
        if (!this.grid || this.grid.length === 0) this.initGrid();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r] || !this.grid[r][c]) continue;

                if ((c === this.startPos.x && r === this.startPos.y) || (c === this.endPos.x && r === this.endPos.y)) {
                    this.grid[r][c].isObstacle = false;
                    continue;
                }

                const rand = Math.random();
                if (rand < 0.20) {
                    this.grid[r][c].isObstacle = true;
                    this.grid[r][c].terrainType = 'road';
                } else if (rand < 0.32) {
                    this.grid[r][c].isObstacle = false;
                    this.grid[r][c].terrainType = 'dirt';
                } else if (rand < 0.42) {
                    this.grid[r][c].isObstacle = false;
                    this.grid[r][c].terrainType = 'water';
                } else if (rand < 0.46) {
                    this.grid[r][c].isObstacle = false;
                    this.grid[r][c].terrainType = 'recharge';
                } else {
                    this.grid[r][c].isObstacle = false;
                    this.grid[r][c].terrainType = 'road';
                }
            }
        }
        this.calculatedPath = [];
        this.exploredNodes = [];
        this.targetVehiclePos = null;
        this.currentVehiclePos = null;
        this.fleetPositions = [];
        this.updateThreeScene();
    }

    resizeCanvas() {
        if (!this.canvas || !this.canvas.parentElement) return;

        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = container.clientWidth * dpr;
        this.canvas.height = container.clientHeight * dpr;
        this.ctx.scale(dpr, dpr);

        this.displayWidth = container.clientWidth;
        this.displayHeight = container.clientHeight;

        this.cellWidth = this.displayWidth / this.cols;
        this.cellHeight = this.displayHeight / this.rows;

        if (this.renderer3D && this.camera3D) {
            this.camera3D.aspect = container.clientWidth / container.clientHeight;
            this.camera3D.updateProjectionMatrix();
            this.renderer3D.setSize(container.clientWidth, container.clientHeight);
        }
    }

    startRenderLoop() {
        if (this.isLoopRunning) return;
        this.isLoopRunning = true;

        const loop = () => {
            if (this.viewMode === '2d') {
                this.render2D();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    setVehiclePosition(pos) {
        this.targetVehiclePos = pos;
        if (!this.currentVehiclePos && pos) {
            this.currentVehiclePos = { x: pos.x, y: pos.y, angle: pos.angle || 0 };
        }
    }

    setFleetPositions(positions) {
        this.fleetPositions = positions;
    }

    setPath(path, exploredNodes = []) {
        this.calculatedPath = path;
        this.exploredNodes = exploredNodes;
    }

    setViewMode(mode) {
        this.viewMode = mode;
        const c2d = this.canvas;
        const c3d = document.getElementById('three-container');

        if (mode === '3d') {
            if (c2d) c2d.style.display = 'none';
            if (c3d) {
                c3d.style.display = 'block';
                this.updateThreeScene();
            }
        } else {
            if (c2d) c2d.style.display = 'block';
            if (c3d) c3d.style.display = 'none';
        }
    }

    initThreeJS() {
        const container = document.getElementById('three-container');
        if (!container || !window.THREE) return;

        this.scene3D = new THREE.Scene();
        this.scene3D.background = new THREE.Color(0x060e1a);

        this.camera3D = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera3D.position.set(0, -25, 20);
        this.camera3D.lookAt(0, 0, 0);

        this.renderer3D = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer3D.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer3D.domElement);

        if (window.THREE.OrbitControls) {
            this.controls3D = new THREE.OrbitControls(this.camera3D, this.renderer3D.domElement);
            this.controls3D.enableDamping = true;
            this.controls3D.dampingFactor = 0.05;
        }

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene3D.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
        dirLight.position.set(10, -10, 25);
        this.scene3D.add(dirLight);

        this.gridGroup3D = new THREE.Group();
        this.scene3D.add(this.gridGroup3D);

        this.animateThree();
    }

    updateThreeScene() {
        if (!this.gridGroup3D || !window.THREE || !this.grid || this.grid.length === 0) return;

        while (this.gridGroup3D.children.length > 0) {
            this.gridGroup3D.remove(this.gridGroup3D.children[0]);
        }

        const cw = 1.0;
        const ch = 1.0;
        const offsetX = -(this.cols * cw) / 2;
        const offsetY = (this.rows * ch) / 2;

        for (let r = 0; r < this.rows; r++) {
            if (!this.grid[r]) continue;
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c];
                if (!cell) continue;

                const x = offsetX + c * cw;
                const y = offsetY - r * ch;

                let color = 0x091628;
                let height = 0.1;

                if (c === this.startPos.x && r === this.startPos.y) {
                    color = 0x00e676;
                    height = 0.4;
                } else if (c === this.endPos.x && r === this.endPos.y) {
                    color = 0xff3d71;
                    height = 0.4;
                } else if (cell.isObstacle) {
                    color = 0xff3d71;
                    height = 1.2;
                } else if (cell.terrainType === 'dirt') {
                    color = 0x3b2d1d;
                } else if (cell.terrainType === 'water') {
                    color = 0x0f3854;
                } else if (cell.terrainType === 'recharge') {
                    color = 0x00f0ff;
                }

                const geo = new THREE.BoxGeometry(cw * 0.92, ch * 0.92, height);
                const mat = new THREE.MeshLambertMaterial({ color: color });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x, y, height / 2);
                this.gridGroup3D.add(mesh);
            }
        }
    }

    animateThree() {
        if (!this.renderer3D || !this.scene3D) return;
        requestAnimationFrame(() => this.animateThree());
        if (this.controls3D) this.controls3D.update();
        this.renderer3D.render(this.scene3D, this.camera3D);
    }

    render2D() {
        if (!this.ctx || !this.grid || !Array.isArray(this.grid) || this.grid.length === 0) {
            return;
        }

        const cw = this.cellWidth;
        const ch = this.cellHeight;

        this.ctx.fillStyle = '#060e1a';
        this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

        for (let r = 0; r < this.rows; r++) {
            if (!this.grid[r]) continue;
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c];
                if (!cell) continue;

                const x = c * cw;
                const y = r * ch;

                if (cell.isObstacle) {
                    this.ctx.fillStyle = '#1e293b';
                } else if (cell.terrainType === 'dirt') {
                    this.ctx.fillStyle = '#3b2d1d';
                } else if (cell.terrainType === 'water') {
                    this.ctx.fillStyle = '#0f3854';
                } else if (cell.terrainType === 'recharge') {
                    this.ctx.fillStyle = '#005f73';
                } else {
                    this.ctx.fillStyle = '#091628';
                }
                this.ctx.fillRect(x, y, cw, ch);

                this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, cw, ch);

                if (cell.isObstacle) {
                    this.ctx.fillStyle = 'rgba(255, 61, 113, 0.35)';
                    this.ctx.fillRect(x + 4, y + 4, cw - 8, ch - 8);
                    this.ctx.strokeStyle = '#ff3d71';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.strokeRect(x + 4, y + 4, cw - 8, ch - 8);
                } else if (cell.terrainType === 'recharge') {
                    this.ctx.fillStyle = '#00f0ff';
                    this.ctx.font = '12px Inter';
                    this.ctx.fillText('⚡', x + cw / 3, y + ch / 1.4);
                }
            }
        }

        if (this.showHeatmap) {
            for (let r = 0; r < this.rows; r++) {
                if (!this.grid[r]) continue;
                for (let c = 0; c < this.cols; c++) {
                    const cell = this.grid[r][c];
                    if (!cell) continue;

                    const x = c * cw;
                    const y = r * ch;

                    if (cell.isObstacle) {
                        this.ctx.fillStyle = 'rgba(255, 61, 113, 0.35)';
                        this.ctx.fillRect(x, y, cw, ch);
                    } else if (cell.terrainType === 'water') {
                        this.ctx.fillStyle = 'rgba(255, 170, 0, 0.3)';
                        this.ctx.fillRect(x, y, cw, ch);
                    }
                }
            }
        }

        if (Array.isArray(this.exploredNodes)) {
            for (const node of this.exploredNodes) {
                if (!node) continue;
                const x = node.x * cw;
                const y = node.y * ch;
                this.ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
                this.ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
            }
        }

        if (Array.isArray(this.waypoints)) {
            this.waypoints.forEach((wp, idx) => {
                if (!wp) return;
                const wx = wp.x * cw + cw / 2;
                const wy = wp.y * ch + ch / 2;
                this.ctx.fillStyle = '#8957e5';
                this.ctx.beginPath();
                this.ctx.arc(wx, wy, cw * 0.28, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 11px Inter';
                this.ctx.fillText(`${idx + 1}`, wx - 3, wy + 4);
            });
        }

        if (Array.isArray(this.calculatedPath) && this.calculatedPath.length > 1) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#00f0ff';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 14;

            for (let i = 0; i < this.calculatedPath.length; i++) {
                const pt = this.calculatedPath[i];
                if (!pt) continue;
                const cx = pt.x * cw + cw / 2;
                const cy = pt.y * ch + ch / 2;

                if (i === 0) this.ctx.moveTo(cx, cy);
                else this.ctx.lineTo(cx, cy);
            }
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        if (this.startPos) {
            const sx = this.startPos.x * cw + cw / 2;
            const sy = this.startPos.y * ch + ch / 2;
            this.ctx.fillStyle = '#00e676';
            this.ctx.shadowColor = '#00e676';
            this.ctx.shadowBlur = 16;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, cw * 0.35, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        if (this.endPos) {
            const ex = this.endPos.x * cw + cw / 2;
            const ey = this.endPos.y * ch + ch / 2;
            this.ctx.fillStyle = '#ff3d71';
            this.ctx.shadowColor = '#ff3d71';
            this.ctx.shadowBlur = 16;
            this.ctx.beginPath();
            this.ctx.arc(ex, ey, cw * 0.35, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        if (this.targetVehiclePos && this.currentVehiclePos) {
            this.currentVehiclePos.x += (this.targetVehiclePos.x - this.currentVehiclePos.x) * 0.22;
            this.currentVehiclePos.y += (this.targetVehiclePos.y - this.currentVehiclePos.y) * 0.22;
            this.currentVehiclePos.angle += (this.targetVehiclePos.angle - this.currentVehiclePos.angle) * 0.22;
        }

        const activeV = this.currentVehiclePos || { x: this.startPos.x, y: this.startPos.y, angle: 0 };
        const vx = activeV.x * cw + cw / 2;
        const vy = activeV.y * ch + ch / 2;

        if (this.showRangeRing) {
            const maxRadius = (this.batteryPercent / 100) * (cw * 8);
            this.ctx.strokeStyle = 'rgba(0, 230, 118, 0.35)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 6]);
            this.ctx.beginPath();
            this.ctx.arc(vx, vy, maxRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        if (this.enableLidar) {
            this.lidarAngle += 0.06;
            this.ctx.save();
            this.ctx.translate(vx, vy);

            const lidarRadius = cw * 3.5;
            const grad = this.ctx.createRadialGradient(0, 0, 5, 0, 0, lidarRadius);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
            grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, lidarRadius, this.lidarAngle, this.lidarAngle + 0.6);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }

        if (this.currentVehiclePos) {
            this.ctx.save();
            this.ctx.translate(vx, vy);
            this.ctx.rotate(activeV.angle);

            const lightGrad = this.ctx.createRadialGradient(15, 0, 2, 60, 0, 45);
            lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            lightGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

            this.ctx.fillStyle = lightGrad;
            this.ctx.beginPath();
            this.ctx.moveTo(10, 0);
            this.ctx.arc(10, 0, 55, -Math.PI / 6, Math.PI / 6);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 18;
            this.ctx.beginPath();
            this.ctx.moveTo(14, 0);
            this.ctx.lineTo(-9, -9);
            this.ctx.lineTo(-4, 0);
            this.ctx.lineTo(-9, 9);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.restore();
        }

        if (Array.isArray(this.fleetPositions)) {
            for (const vPos of this.fleetPositions) {
                if (!vPos) continue;
                const fx = vPos.x * cw + cw / 2;
                const fy = vPos.y * ch + ch / 2;

                this.ctx.fillStyle = vPos.color || '#ffaa00';
                this.ctx.shadowColor = vPos.color || '#ffaa00';
                this.ctx.shadowBlur = 12;
                this.ctx.beginPath();
                this.ctx.arc(fx, fy, cw * 0.28, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
    }
}
