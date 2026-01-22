// ==================== 게임 상태 관리 ====================
const GameState = {
    currentScreen: 'main-menu',
    gameMode: null,
    isFlying: false,
    isPreparing: false,
    playerData: {
        coins: 1000,
        bestDistance: 0,
        bestDuration: 0,
        selectedPlane: 'basic',
        unlockedPlanes: ['basic'],
        upgrades: {
            wing: 1,
            weight: 1,
            thrust: 1,
            booster: 1,
            sensor: 0
        }
    }
};

// ==================== 비행기 유닛 데이터 ====================
const PlaneTypes = {
    basic: {
        name: '기본 비행기',
        type: 'Basic Dart',
        icon: '✈️',
        price: 0,
        stats: {
            speed: 5,
            lift: 5,
            durability: 5,
            weight: 1.0
        },
        ability: null
    },
    glider: {
        name: '글라이더',
        type: 'Glider Wing',
        icon: '🦅',
        price: 500,
        stats: {
            speed: 3,
            lift: 9,
            durability: 4,
            weight: 0.7
        },
        ability: {
            name: '상승 기류 감지',
            type: 'passive',
            effect: 'updraft_bonus'
        }
    },
    rocket: {
        name: '로켓형',
        type: 'Rocket Dart',
        icon: '🚀',
        price: 800,
        stats: {
            speed: 9,
            lift: 3,
            durability: 8,
            weight: 1.3
        },
        ability: {
            name: '부스터 점화',
            type: 'active',
            effect: 'speed_boost'
        }
    },
    windrider: {
        name: '윈드라이더',
        type: 'Wind Rider',
        icon: '🌪️',
        price: 1200,
        stats: {
            speed: 6,
            lift: 6,
            durability: 6,
            weight: 1.0
        },
        ability: {
            name: '바람 무시',
            type: 'active',
            effect: 'wind_immunity'
        }
    },
    phoenix: {
        name: '피닉스',
        type: 'Phoenix',
        icon: '🔥',
        price: 1500,
        stats: {
            speed: 5,
            lift: 8,
            durability: 5,
            weight: 0.9
        },
        ability: {
            name: '상승 폭발',
            type: 'active',
            effect: 'ascent_burst',
            uses: 2
        }
    },
    fortune: {
        name: '포춘 플라이어',
        type: 'Fortune Flyer',
        icon: '🍀',
        price: 1000,
        stats: {
            speed: 6,
            lift: 5,
            durability: 6,
            weight: 1.1
        },
        ability: {
            name: '완벽한 착지',
            type: 'passive',
            effect: 'landing_bonus'
        }
    }
};

// ==================== 업그레이드 데이터 ====================
const UpgradeData = {
    wing: {
        name: '날개 강화',
        description: '양력과 안정성을 향상시킵니다',
        maxLevel: 5,
        costs: [100, 250, 500, 1000, 2000],
        effects: {
            lift: [0, 0.15, 0.30, 0.50, 0.75],
            stability: [0, 0.10, 0.20, 0.35, 0.50]
        }
    },
    weight: {
        name: '무게 조절',
        description: '비행기의 무게를 조절합니다 (경량화)',
        maxLevel: 5,
        costs: [100, 250, 500, 1000, 2000],
        effects: {
            weightMod: [1.0, 0.95, 0.90, 0.85, 0.80],
            lift: [0, 0.05, 0.10, 0.15, 0.20]
        }
    },
    thrust: {
        name: '추진력 부스터',
        description: '초기 속도와 부스터 성능을 향상시킵니다',
        maxLevel: 5,
        costs: [150, 300, 600, 1200, 2500],
        effects: {
            speed: [0, 0.20, 0.40, 0.60, 1.00],
            boosterCount: [0, 1, 2, 3, 3]
        }
    }
};

// ==================== 게임 물리 및 비행 시스템 ====================
class FlightPhysics {
    constructor() {
        this.gravity = 9.8;
        this.airResistance = 0.02;
        this.windStrength = 0;
        this.windDirection = 0;
    }

