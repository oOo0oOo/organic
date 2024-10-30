import { ChemicalDetails } from './ChemicalGraph';
import { initializeRDKit, RDKitModule } from './rdkitInitializer';

export class ChemicalVisualizer {
  private RDKit: RDKitModule | null = null;

  public async render(chemical: ChemicalDetails, container: HTMLElement) {

    container.innerHTML = '';

    // Append star rating and svg
    const starRating = this.generateStarRating(chemical.stars);
    container.appendChild(starRating);
    if (chemical.new) {
      const newBanner = this.createNewBanner(chemical.stars);
      container.appendChild(newBanner);
    }

    await this.renderSVG(chemical, container);

    // Append info circle
    const infoCircle = this.createInfoCircle(chemical.name);
    container.appendChild(infoCircle);

    // Append speaker icon if English name is not empty
    if (chemical.en && chemical.en !== "") {
      const speakerIcon = this.createSpeakerIcon(chemical.en);
      container.appendChild(speakerIcon);
    }
  }

  public async render_only_svg(chemical: ChemicalDetails, container: HTMLElement) {
    container.innerHTML = '';
    await this.renderSVG(chemical, container);
  }

  // Render only the SVG without any additional elements
  private async renderSVG(chemical: ChemicalDetails, container: HTMLElement) {
      if (!this.RDKit) {
        this.RDKit = await initializeRDKit();
      }

      const mol = this.RDKit.get_mol(chemical.name);
      let svg = mol.get_svg();
      mol.delete();
  
      // Parse the SVG string into a DOM object
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
  
      // Remove the <rect> element
      const rect = svgDoc.querySelector('rect');
      if (rect) {
          rect.remove();
      }
  
      // Set the width to 200px
      const svgElement = svgDoc.querySelector('svg');
      svgElement!.setAttribute('width', '160px');
      svgElement!.setAttribute('height', '160px');
  
      // Serialize the DOM object back to a string
      const serializer = new XMLSerializer();
      svg = serializer.serializeToString(svgDoc);
      
      container.innerHTML += svg;
  }

  private createNewBanner(stars: number): HTMLElement {
    const banner = document.createElement('div');
    banner.className = 'new-banner';
    banner.innerText = `New! +${stars * 4}$`;
    return banner;
  }

  private generateStarRating(stars: number): HTMLElement {
    const maxStars = 5;
    const starContainer = document.createElement('div');
    starContainer.className = 'star-rating';

    for (let i = 0; i < maxStars; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.innerHTML = '★';
      if (i < stars) {
        star.classList.add('filled');
      }
      starContainer.appendChild(star);
    }

    return starContainer;
  }

  private createInfoCircle(chemicalName: string): HTMLElement {
    const infoCircle = document.createElement('div');
    infoCircle.className = 'info-circle';
    infoCircle.innerText = 'i';
    infoCircle.title = chemicalName;
    infoCircle.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent the click event from propagating
      const url = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(chemicalName)}`;
      window.open(url, '_blank');
    });
    return infoCircle;
  }

  private createSpeakerIcon(english: string): HTMLElement {
    const speakerIcon = document.createElement('div');
    speakerIcon.className = 'speaker-icon';
    speakerIcon.innerHTML = '🔊';
    speakerIcon.title = capitalizeFirstLetters(english);
    speakerIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        
        const synth = window.speechSynthesis;
        let voices = synth.getVoices();

        if (voices.length === 0) {
            synth.onvoiceschanged = () => {
                voices = synth.getVoices();
                speakText(english, voices);
            };
        } else {
            speakText(english, voices);
        }
    });
    return speakerIcon;
  }
}

function speakText(text: string, voices: SpeechSynthesisVoice[]) {
    if (voices.length === 0) {
        console.error('No speech synthesis voices available.');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.volume = 0.7;
    window.speechSynthesis.speak(utterance);
}

function capitalizeFirstLetters(text: string): string {
  return text.replace(/\b\w/g, char => char.toUpperCase());
}