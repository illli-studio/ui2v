/**
 */

export interface LibraryInfo {
  name: string;
  version: string;
  loaded: boolean;
  instance: any;
}

export class LibraryManager {
  private libraries: Map<string, LibraryInfo> = new Map();
  private loadPromises: Map<string, Promise<any>> = new Map();

  /**
   * Helper to timeout imports
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
      return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
              reject(new Error(`Library load timed out: ${name}`));
          }, ms);
          promise
            .then(res => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
      });
  }

  /**
   */
  async preloadAll(): Promise<void> {
    // [FIX] Use safe execution to prevent one library failure from blocking everything
    const promises = [
      this.loadAnime(),
      this.loadThree(),
      this.loadMatter(),
      this.loadEmotion(),
      this.loadKatex(),
      this.loadMathjs(),
      this.loadD3(),
      this.loadGSAP(),
      this.loadP5(),
      this.loadFabric(),
      this.loadRough(),
      this.loadPixi(),
      this.loadTween(),
      this.loadPaper(),
      this.loadKonva(),
      this.loadLottie(),
      this.loadIconify(),
      this.loadGlobeGL(),
      this.loadTsParticles(),
      this.loadCannon(),
      this.loadPostProcessing(),
      this.loadOpentype(),
      this.loadSimplexNoise(),
      this.loadSplitType(),
      this.loadHtml2Canvas(),
      this.loadMediabunny()
    ];
    
    // We wait for all to finish, regardless of success or failure
    await Promise.all(promises.map(p => p.catch(e => {
        console.warn('[LibraryManager] Preload partial failure:', e);
        return null;
    })));
  }

  async preloadDependencies(dependencies: string[]): Promise<void> {
    const normalized = Array.from(new Set(dependencies.map(name => this.normalizeLibraryName(name)).filter(Boolean)));
    await Promise.all(normalized.map(name => this.loadByName(name).catch(error => {
      console.warn(`[LibraryManager] Failed to preload dependency "${name}":`, error);
      return null;
    })));
  }

  private normalizeLibraryName(name: string): string {
    const key = name.trim().toLowerCase();
    const aliases: Record<string, string> = {
      anime: 'anime',
      animejs: 'anime',
      'anime.js': 'anime',
      three: 'THREE',
      threejs: 'THREE',
      'three.js': 'THREE',
      matter: 'Matter',
      matterjs: 'Matter',
      'matter-js': 'Matter',
      emotion: 'emotion',
      katex: 'katex',
      math: 'math',
      mathjs: 'math',
      'math.js': 'math',
      d3: 'd3',
      gsap: 'gsap',
      p5: 'p5',
      p5js: 'p5',
      fabric: 'fabric',
      fabricjs: 'fabric',
      rough: 'rough',
      roughjs: 'rough',
      pixi: 'PIXI',
      pixijs: 'PIXI',
      'pixi.js': 'PIXI',
      tween: 'TWEEN',
      tweenjs: 'TWEEN',
      '@tweenjs/tween.js': 'TWEEN',
      paper: 'paper',
      paperjs: 'paper',
      konva: 'Konva',
      lottie: 'lottie',
      'lottie-web': 'lottie',
      iconify: 'iconify',
      globe: 'Globe',
      'globe.gl': 'Globe',
      tsparticles: 'tsParticles',
      particles: 'tsParticles',
      cannon: 'CANNON',
      'cannon-es': 'CANNON',
      postprocessing: 'POSTPROCESSING',
      opentype: 'opentype',
      'opentype.js': 'opentype',
      simplex: 'simplex',
      'simplex-noise': 'simplex',
      splittype: 'SplitType',
      'split-type': 'SplitType',
      html2canvas: 'html2canvas',
      mediabunny: 'mediabunny',
    };

    return aliases[key] ?? name;
  }