    calculateForces(plane, velocity, altitude) {
        const forces = {
            gravity: -this.gravity * plane.weight,
            lift: velocity.x * plane.lift * 0.5,
            drag: -velocity.x * velocity.x * this.airResistance,
            wind: this.windStrength
        };

        return forces;
    }

    update(plane, velocity, position, deltaTime) {
        const forces = this.calculateForces(plane, velocity, position.y);

        // 속도 업데이트
        velocity.y += (forces.gravity + forces.lift) * deltaTime;
        velocity.x += (forces.drag + forces.wind) * deltaTime;

        // 위치 업데이트
        position.x += velocity.x * deltaTime;
        position.y += velocity.y * deltaTime;

        // 지면 충돌 체크
        if (position.y <= 0) {
            position.y = 0;
            velocity.y = 0;
            velocity.x *= 0.5; // 착지 시 속도 감소
            return true; // 착지
        }

        return false;
    }
}

// ==================== 게임 렌더러 ====================
class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBackground(distance) {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#E0F6FF');
        gradient.addColorStop(1, '#90EE90');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 구름 그리기
        this.drawClouds(distance);

        // 지면 그리기
        this.drawGround(distance);
    }

    drawClouds(offset) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 5; i++) {
            const x = (i * 300 - offset * 2) % (this.canvas.width + 200);
            const y = 100 + i * 50;
            this.drawCloud(x, y);
        }
    }

    drawCloud(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 30, 0, Math.PI * 2);
        this.ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
        this.ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawGround(offset) {
        const groundY = this.canvas.height - 100;
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(0, groundY, this.canvas.width, 100);

        // 잔디
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(0, groundY, this.canvas.width, 20);

        // 거리 표시 선
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            const x = (i * 100 - offset * 10) % this.canvas.width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, groundY);
            this.ctx.lineTo(x, groundY + 20);
            this.ctx.stroke();

            // 거리 숫자
            if (i % 5 === 0) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillText(`${Math.floor(offset + i * 10)}m`, x + 5, groundY + 15);
            }
        }
    }

    drawPlane(x, y, angle, planeType, scale = 1) {
        const plane = PlaneTypes[planeType];
        this.ctx.save();
        this.ctx.translate(x, this.canvas.height - 100 - y);
        this.ctx.rotate(angle);
        this.ctx.font = `${64 * scale}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(plane.icon, 0, 0);
        this.ctx.restore();
    }

    drawObstacle(obstacle, offset) {
        const x = obstacle.x - offset * 10;
        const y = this.canvas.height - 100 - obstacle.y;

        if (x < -100 || x > this.canvas.width + 100) return;

        this.ctx.save();
        this.ctx.translate(x, y);

        switch (obstacle.type) {
            case 'tree':
                this.drawTree();
                break;
            case 'building':
                this.drawBuilding(obstacle.height);
                break;
            case 'bird':
                this.drawBird();
                break;
        }

        this.ctx.restore();
    }

    drawTree() {
        // 나무 줄기
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(-10, 0, 20, 80);

        // 나뭇잎
        this.ctx.fillStyle = '#228B22';
        this.ctx.beginPath();
        this.ctx.arc(0, -20, 40, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBuilding(height) {
        this.ctx.fillStyle = '#888';
        this.ctx.fillRect(-30, 0, 60, height);

        // 창문
        this.ctx.fillStyle = '#4A90E2';
        for (let i = 0; i < Math.floor(height / 30); i++) {
            for (let j = 0; j < 2; j++) {
                this.ctx.fillRect(-20 + j * 25, i * 30 + 5, 15, 20);
            }
        }
    }

    drawBird() {
        this.ctx.fillStyle = '#000';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('🐦', 0, 0);
    }

    drawWindIndicator(wind) {
        // 바람 입자 효과
        this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(wind.strength) * 0.3})`;
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = Math.random() * 3 + 1;
            this.ctx.fillRect(x + wind.direction * wind.strength * 10, y, size, size);
        }
    }

    drawTrajectory(angle, power, planeStats) {
        const startX = 100;
        const startY = this.canvas.height - 120;

        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);

        const angleRad = (angle * Math.PI) / 180;
        const initialVelocity = power * 10;
        let vx = Math.cos(angleRad) * initialVelocity;
        let vy = -Math.sin(angleRad) * initialVelocity;
        let x = startX;
        let y = startY;

        for (let t = 0; t < 3; t += 0.1) {
            vy += 9.8 * 0.1;
            x += vx * 10;
            y += vy * 10;

            if (y >= this.canvas.height - 100) break;

            this.ctx.lineTo(x, y);
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
}

