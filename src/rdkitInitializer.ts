declare global {
  interface Window {
    initRDKitModule: () => Promise<RDKitModule>;
    RDKit: RDKitModule;
  }
}

export interface RDKitModule {
  version(): string;
  get_mol(smiles: string): RDKitMolecule;
  onRuntimeInitialized?: () => void;
  locateFile?: (path: string) => string;
}

export interface RDKitMolecule {
  get_svg(): string;
  draw_to_canvas(canvas: HTMLCanvasElement, width: number, height: number): void;
  delete(): void;
}

export const initializeRDKit = (): Promise<RDKitModule> => {
  console.log("Initializing RDKit...");
  return new Promise((resolve, reject) => {
    window
      .initRDKitModule()
      .then((RDKit) => {
        // console.log("RDKit version: " + RDKit.version());
        window.RDKit = RDKit;
        resolve(RDKit);
      })
      .catch((error) => {
        console.error("Failed to initialize RDKit:", error);
        reject(error);
      });
  });
};