  private async loadByName(name: string): Promise<any> {
    switch (name) {
      case 'anime': return this.loadAnime();
      case 'THREE': return this.loadThree();
      case 'Matter': return this.loadMatter();
      case 'emotion': return this.loadEmotion();
      case 'katex': return this.loadKatex();
      case 'math': return this.loadMathjs();
      case 'd3': return this.loadD3();
      case 'gsap': return this.loadGSAP();
      case 'p5': return this.loadP5();
      case 'fabric': return this.loadFabric();
      case 'rough': return this.loadRough();
      case 'PIXI': return this.loadPixi();
      case 'TWEEN': return this.loadTween();
      case 'paper': return this.loadPaper();
      case 'Konva': return this.loadKonva();
      case 'lottie': return this.loadLottie();
      case 'iconify': return this.loadIconify();
      case 'Globe': return this.loadGlobeGL();
      case 'tsParticles': return this.loadTsParticles();
      case 'CANNON': return this.loadCannon();
      case 'POSTPROCESSING': return this.loadPostProcessing();
      case 'opentype': return this.loadOpentype();
      case 'simplex': return this.loadSimplexNoise();
      case 'SplitType': return this.loadSplitType();
      case 'html2canvas': return this.loadHtml2Canvas();
      case 'mediabunny': return this.loadMediabunny();
      default:
        console.warn(`[LibraryManager] Unknown dependency "${name}"`);
        return null;
    }
  }