// ==================== 게임 매니저 ====================
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new GameRenderer(this.canvas);
        this.physics = new FlightPhysics();

        this.plane = null;
        this.position = { x: 0, y: 20 };
        this.velocity = { x: 0, y: 0 };
        this.angle = 45;
        this.power = 0;
        this.durability = 100;
        this.boosterCount = 0;
        this.abilityReady = true;
        this.abilityActive = false;

        this.flightTime = 0;
        this.maxAltitude = 0;
        this.maxSpeed = 0;
        this.distance = 0;

        this.obstacles = [];
        this.wind = { direction: 1, strength: 0.5 };

        this.isCharging = false;
        this.lastTime = 0;

        this.bonuses = [];

        this.setupControls();
        this.loadGameData();
        this.updateUI();
    }

    setupControls() {
        // 스페이스바 충전
        let spacePressed = false;
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isPreparing && !spacePressed) {
                spacePressed = true;
                this.isCharging = true;
                this.chargeInterval = setInterval(() => {
                    this.power = Math.min(this.power + 5, 150);
                    this.updatePowerGauge();
                }, 50);
            }

            if (e.code === 'Enter' && this.isPreparing) {
                this.launchPlane();
            }

            if (e.code === 'Space' && this.isFlying && this.boosterCount > 0) {
                this.activateBooster();
            }

            if (e.code === 'KeyQ' && this.isFlying && this.abilityReady) {
                this.activateAbility();
            }

            if (e.code === 'ArrowLeft' && this.isPreparing) {
                this.angle = Math.max(15, this.angle - 1);
                this.updateAngle();
            }

            if (e.code === 'ArrowRight' && this.isPreparing) {
                this.angle = Math.min(75, this.angle + 1);
                this.updateAngle();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.isPreparing) {
                spacePressed = false;
                this.isCharging = false;
                clearInterval(this.chargeInterval);
            }
        });

        // 각도 슬라이더
        const angleSlider = document.getElementById('angle-slider');
        angleSlider.addEventListener('input', (e) => {
            this.angle = parseInt(e.target.value);
            this.updateAngle();
        });

        // 마우스 이동으로 각도 조절
        let mouseDown = false;
        document.addEventListener('mousedown', () => mouseDown = true);
        document.addEventListener('mouseup', () => mouseDown = false);
        document.addEventListener('mousemove', (e) => {
            if (mouseDown && this.isPreparing) {
                const delta = e.movementX;
                this.angle = Math.max(15, Math.min(75, this.angle + delta * 0.5));
                this.updateAngle();
                angleSlider.value = this.angle;
            }
        });
    }

    loadGameData() {
        const saved = localStorage.getItem('paperplane-game');
        if (saved) {
            const data = JSON.parse(saved);
            GameState.playerData = { ...GameState.playerData, ...data };
        }
        this.updateStatsDisplay();
    }

    saveGameData() {
        localStorage.setItem('paperplane-game', JSON.stringify(GameState.playerData));
    }

    updateUI() {
        document.getElementById('player-coins').textContent = GameState.playerData.coins;
        document.getElementById('best-distance').textContent = `${GameState.playerData.bestDistance}m`;
        document.getElementById('best-duration').textContent = `${GameState.playerData.bestDuration.toFixed(1)}s`;
    }

    updateStatsDisplay() {
        document.getElementById('player-coins').textContent = GameState.playerData.coins;
        document.getElementById('best-distance').textContent = `${GameState.playerData.bestDistance}m`;
        document.getElementById('best-duration').textContent = `${GameState.playerData.bestDuration.toFixed(1)}s`;
    }

    updatePowerGauge() {
        const fill = document.getElementById('power-fill');
        const value = document.getElementById('power-value');
        fill.style.width = `${Math.min(this.power, 150)}%`;
        value.textContent = `${Math.floor(this.power)}%`;
    }

    updateAngle() {
        const indicator = document.getElementById('angle-indicator');
        const value = document.getElementById('angle-value');
        indicator.style.transform = `rotate(${-this.angle}deg)`;
        value.textContent = `${Math.floor(this.angle)}°`;
    }

    prepareFlight(mode) {
        GameState.gameMode = mode;
        this.isPreparing = true;
        this.isFlying = false;

        // 비행기 설정
        const planeId = GameState.playerData.selectedPlane;
        this.plane = { ...PlaneTypes[planeId] };

        // 업그레이드 적용
        this.applyUpgrades();

        // 초기화
        this.position = { x: 0, y: 20 };
        this.velocity = { x: 0, y: 0 };
        this.angle = mode === 'distance' ? 30 : 50;
        this.power = 0;
        this.durability = 100;
        this.flightTime = 0;
        this.maxAltitude = 0;
        this.maxSpeed = 0;
        this.distance = 0;
        this.bonuses = [];

        // 바람 생성
        this.generateWind();

        // 장애물 생성
        this.generateObstacles();

        // UI 업데이트
        document.getElementById('angle-slider').value = this.angle;
        this.updateAngle();
        this.updatePowerGauge();

        // 화면 전환
        this.showScreen('game-screen');
        document.getElementById('launch-ui').classList.add('active');
        document.getElementById('result-ui').classList.remove('active');

        // 발사대 렌더링
        this.renderLaunchPad();
    }

    applyUpgrades() {
        const upgrades = GameState.playerData.upgrades;

        // 날개 업그레이드
        const wingLevel = upgrades.wing - 1;
        this.plane.stats.lift += this.plane.stats.lift * UpgradeData.wing.effects.lift[wingLevel];

        // 무게 업그레이드
        const weightLevel = upgrades.weight - 1;
        this.plane.stats.weight *= UpgradeData.weight.effects.weightMod[weightLevel];
        this.plane.stats.lift += this.plane.stats.lift * UpgradeData.weight.effects.lift[weightLevel];

        // 추진력 업그레이드
        const thrustLevel = upgrades.thrust - 1;
        this.plane.stats.speed += this.plane.stats.speed * UpgradeData.thrust.effects.speed[thrustLevel];
        this.boosterCount = UpgradeData.thrust.effects.boosterCount[thrustLevel];

        // 부스터 카운트 UI 업데이트
        document.getElementById('booster-count').textContent = this.boosterCount;
    }

    generateWind() {
        // 랜덤 바람 생성
        this.wind.direction = Math.random() > 0.5 ? 1 : -1;
        this.wind.strength = Math.random() * 0.5 + 0.3;

        // UI 업데이트
        const arrow = document.getElementById('wind-arrow');
        const strength = document.getElementById('wind-strength');

        arrow.textContent = this.wind.direction > 0 ? '→' : '←';
        arrow.style.transform = `rotate(${this.wind.direction > 0 ? 0 : 180}deg)`;

        if (this.wind.strength < 0.4) {
            strength.textContent = '바람: 약함';
        } else if (this.wind.strength < 0.7) {
            strength.textContent = '바람: 보통';
        } else {
            strength.textContent = '바람: 강함';
        }

        this.physics.windStrength = this.wind.direction * this.wind.strength;
    }

    generateObstacles() {
        this.obstacles = [];

        // 나무 생성
        for (let i = 0; i < 10; i++) {
            this.obstacles.push({
                type: 'tree',
                x: 100 + i * 150 + Math.random() * 50,
                y: 0,
                width: 20,
                height: 80,
                damage: 25
            });
        }

        // 건물 생성
        for (let i = 0; i < 5; i++) {
            const height = 100 + Math.random() * 100;
            this.obstacles.push({
                type: 'building',
                x: 300 + i * 300 + Math.random() * 100,
                y: 0,
                width: 60,
                height: height,
                damage: 50
            });
        }

        // 새 생성
        for (let i = 0; i < 8; i++) {
            this.obstacles.push({
                type: 'bird',
                x: 200 + i * 200 + Math.random() * 100,
                y: 50 + Math.random() * 100,
                width: 20,
                height: 20,
                damage: 10
            });
        }
    }

    renderLaunchPad() {
        this.renderer.clear();
        this.renderer.drawBackground(0);
        this.renderer.drawPlane(100, 20, 0, GameState.playerData.selectedPlane);

        // 예상 궤적 그리기
        if (this.power > 0) {
            this.renderer.drawTrajectory(this.angle, this.power / 100, this.plane.stats);
        }

        if (this.isPreparing) {
            requestAnimationFrame(() => this.renderLaunchPad());
        }
    }

    launchPlane() {
        if (this.power < 10) {
            this.showNotification('파워가 너무 약합니다!');
            return;
        }

        this.isPreparing = false;
        this.isFlying = true;

        // 발사 UI 숨기기
        document.getElementById('launch-ui').classList.remove('active');

        // 초기 속도 계산
        const angleRad = (this.angle * Math.PI) / 180;
        const launchPower = (this.power / 100) * this.plane.stats.speed * 10;

        this.velocity.x = Math.cos(angleRad) * launchPower;
        this.velocity.y = -Math.sin(angleRad) * launchPower;

        // 퍼펙트 샷 보너스
        if (this.power >= 100 && this.power <= 120) {
            this.velocity.x *= 1.1;
            this.velocity.y *= 1.1;
            this.bonuses.push({ name: '완벽한 발사', value: 10 });
            this.showNotification('🎯 완벽한 발사!');
        } else if (this.power >= 120 && this.power <= 150) {
            this.velocity.x *= 1.25;
            this.velocity.y *= 1.25;
            this.bonuses.push({ name: '퍼펙트 샷', value: 25 });
            this.showNotification('⭐ 퍼펙트 샷!');
        }

        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isFlying) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.flightTime += deltaTime;

        // 물리 업데이트
        const landed = this.physics.update(
            this.plane.stats,
            this.velocity,
            this.position,
            deltaTime
        );

        // 거리 계산
        this.distance = this.position.x / 10;

        // 통계 업데이트
        const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        this.maxSpeed = Math.max(this.maxSpeed, currentSpeed);
        this.maxAltitude = Math.max(this.maxAltitude, this.position.y);

        // 장애물 충돌 체크
        this.checkObstacleCollisions();

        // UI 업데이트
        this.updateFlightUI();

        // 렌더링
        this.renderer.clear();
        this.renderer.drawBackground(this.distance);
        this.renderer.drawWindIndicator(this.wind);

        // 장애물 렌더링
        this.obstacles.forEach(obstacle => {
            this.renderer.drawObstacle(obstacle, this.distance);
        });

        // 비행기 렌더링
        const planeAngle = Math.atan2(this.velocity.y, this.velocity.x);
        this.renderer.drawPlane(
            this.canvas.width / 2,
            this.position.y,
            planeAngle,
            GameState.playerData.selectedPlane
        );

        // 착지 또는 추락 체크
        if (landed || this.durability <= 0) {
            this.endFlight();
            return;
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    checkObstacleCollisions() {
        const planeX = this.position.x;
        const planeY = this.position.y;

        this.obstacles.forEach(obstacle => {
            if (
                Math.abs(planeX - obstacle.x) < obstacle.width / 2 + 20 &&
                Math.abs(planeY - obstacle.y - obstacle.height / 2) < obstacle.height / 2 + 20
            ) {
                // 충돌!
                this.durability = Math.max(0, this.durability - obstacle.damage);
                this.showNotification(`💥 ${obstacle.type === 'tree' ? '나무' : obstacle.type === 'building' ? '건물' : '새'}에 충돌! -${obstacle.damage}% 내구도`);

                // 장애물 제거 (중복 충돌 방지)
                obstacle.x = -10000;

                // Near Miss 보너스는 충돌하지 않았을 때만
            }
        });

        // 내구도 UI 업데이트
        const durabilityFill = document.getElementById('durability-fill');
        durabilityFill.style.width = `${this.durability}%`;

        if (this.durability < 30) {
            durabilityFill.classList.add('low');
            durabilityFill.classList.remove('medium');
        } else if (this.durability < 60) {
            durabilityFill.classList.add('medium');
            durabilityFill.classList.remove('low');
        } else {
            durabilityFill.classList.remove('low', 'medium');
        }
    }

    activateBooster() {
        if (this.boosterCount > 0) {
            this.velocity.x += 20;
            this.velocity.y -= 5;
            this.boosterCount--;
            document.getElementById('booster-count').textContent = this.boosterCount;
            this.showNotification('🚀 부스터 발동!');
        }
    }

    activateAbility() {
        if (!this.abilityReady) return;

        const ability = this.plane.ability;
        if (!ability || ability.type !== 'active') return;

        switch (ability.effect) {
            case 'wind_immunity':
                this.physics.windStrength = 0;
                this.abilityReady = false;
                this.showNotification('🌪️ 바람 무시 발동!');
                setTimeout(() => {
                    this.physics.windStrength = this.wind.direction * this.wind.strength;
                    this.abilityReady = true;
                }, 5000);
                break;

            case 'ascent_burst':
                this.velocity.y -= 30;
                this.showNotification('🔥 상승 폭발!');
                break;

            case 'speed_boost':
                this.velocity.x *= 1.5;
                this.showNotification('⚡ 속도 부스트!');
                this.abilityReady = false;
                setTimeout(() => this.abilityReady = true, 10000);
                break;
        }

        document.getElementById('ability-status').textContent = this.abilityReady ? '준비됨' : '쿨다운';
        document.getElementById('ability-status').className = this.abilityReady ? 'ready' : 'cooldown';
    }

    updateFlightUI() {
        document.getElementById('current-distance').textContent = `${Math.floor(this.distance)}m`;
        document.getElementById('current-time').textContent = `${this.flightTime.toFixed(1)}s`;
        document.getElementById('current-altitude').textContent = `${Math.floor(this.position.y)}m`;
        document.getElementById('current-speed').textContent = `${Math.floor(Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2))}m/s`;
    }

    endFlight() {
        this.isFlying = false;

        // 점수 계산
        let score = 0;
        let mainValue = 0;
        let mainLabel = '';

        if (GameState.gameMode === 'distance') {
            mainValue = Math.floor(this.distance);
            mainLabel = '거리';
            score = mainValue * 10;
        } else {
            mainValue = this.flightTime.toFixed(1);
            mainLabel = '시간';
            score = Math.floor(this.flightTime * 100);
        }

        // 보너스 적용
        let bonusMultiplier = 1.0;
        this.bonuses.forEach(bonus => {
            bonusMultiplier += bonus.value / 100;
        });

        // 착지 보너스 (Fortune Flyer)
        if (GameState.playerData.selectedPlane === 'fortune' && this.durability > 0) {
            const landingBonus = Math.floor(this.distance * 0.1);
            this.bonuses.push({ name: '완벽한 착지', value: 10 });
            this.showNotification(`🍀 완벽한 착지! +${landingBonus}m`);
        }

        // 완벽한 비행 보너스
        if (this.durability === 100) {
            this.bonuses.push({ name: '완벽한 비행', value: 50 });
        }

        score = Math.floor(score * bonusMultiplier);

        // 코인 획득
        const coins = Math.floor(score / 100);
        GameState.playerData.coins += coins;

        // 최고 기록 업데이트
        if (GameState.gameMode === 'distance') {
            GameState.playerData.bestDistance = Math.max(GameState.playerData.bestDistance, Math.floor(this.distance));
        } else {
            GameState.playerData.bestDuration = Math.max(GameState.playerData.bestDuration, this.flightTime);
        }

        // 저장
        this.saveGameData();
        this.updateStatsDisplay();

        // 결과 화면 표시
        this.showResults(mainValue, mainLabel, score, coins);
    }

    showResults(mainValue, mainLabel, score, coins) {
        document.getElementById('result-main-value').textContent = mainValue;
        document.getElementById('result-main-label').textContent = mainLabel;
        document.getElementById('result-time').textContent = `${this.flightTime.toFixed(1)}s`;
        document.getElementById('result-max-altitude').textContent = `${Math.floor(this.maxAltitude)}m`;
        document.getElementById('result-max-speed').textContent = `${Math.floor(this.maxSpeed)}m/s`;

        // 보너스 표시
        const bonusContainer = document.getElementById('result-bonuses');
        bonusContainer.innerHTML = '';
        this.bonuses.forEach(bonus => {
            const bonusItem = document.createElement('div');
            bonusItem.className = 'bonus-item';
            bonusItem.innerHTML = `
                <span class="bonus-label">${bonus.name}</span>
                <span class="bonus-value">+${bonus.value}%</span>
            `;
            bonusContainer.appendChild(bonusItem);
        });

        document.getElementById('result-total-score').textContent = score;
        document.getElementById('result-coins').textContent = `+${coins}`;

        document.getElementById('result-ui').classList.add('active');
    }

    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        GameState.currentScreen = screenId;
    }
}

