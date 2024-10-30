declare module 'rdkit' {
    export class RDKitModule {
        static onRuntimeInitialized: () => void;
        static get_mol(smiles: string): RDKitMolecule;
    }

    export class RDKitMolecule {
        get_svg(): string;
        draw_to_canvas(canvas: HTMLCanvasElement, width: number, height: number): void;
    }

    const RDKit: typeof RDKitModule;
    export default RDKit;
}