  /**
   */
  async loadAnime(): Promise<any> {
    if (this.libraries.has('anime')) {
      return this.libraries.get('anime')!.instance;
    }

    if (this.loadPromises.has('anime')) {
      return this.loadPromises.get('anime');
    }

    const loadPromise = (async () => {
      try {
        const animeModule = await import('animejs');

        // anime.js v4 uses named exports — expose the full module as the instance
        // so sandbox code can destructure: const { animate, createTimeline, stagger } = anime;
        // or use directly: animate(...), createTimeline(), stagger()
        const instance = animeModule;

        this.libraries.set('anime', {
          name: 'anime.js',
          version: '4.x',
          loaded: true,
          instance
        });

        return instance;
      } catch (error) {
        console.error('❌ anime.js load failed:', error);
        this.libraries.set('anime', {
          name: 'anime.js',
          version: '4.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('anime', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadThree(): Promise<any> {
    if (this.libraries.has('THREE')) {
      return this.libraries.get('THREE')!.instance;
    }

    if (this.loadPromises.has('THREE')) {
      return this.loadPromises.get('THREE');
    }

    const loadPromise = (async () => {
      try {
        const THREEModule: any = await import('three');
        const THREE = THREEModule.default || THREEModule;

        this.libraries.set('THREE', {
          name: 'Three.js',
          version: '0.x',
          loaded: true,
          instance: THREE
        });

        return THREE;
      } catch (error) {
        // console.error('❌ Three.js load failed:', error);
        this.libraries.set('THREE', {
          name: 'Three.js',
          version: '0.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('THREE', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadMatter(): Promise<any> {
    if (this.libraries.has('Matter')) {
      return this.libraries.get('Matter')!.instance;
    }

    if (this.loadPromises.has('Matter')) {
      return this.loadPromises.get('Matter');
    }

    const loadPromise = (async () => {
      try {
        const MatterModule: any = await import('matter-js');
        const Matter = MatterModule.default || MatterModule;

        this.libraries.set('Matter', {
          name: 'Matter.js',
          version: '0.x',
          loaded: true,
          instance: Matter
        });

        return Matter;
      } catch (error) {
        // console.error('❌ Matter.js load failed:', error);
        this.libraries.set('Matter', {
          name: 'Matter.js',
          version: '0.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('Matter', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadEmotion(): Promise<any> {
    if (this.libraries.has('emotion')) {
      return this.libraries.get('emotion')!.instance;
    }

    if (this.loadPromises.has('emotion')) {
      return this.loadPromises.get('emotion');
    }

    const loadPromise = (async () => {
      try {
        const emotion = await import('@emotion/css');

        this.libraries.set('emotion', {
          name: 'Emotion',
          version: '11.x',
          loaded: true,
          instance: emotion
        });

        return emotion;
      } catch (error) {
        // console.error('❌ Emotion load failed:', error);
        this.libraries.set('emotion', {
          name: 'Emotion',
          version: '11.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('emotion', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadKatex(): Promise<any> {
    if (this.libraries.has('katex')) {
      return this.libraries.get('katex')!.instance;
    }

    if (this.loadPromises.has('katex')) {
      return this.loadPromises.get('katex');
    }

    const loadPromise = (async () => {
      try {
        const katex = await import('katex');

        this.libraries.set('katex', {
          name: 'KaTeX',
          version: '0.x',
          loaded: true,
          instance: katex
        });

        return katex;
      } catch (error) {
        // console.error('❌ KaTeX load failed:', error);
        this.libraries.set('katex', {
          name: 'KaTeX',
          version: '0.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('katex', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadMathjs(): Promise<any> {
    if (this.libraries.has('math')) {
      return this.libraries.get('math')!.instance;
    }

    if (this.loadPromises.has('math')) {
      return this.loadPromises.get('math');
    }

    const loadPromise = (async () => {
      try {
        const mathModule: any = await import('mathjs');
        
        // mathjs v10+ usually requires create(all) to get an instance like the AI expects
        let math: any;
        if (typeof mathModule.create === 'function') {
          math = mathModule.create(mathModule.all || {});
        } else if (mathModule.default && typeof mathModule.default.create === 'function') {
          math = mathModule.default.create(mathModule.default.all || {});
        } else {
          math = mathModule.default || mathModule;
        }

        // [FIX] Add fibonacci helper as AI often hallucinates this function
        if (math && !math.fibonacci) {
          math.fibonacci = (n: number) => {
            if (n < 0) return [];
            const result = [0, 1];
            if (n === 0) return [0];
            if (n === 1) return [0, 1];
            for (let i = 2; i <= n; i++) {
              result.push(result[i - 1] + result[i - 2]);
            }
            return result.slice(0, n + 1);
          };
          // Also alias to 'fib'
          math.fib = math.fibonacci;
        }

        this.libraries.set('math', {
          name: 'Math.js',
          version: '12.x',
          loaded: true,
          instance: math
        });

        return math;
      } catch (error) {
        // console.error('❌ Math.js load failed:', error);
        this.libraries.set('math', {
          name: 'Math.js',
          version: '12.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('math', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadD3(): Promise<any> {
    if (this.libraries.has('d3')) {
      return this.libraries.get('d3')!.instance;
    }

    if (this.loadPromises.has('d3')) {
      return this.loadPromises.get('d3');
    }

    const loadPromise = (async () => {
      try {
        const d3Module = await import('d3');
        const d3 = d3Module.default || d3Module;

        this.libraries.set('d3', {
          name: 'D3.js',
          version: '7.x',
          loaded: true,
          instance: d3
        });

        return d3;
      } catch (error) {
        // console.error('Failed to load D3.js:', error);
        this.libraries.set('d3', {
          name: 'D3.js',
          version: '7.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('d3', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadGSAP(): Promise<any> {
    if (this.libraries.has('gsap')) {
      return this.libraries.get('gsap')!.instance;
    }

    if (this.loadPromises.has('gsap')) {
      return this.loadPromises.get('gsap');
    }

    const loadPromise = (async () => {
      try {
        const gsapModule = await import('gsap');
        const gsapLib = gsapModule.default || gsapModule;

        this.libraries.set('gsap', {
          name: 'GSAP',
          version: '3.x',
          loaded: true,
          instance: gsapLib
        });

        return gsapLib;
      } catch (error) {
        // console.error('Failed to load GSAP:', error);
        this.libraries.set('gsap', {
          name: 'GSAP',
          version: '3.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('gsap', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadP5(): Promise<any> {
    if (this.libraries.has('p5')) {
      return this.libraries.get('p5')!.instance;
    }

    if (this.loadPromises.has('p5')) {
      return this.loadPromises.get('p5');
    }

    const loadPromise = (async () => {
      try {
        const p5Module: any = await import('p5');
        const p5 = p5Module.default || p5Module;

        this.libraries.set('p5', {
          name: 'P5.js',
          version: '1.x',
          loaded: true,
          instance: p5
        });

        return p5;
      } catch (error) {
        // console.error('❌ P5.js load failed:', error);
        this.libraries.set('p5', {
          name: 'P5.js',
          version: '1.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('p5', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadFabric(): Promise<any> {
    if (this.libraries.has('fabric')) {
      return this.libraries.get('fabric')!.instance;
    }

    if (this.loadPromises.has('fabric')) {
      return this.loadPromises.get('fabric');
    }

    const loadPromise = (async () => {
      try {
        const fabricModule = await import('fabric');
        const fabric = fabricModule.default || fabricModule;

        this.libraries.set('fabric', {
          name: 'Fabric.js',
          version: '6.x',
          loaded: true,
          instance: fabric
        });

        return fabric;
      } catch (error) {
        // console.error('Failed to load Fabric.js:', error);
        this.libraries.set('fabric', {
          name: 'Fabric.js',
          version: '6.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('fabric', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadRough(): Promise<any> {
    if (this.libraries.has('rough')) {
      return this.libraries.get('rough')!.instance;
    }

    if (this.loadPromises.has('rough')) {
      return this.loadPromises.get('rough');
    }

    const loadPromise = (async () => {
      try {
        const roughModule: any = await import('roughjs');
        const rough = roughModule.default || roughModule;

        this.libraries.set('rough', {
          name: 'Rough.js',
          version: '4.x',
          loaded: true,
          instance: rough
        });

        return rough.default || rough;
      } catch (error) {
        // console.error('❌ Rough.js load failed:', error);
        this.libraries.set('rough', {
          name: 'Rough.js',
          version: '4.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('rough', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadPixi(): Promise<any> {
    if (this.libraries.has('PIXI')) {
      return this.libraries.get('PIXI')!.instance;
    }

    if (this.loadPromises.has('PIXI')) {
      return this.loadPromises.get('PIXI');
    }

    const loadPromise = (async () => {
      try {
        const PIXIModule = await import('pixi.js');
        const PIXI = PIXIModule.default || PIXIModule;

        this.libraries.set('PIXI', {
          name: 'PixiJS',
          version: '8.x',
          loaded: true,
          instance: PIXI
        });

        return PIXI;
      } catch (error) {
        // console.error('❌ PixiJS load failed:', error);
        this.libraries.set('PIXI', {
          name: 'PixiJS',
          version: '8.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('PIXI', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadTween(): Promise<any> {
    if (this.libraries.has('TWEEN')) {
      return this.libraries.get('TWEEN')!.instance;
    }

    if (this.loadPromises.has('TWEEN')) {
      return this.loadPromises.get('TWEEN');
    }

    const loadPromise = (async () => {
      try {
        const tweenModule = await import('@tweenjs/tween.js');
        const TWEEN = tweenModule.default || tweenModule;

        this.libraries.set('TWEEN', {
          name: 'Tween.js',
          version: '23.x',
          loaded: true,
          instance: TWEEN
        });

        return TWEEN;
      } catch (error) {
        // console.error('❌ Tween.js load failed:', error);
        this.libraries.set('TWEEN', {
          name: 'Tween.js',
          version: '23.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('TWEEN', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadPaper(): Promise<any> {
    if (this.libraries.has('paper')) {
      return this.libraries.get('paper')!.instance;
    }

    if (this.loadPromises.has('paper')) {
      return this.loadPromises.get('paper');
    }

    const loadPromise = (async () => {
      try {
        const paperModule = await import('paper');
        const paper = paperModule.default || paperModule;

        this.libraries.set('paper', {
          name: 'Paper.js',
          version: '0.12.x',
          loaded: true,
          instance: paper
        });

        return paper;
      } catch (error) {
        // console.error('❌ Paper.js load failed:', error);
        this.libraries.set('paper', {
          name: 'Paper.js',
          version: '0.12.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('paper', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadKonva(): Promise<any> {
    if (this.libraries.has('Konva')) {
      return this.libraries.get('Konva')!.instance;
    }

    if (this.loadPromises.has('Konva')) {
      return this.loadPromises.get('Konva');
    }

    const loadPromise = (async () => {
      try {
        const Konva = await import('konva');
        const instance = Konva.default || Konva;

        this.libraries.set('Konva', {
          name: 'Konva',
          version: '9.x',
          loaded: true,
          instance
        });

        return instance;
      } catch (error) {
        // console.error('❌ Konva load failed:', error);
        this.libraries.set('Konva', {
          name: 'Konva',
          version: '9.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('Konva', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadLottie(): Promise<any> {
    if (this.libraries.has('lottie')) {
      return this.libraries.get('lottie')!.instance;
    }

    if (this.loadPromises.has('lottie')) {
      return this.loadPromises.get('lottie');
    }

    const loadPromise = (async () => {
      try {
        const lottie = await import('lottie-web');
        const instance = lottie.default || lottie;

        this.libraries.set('lottie', {
          name: 'Lottie-web',
          version: '5.x',
          loaded: true,
          instance
        });

        return instance;
      } catch (error) {
        // console.error('❌ Lottie-web load failed:', error);
        this.libraries.set('lottie', {
          name: 'Lottie-web',
          version: '5.x',
          loaded: false,
          instance: null
        });
        return null;
      }
    })();

    this.loadPromises.set('lottie', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadIconify(): Promise<any> {
    if (this.libraries.has('iconify')) {
      return this.libraries.get('iconify')!.instance;
    }

    if (this.loadPromises.has('iconify')) {
      return this.loadPromises.get('iconify');
    }

    const loadPromise = (async () => {
      try {
        const [iconifyModule, iconifyIconModule] = await Promise.all([
          // @ts-ignore
          import('@iconify/iconify'),
          // @ts-ignore
          import('iconify-icon')
        ]);
        const utilsModule: any = await import('@iconify/utils');
        const mdiCollection: any = await import('@iconify-json/mdi/icons.json');
        const core = iconifyModule.default || iconifyModule;
        const webComponent: any = iconifyIconModule.default || iconifyIconModule;
        const mdi = mdiCollection.default || mdiCollection;
        const instance = {
          ...core,
          getIconData: utilsModule.getIconData,
          iconToSVG: utilsModule.iconToSVG,
          replaceIDs: utilsModule.replaceIDs,
          iconToHTML: utilsModule.iconToHTML,
          collections: { mdi },
          getOfflineIcon: (name: string) => {
            const [prefix, iconName] = String(name).split(':');
            if (prefix !== 'mdi' || !iconName) return null;
            const iconData = utilsModule.getIconData(mdi, iconName);
            if (!iconData) return null;
            const renderData = utilsModule.iconToSVG(iconData, {
              height: '1em',
              width: '1em',
            });
            const body = utilsModule.replaceIDs(renderData.body);
            return utilsModule.iconToHTML(body, renderData.attributes);
          },
          webComponent,
          IconifyIcon: webComponent?.IconifyIcon || webComponent?.IconifyIconHTMLElement,
        };

        this.libraries.set('iconify', {
          name: 'Iconify',
          version: '3.x',
          loaded: true,
          instance
        });

        return instance;
      } catch (error) {
        // console.warn('⚠️ Iconify loaded failed (fallback):', error);
        try {
          // Fallback: iconify-icon (modern web component)
          // @ts-ignore
          const iconifyCore = await import('iconify-icon');
          const instance = iconifyCore.default || iconifyCore;

          this.libraries.set('iconify', {
            name: 'Iconify',
            version: '2.x',
            loaded: true,
            instance
          });
          return instance;
        } catch (e2) {
          // console.error('❌ Iconify failed completely');
          this.libraries.set('iconify', {
            name: 'Iconify',
            version: '0.x',
            loaded: false,
            instance: null
          });
          return null;
        }
      }
    })();

    this.loadPromises.set('iconify', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadGlobeGL(): Promise<any> {
    if (this.libraries.has('Globe')) {
      return this.libraries.get('Globe')!.instance;
    }

    if (this.loadPromises.has('Globe')) {
      return this.loadPromises.get('Globe');
    }

    const loadPromise = (async () => {
      try {
        const globeModule = await this.withTimeout(import('globe.gl'), 15000, 'globe.gl');
        const instance = globeModule.default || globeModule;

        this.libraries.set('Globe', {
          name: 'Globe.gl',
          version: '2.x',
          loaded: true,
          instance
        });

        return instance;
      } catch (error) {
        console.warn('❌ Globe.gl load failed:', error);
        return null;
      }
    })();

    this.loadPromises.set('Globe', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadTsParticles(): Promise<any> {
    if (this.libraries.has('tsParticles')) {
      return this.libraries.get('tsParticles')!.instance;
    }

    if (this.loadPromises.has('tsParticles')) {
      return this.loadPromises.get('tsParticles');
    }

    const loadPromise = (async () => {
      try {
        // [tsParticles v3 Exact Loading Sequence]
        // 1. Get the singleton Engine from @tsparticles/engine
        //    We MUST use this package because 'tsparticles' bundle does NOT export the engine singleton.
        let engine: any;
        try {
            // @ts-ignore
            const engineModule = await import('@tsparticles/engine');
            engine = engineModule.tsParticles; // This is the const tsParticles = init();
        } catch (e) {
            console.warn('❌ Could not import @tsparticles/engine', e);
        }

        // 2. Get the plugin loader from 'tsparticles' bundle
        // @ts-ignore
        const bundleModule = await import('tsparticles');
        const loadFull = bundleModule.loadFull;

        if (!engine) {
            // Fallback: check window if previous load worked or script tag exists
            if (typeof window !== 'undefined' && (window as any).tsParticles) {
                engine = (window as any).tsParticles;
            }
        }

        if (!engine) {
            console.error('❌ tsParticles Engine not found via import or window!');
            return null;
        }

        // 3. Initialize plugins
        if (typeof loadFull === 'function') {
            await loadFull(engine);
        }

        // 4. [CRITICAL] Verify .load() exists. 
        // In v3, engine.load() SHOULD satisfy: load(id: string | IOptions, options?: IOptions)
        if (typeof engine.load !== 'function') {
             console.error('❌ tsParticles Engine found but .load() is missing!', Object.keys(engine));
             // Should not happen if it's the real Engine.
        }

        this.libraries.set('tsParticles', {
          name: 'tsParticles',
          version: '3.x',
          loaded: true,
          instance: engine
        });

        return engine;
      } catch (error) {
        console.warn('❌ tsparticles load failed:', error);
        return null;
      }
    })();

    this.loadPromises.set('tsParticles', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadCannon(): Promise<any> {
    if (this.libraries.has('CANNON')) {
      return this.libraries.get('CANNON')!.instance;
    }

    if (this.loadPromises.has('CANNON')) {
      return this.loadPromises.get('CANNON');
    }

    const loadPromise = (async () => {
      try {
        // @ts-ignore
        const cannonModule = await import('cannon-es');
        // cannon-es usually exports everything as named exports
        const instance = cannonModule;

        this.libraries.set('CANNON', {
          name: 'cannon-es',
          version: '0.x',
          loaded: true,
          instance
        });
        return instance;
      } catch (error) {
        console.warn('❌ Cannon-es load failed:', error);
        return null;
      }
    })();

    this.loadPromises.set('CANNON', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadPostProcessing(): Promise<any> {
    if (this.libraries.has('POSTPROCESSING')) {
      return this.libraries.get('POSTPROCESSING')!.instance;
    }
    
    if (this.loadPromises.has('POSTPROCESSING')) {
        return this.loadPromises.get('POSTPROCESSING');
    }

    const loadPromise = (async () => {
        try {
            // @ts-ignore
            const ppModule = await import('postprocessing');
            const instance = ppModule;

            this.libraries.set('POSTPROCESSING', {
                name: 'postprocessing',
                version: '6.x',
                loaded: true,
                instance
            });
            return instance;
        } catch (error) {
            console.warn('❌ Postprocessing load failed:', error);
            return null;
        }
    })();

    this.loadPromises.set('POSTPROCESSING', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadOpentype(): Promise<any> {
    if (this.libraries.has('opentype')) {
      return this.libraries.get('opentype')!.instance;
    }
    
    if (this.loadPromises.has('opentype')) {
        return this.loadPromises.get('opentype');
    }

    const loadPromise = (async () => {
        try {
            // @ts-ignore
            const opentypeModule = await this.withTimeout(import('opentype.js'), 15000, 'opentype.js');
            // opentype.js often exports default
            const instance = opentypeModule.default || opentypeModule;

            this.libraries.set('opentype', {
                name: 'opentype.js',
                version: '1.x',
                loaded: true,
                instance
            });
            return instance;
        } catch (error) {
            console.warn('❌ opentype.js load failed:', error);
            return null;
        }
    })();

    this.loadPromises.set('opentype', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadSimplexNoise(): Promise<any> {
    if (this.libraries.has('simplex')) {
      return this.libraries.get('simplex')!.instance;
    }
    
    if (this.loadPromises.has('simplex')) {
        return this.loadPromises.get('simplex');
    }

    const loadPromise = (async () => {
        try {
            // simplex-noise 4.x exports { createNoise2D, ... }
            const simplexModule = await this.withTimeout(import('simplex-noise'), 10000, 'simplex-noise');
            const instance = simplexModule;

            this.libraries.set('simplex', {
                name: 'simplex-noise',
                version: '4.x',
                loaded: true,
                instance
            });
            return instance;
        } catch (error) {
            console.warn('❌ simplex-noise load failed:', error);
            return null;
        }
    })();

    this.loadPromises.set('simplex', loadPromise);
    return loadPromise;
  }

  /**
   */
  async loadSplitType(): Promise<any> {
    if (this.libraries.has('SplitType')) {
      return this.libraries.get('SplitType')!.instance;
    }
    
    if (this.loadPromises.has('SplitType')) {
        return this.loadPromises.get('SplitType');
    }

    const loadPromise = (async () => {
        try {
            const splitTypeModule = await this.withTimeout(import('split-type'), 15000, 'split-type');
            const instance = splitTypeModule.default || splitTypeModule;

            this.libraries.set('SplitType', {
                name: 'SplitType',
                version: '0.x',
                loaded: true,
                instance
            });
            return instance;
        } catch (error) {
            console.warn('❌ SplitType load failed:', error);
            return null;
        }
    })();

    this.loadPromises.set('SplitType', loadPromise);
    return loadPromise;
  }

  async loadHtml2Canvas(): Promise<any> {
    if (this.libraries.has('html2canvas')) {
      return this.libraries.get('html2canvas')!.instance;
    }

    if (this.loadPromises.has('html2canvas')) {
      return this.loadPromises.get('html2canvas');
    }

    const loadPromise = (async () => {
      try {
        const html2canvasModule = await this.withTimeout(import('html2canvas'), 15000, 'html2canvas');
        const instance = html2canvasModule.default || html2canvasModule;

        this.libraries.set('html2canvas', {
          name: 'html2canvas',
          version: '1.x',
          loaded: true,
          instance
        });
        return instance;
      } catch (error) {
        console.warn('鉂?html2canvas load failed:', error);
        return null;
      }
    })();

    this.loadPromises.set('html2canvas', loadPromise);
    return loadPromise;
  }

  async loadMediabunny(): Promise<any> {
    if (this.libraries.has('mediabunny')) {
      return this.libraries.get('mediabunny')!.instance;
    }

    if (this.loadPromises.has('mediabunny')) {
      return this.loadPromises.get('mediabunny');
    }

    const loadPromise = (async () => {
      try {
        const mediabunnyModule: any = await this.withTimeout(import('mediabunny'), 15000, 'mediabunny');
        const instance = mediabunnyModule.default || mediabunnyModule;

        this.libraries.set('mediabunny', {
          name: 'mediabunny',
          version: '1.x',
          loaded: true,
          instance
        });
        return instance;
      } catch (error) {
        console.warn('鉂?mediabunny load failed:', error);
        return null;
      }
    })();

    this.loadPromises.set('mediabunny', loadPromise);
    return loadPromise;
  }

  /**
   */
  getLibrary(name: string): any {
    const lib = this.libraries.get(name);
    return lib?.loaded ? lib.instance : null;
  }

  /**
   */
  getAllLibraries(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, info] of this.libraries.entries()) {
      if (info.loaded) {
        result[name] = info.instance;
      }
    }

    return result;
  }

  /**
   */
  isLoaded(name: string): boolean {
    const lib = this.libraries.get(name);
    return lib ? lib.loaded : false;
  }

  /**
   */
  getLibraryInfo(name: string): LibraryInfo | null {
    return this.libraries.get(name) || null;
  }

  /**
   */
  getAllLibraryInfo(): LibraryInfo[] {
    return Array.from(this.libraries.values());
  }

  /**
   */
  createSafeProxy(libraryName: string): any {
    const library = this.getLibrary(libraryName);

    if (!library) {
      return undefined;
    }

    return new Proxy(library, {
      set() {
        return false;
      },
      deleteProperty() {
        return false;
      },
      defineProperty() {
        return false;
      }
    });
  }

  /**
   */
  dispose(): void {
    this.libraries.clear();
    this.loadPromises.clear();
  }
}

let instance: LibraryManager | null = null;

export function getLibraryManager(): LibraryManager {
  if (!instance) {
    instance = new LibraryManager();
  }
  return instance;
}