// ==================== UI 함수 ====================
let game = null;

function showMainMenu() {
    if (!game) game = new Game();
    game.showScreen('main-menu');
    game.updateUI();
}

function showModeSelection() {
    game.showScreen('mode-selection');
}

function showHangar() {
    game.showScreen('hangar');
    renderPlaneList();
}

function showUpgrades() {
    game.showScreen('upgrades');
    renderUpgradeList();
}

function showLeaderboard() {
    game.showScreen('leaderboard');
    renderLeaderboard('distance');
}

function showHelp() {
    game.showScreen('help');
}

function startGame(mode) {
    game.prepareFlight(mode);
}

function launchPlane() {
    game.launchPlane();
}

function restartFlight() {
    game.prepareFlight(GameState.gameMode);
}

function renderPlaneList() {
    const planeList = document.getElementById('plane-list');
    planeList.innerHTML = '';

    Object.keys(PlaneTypes).forEach(planeId => {
        const plane = PlaneTypes[planeId];
        const isUnlocked = GameState.playerData.unlockedPlanes.includes(planeId);
        const isSelected = GameState.playerData.selectedPlane === planeId;

        const card = document.createElement('div');
        card.className = `plane-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
        card.onclick = () => selectPlane(planeId);

        card.innerHTML = `
            <div class="plane-icon">${plane.icon}</div>
            <div class="plane-name">${plane.name}</div>
            <div class="plane-type">${plane.type}</div>
            <div class="plane-stats">
                <div class="plane-stat">
                    <span>속도:</span>
                    <span>${plane.stats.speed}/10</span>
                </div>
                <div class="plane-stat">
                    <span>양력:</span>
                    <span>${plane.stats.lift}/10</span>
                </div>
                <div class="plane-stat">
                    <span>내구도:</span>
                    <span>${plane.stats.durability}/10</span>
                </div>
                <div class="plane-stat">
                    <span>무게:</span>
                    <span>${plane.stats.weight.toFixed(1)}</span>
                </div>
            </div>
            ${!isUnlocked ? `<div class="unlock-price">💰 ${plane.price} 코인</div>` : ''}
            ${isSelected ? '<div style="margin-top: 10px; color: #667eea; font-weight: bold;">✓ 선택됨</div>' : ''}
        `;

        planeList.appendChild(card);
    });
}

function selectPlane(planeId) {
    const isUnlocked = GameState.playerData.unlockedPlanes.includes(planeId);

    if (!isUnlocked) {
        const plane = PlaneTypes[planeId];
        if (GameState.playerData.coins >= plane.price) {
            GameState.playerData.coins -= plane.price;
            GameState.playerData.unlockedPlanes.push(planeId);
            GameState.playerData.selectedPlane = planeId;
            game.saveGameData();
            game.updateUI();
            renderPlaneList();
            game.showNotification(`${plane.name} 구매 완료!`);
        } else {
            game.showNotification('코인이 부족합니다!');
        }
    } else {
        GameState.playerData.selectedPlane = planeId;
        game.saveGameData();
        renderPlaneList();
        game.showNotification(`${PlaneTypes[planeId].name} 선택됨`);
    }
}

function renderUpgradeList() {
    const upgradeList = document.getElementById('upgrade-list');
    upgradeList.innerHTML = '';

    Object.keys(UpgradeData).forEach(upgradeId => {
        const upgrade = UpgradeData[upgradeId];
        const currentLevel = GameState.playerData.upgrades[upgradeId];
        const nextLevel = currentLevel + 1;
        const maxLevel = upgrade.maxLevel;
        const canUpgrade = nextLevel <= maxLevel;
        const cost = canUpgrade ? upgrade.costs[currentLevel] : 0;

        const card = document.createElement('div');
        card.className = 'upgrade-card';

        card.innerHTML = `
            <div class="upgrade-header">
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-level">Lv ${currentLevel} / ${maxLevel}</div>
            </div>
            <div class="upgrade-description">${upgrade.description}</div>
            <div class="upgrade-bar">
                <div class="upgrade-fill" style="width: ${(currentLevel / maxLevel) * 100}%"></div>
            </div>
            <div class="upgrade-footer">
                <div class="upgrade-price">${canUpgrade ? `💰 ${cost}` : '최대 레벨'}</div>
                <button class="upgrade-btn" ${!canUpgrade || GameState.playerData.coins < cost ? 'disabled' : ''}
                    onclick="purchaseUpgrade('${upgradeId}')">
                    ${canUpgrade ? '업그레이드' : '완료'}
                </button>
            </div>
        `;

        upgradeList.appendChild(card);
    });
}

function purchaseUpgrade(upgradeId) {
    const upgrade = UpgradeData[upgradeId];
    const currentLevel = GameState.playerData.upgrades[upgradeId];
    const cost = upgrade.costs[currentLevel];

    if (GameState.playerData.coins >= cost && currentLevel < upgrade.maxLevel) {
        GameState.playerData.coins -= cost;
        GameState.playerData.upgrades[upgradeId]++;
        game.saveGameData();
        game.updateUI();
        renderUpgradeList();
        game.showNotification(`${upgrade.name} 업그레이드 완료!`);
    } else {
        game.showNotification('코인이 부족하거나 최대 레벨입니다!');
    }
}

function showLeaderboardTab(mode) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderLeaderboard(mode);
}

function renderLeaderboard(mode) {
    const content = document.getElementById('leaderboard-content');

    // 임시 리더보드 데이터
    const leaderboardData = [
        { rank: 1, name: '플레이어1', score: mode === 'distance' ? '1250m' : '45.2s' },
        { rank: 2, name: '플레이어2', score: mode === 'distance' ? '1100m' : '42.8s' },
        { rank: 3, name: '플레이어3', score: mode === 'distance' ? '980m' : '38.5s' },
        { rank: 4, name: '당신', score: mode === 'distance' ? `${GameState.playerData.bestDistance}m` : `${GameState.playerData.bestDuration.toFixed(1)}s` },
        { rank: 5, name: '플레이어5', score: mode === 'distance' ? '750m' : '30.1s' }
    ];

    content.innerHTML = `
        <ul class="leaderboard-list">
            ${leaderboardData.map(item => `
                <li class="leaderboard-item ${item.name === '당신' ? 'highlight' : ''}">
                    <span class="leaderboard-rank">#${item.rank}</span>
                    <span class="leaderboard-name">${item.name}</span>
                    <span class="leaderboard-score">${item.score}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

// ==================== 초기화 ====================
window.addEventListener('load', () => {
    game = new Game();
    showMainMenu();
});
