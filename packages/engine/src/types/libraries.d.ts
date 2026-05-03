
// ============================================================================
// ============================================================================
declare module 'roughjs' { const rough: any; export = rough; }
declare module 'paper' { const paper: any; export = paper; }
declare module 'animejs' {
  export const animate: any;
  export const createTimeline: any;
  export const createAnimatable: any;
  export const createTimer: any;
  export const createSpring: any;
  export const stagger: any;
  export const utils: any;
  export const svg: any;
  export const eases: any;
  export const engine: any;
  export const Timeline: any;
  export const JSAnimation: any;
}
declare module 'matter-js' { const Matter: any; export = Matter; }
declare module 'chart.js' { const Chart: any; export = Chart; }
declare module 'tweenjs' { const tweenjs: any; export = tweenjs; }
declare module 'gsap' { const gsap: any; export = gsap; }
declare module 'fabric' { const fabric: any; export = fabric; }
declare module 'iconify' { const iconify: any; export = iconify; }
declare module 'd3' { const d3: any; export = d3; }
declare module 'fluent-ffmpeg' { const ffmpeg: any; export = ffmpeg; }
declare module 'ffmpeg-static' { const path: any; export = path; }

// ============================================================================
// ============================================================================

// 1. Konva: Used as `import Konva from 'konva'` AND `Konva.Stage` (type)
declare module 'konva' {
    namespace Konva {
        export class Stage { constructor(config: any);[key: string]: any; }
        export class Layer { constructor(config?: any);[key: string]: any; }
        export class Group { constructor(config?: any);[key: string]: any; }
        export class Shape { constructor(config?: any);[key: string]: any; }
        export class Node { constructor(config?: any);[key: string]: any; }
        export class Image { constructor(config: any);[key: string]: any; }
        export class Text { constructor(config: any);[key: string]: any; }
        export type Any = any;
    }
    class Konva {
        static Stage: typeof Konva.Stage;
        static Layer: typeof Konva.Layer;
        static Group: typeof Konva.Group;
        static Image: typeof Konva.Image;
        static Text: typeof Konva.Text;
        static Circle: typeof Konva.Shape;
        static Rect: typeof Konva.Shape;
        static Line: typeof Konva.Shape;
        static Ellipse: typeof Konva.Shape;
        static Star: typeof Konva.Shape;
        static Ring: typeof Konva.Shape;
        static Arc: typeof Konva.Shape;
        static RegularPolygon: typeof Konva.Shape;
        static Path: typeof Konva.Shape;
    }
    export default Konva;
}

// 2. P5: Used as `import p5 from 'p5'` AND `instance: p5` (type)
declare module 'p5' {
    class p5 {
        constructor(sketch: (p: any) => void, node?: HTMLElement | string);
        [key: string]: any;

        static Vector: any;
        static Color: any;
        // ...
    }
    export default p5;
}

// 3. PIXI: Used as `import * as PIXI from 'pixi.js'` AND `PIXI.Application` (type)
declare module 'pixi.js' {
    export class Application { constructor(options?: any);[key: string]: any; stage: Container; view: any; renderer: any; }
    export class Container { constructor();[key: string]: any; children: any[]; destroy(options?: any): void; }
    export class Graphics { constructor();[key: string]: any; }
    export class Sprite { constructor(texture?: any);[key: string]: any; static from(source: any): Sprite; }
    export class Texture { static from(source: any): Texture;[key: string]: any; }
    export class Assets { static load(urls: string | string[]): Promise<any>; }
    export const utils: any;
    export const ticker: any;
}

// 4. Lottie: Used as default import AND named export `AnimationItem`
declare module 'lottie-web' {
    export type AnimationItem = any;
    const lottie: any;
    export default lottie;
}
