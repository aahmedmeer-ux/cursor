declare module "canvg" {
  export class Canvg {
    static from(ctx: CanvasRenderingContext2D, svg: string, options?: unknown): Promise<Canvg>;
    render(): Promise<void>;
  }
  export const presets: {
    offscreen(options?: unknown): unknown;
  };
}
