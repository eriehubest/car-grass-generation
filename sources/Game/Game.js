import * as THREE from 'three/webgpu';

import { Debug } from './Debug';
import { ResourcesLoader } from './ResourcesLoader';
import { Quality } from './Quality';
import { Ticker } from './Ticker';
import { Time } from './Time';
import { Inputs } from './Inputs';
import { Viewport } from './Viewport';
import { Rendering } from './Rendering';
import { Respawns } from './Respawns';
import { View } from './View';
import { Physics } from './Physics.js';
import { Vehicle } from './Vehicle.js';
// import { Grass } from './Grass.js';
import { Grid } from './Grid.js';
import { World } from './World.js';
import { MobileGrassPlane } from './MobileGrassPlane.js';

export class Game {
    static getInstance() {
        return Game.instance;
    }

    constructor() {
        if (Game.instance)
            return Game.instance;

        Game.instance = this;
        this.init().catch((error) => {
            console.error(error);
            this.showLoadingError();
        });
    }

    async init() {
        this.domElement = document.querySelector('.game');
        this.canvasElement = this.domElement.querySelector('.js-canvas');
        this.loadingElement = document.querySelector('.loading-screen');
        this.loadingFillElement = this.loadingElement?.querySelector('.loading-screen__fill');
        this.loadingStatusElement = this.loadingElement?.querySelector('.loading-screen__status');
        this.loadingPercentageElement = this.loadingElement?.querySelector('.loading-screen__percentage');
        this.loadingProgress = 0;
        this.loadingTargetProgress = 0;
        this.loadingAnimationFrame = null;
        this.startLoadingProgressAnimation();

        // initialization
        this.scene = new THREE.Scene();
        this.debug = new Debug();
        this.resourceLoader = new ResourcesLoader();
        this.quality = new Quality();
        this.ticker = new Ticker();
        this.time = new Time();
        this.inputs = new Inputs([
            { name: 'forward', categories: [], keys: ['Keyboard.KeyW', 'Keyboard.ArrowUp'] },
            { name: 'backward', categories: [], keys: ['Keyboard.KeyS', 'Keyboard.ArrowDown'] },
            { name: 'left', categories: [], keys: ['Keyboard.KeyA', 'Keyboard.ArrowLeft'] },
            { name: 'right', categories: [], keys: ['Keyboard.KeyD', 'Keyboard.ArrowRight'] },
            { name: 'brake', categories: [], keys: ['Keyboard.Space'] },
            { name: 'boost', categories: [], keys: ['Keyboard.ShiftLeft', 'Keyboard.ShiftRight', 'Keyboard.Shift'] },
            { name: 'jump', categories: [], keys: ['Keyboard.Space'] },
            { name: 'pause', categories: [], keys: ['Keyboard.KeyP]'] }
        ], [])
        this.viewport = new Viewport(this.domElement);

        this.rendering = new Rendering();
        await this.rendering.setRenderer();

        this.RAPIER = await import('@dimforge/rapier3d')

        this.setLoadingTargetProgress(0)

        this.resources = await this.resourceLoader.load([
            ['respawnsReferencesModel', 'respawns/respawnsReferences-compressed.glb', 'gltf'],
            ['vehicleModel', 'vehicle/default-compressed.glb', 'gltf',],

        ],
            (_toLoad, _total) => {
                const loaded = _total - _toLoad;
                this.setLoadingTargetProgress(loaded / _total);
            }
        )

        this.setLoadingTargetProgress(1)
        await this.waitForLoadingProgress(1)

        this.respawns = new Respawns(import.meta.env.VITE_PLAYER_SPAWN || 'landing')
        this.scene.background = null
        this.physics = new Physics()
        this.setPauseInput()

        this.grid = new Grid();

        this.world = new World()
        this.view = new View();
        this.vehicle = new Vehicle(this.resources.vehicleModel)

        this.world.setViewChange()
        // this.grass = new Grass()
        this.grass = new MobileGrassPlane()
        this.rendering.setPostprocessing();
        this.rendering.start()
        await this.hideLoadingScreen()
    }

    startLoadingProgressAnimation()
    {
        const update = () =>
        {
            const difference = this.loadingTargetProgress - this.loadingProgress;

            if(Math.abs(difference) < 0.001)
                this.loadingProgress = this.loadingTargetProgress;
            else
                this.loadingProgress += difference * 0.12;

            this.renderLoadingProgress(this.loadingProgress);
            this.loadingAnimationFrame = requestAnimationFrame(update);
        };

        update();
    }

    setLoadingTargetProgress(_progress)
    {
        this.loadingTargetProgress = THREE.MathUtils.clamp(_progress, 0, 1);
    }

    renderLoadingProgress(_progress)
    {
        const progress = THREE.MathUtils.clamp(_progress, 0, 1);
        const percentage = Math.round(progress * 100);

        if(this.loadingFillElement)
            this.loadingFillElement.style.transform = `scaleX(${progress})`;

        if(this.loadingPercentageElement)
            this.loadingPercentageElement.textContent = `${percentage}%`;

        if(this.loadingStatusElement)
            this.loadingStatusElement.textContent = progress < 1 ? `Loading ${percentage}%` : 'Ready';
    }

    waitForLoadingProgress(_target)
    {
        return new Promise((resolve) => {
            const check = () =>
            {
                if(this.loadingProgress >= _target - 0.001)
                {
                    resolve();
                    return;
                }

                requestAnimationFrame(check);
            };

            check();
        });
    }

    hideLoadingScreen()
    {
        if(!this.loadingElement)
            return Promise.resolve();

        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.loadingElement.classList.add('is-hidden');
                    setTimeout(() => {
                        if(this.loadingAnimationFrame !== null)
                        {
                            cancelAnimationFrame(this.loadingAnimationFrame);
                            this.loadingAnimationFrame = null;
                        }

                        resolve();
                    }, 700);
                });
            });
        });
    }

    showLoadingError()
    {
        if(this.loadingAnimationFrame !== null)
            cancelAnimationFrame(this.loadingAnimationFrame);

        if(this.loadingStatusElement)
            this.loadingStatusElement.textContent = 'Load Failed';

        if(this.loadingPercentageElement)
            this.loadingPercentageElement.textContent = 'Error';
    }

    setPauseInput() {
        addEventListener('keydown', (event) => {
            if (event.code === 'KeyP' && !event.repeat)
                this.physics.togglePause()
        })
    }
}
