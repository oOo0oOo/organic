import { ChemistryData } from './preload';
import { ChemicalDetails, ChemicalGraph, ReactionDetails } from './ChemicalGraph';
import { ChemicalVisualizer } from './ChemicalVisualizer';
import { SoundManager } from './SoundManager';

export class Game {
  private appSelector: string;
  private graph: ChemicalGraph;
  private visualizer: ChemicalVisualizer | null = null;
  private money: number = 0;
  private rerollCount: number = 0;
  private maxRerolls: number = 3;
  private productsShown: boolean = false;
  private soundManager: SoundManager;
  private reactionCount: number = 0;
  private currentShopChemical: ChemicalDetails | null = null;

  constructor(appSelector: string, chemistryData: ChemistryData) {
    this.appSelector = appSelector;
    this.graph = ChemicalGraph.loadState(chemistryData) || new ChemicalGraph(chemistryData);
    this.soundManager = new SoundManager({
      click: '/sound/bubble1.wav',
      success: '/sound/bubble3.wav',
      fail: '/sound/bubble2.wav',
      speed: '/sound/bubble_wave.wav'
    });

    [this.money, this.rerollCount] = this.loadGame();
  }

  private resetGame() {
    this.money = 10;
    this.rerollCount = 0;
    this.graph.reset();
    this.saveGame();
  }

  public init() {
    const app = document.querySelector<HTMLDivElement>(this.appSelector);
    if (!app) throw new Error(`App element not found: ${this.appSelector}`);

    app.innerHTML = this.getGameSceneHTML();
    this.setupReactions();
    this.setupButton('#reroll-button', this.handleReroll.bind(this));
    this.setupButton('#speed-button', this.handleSpeed.bind(this));
    this.setupReset();
    this.initChemicalShop();
  }

  private getGameSceneHTML(): string {
    return `
      <div id="game-scene">
        <div class="left-panel">
          <div class="stats-box">
            <div id="game-title" class="wiggle-normal">ORGANIC</div>
            Lab Budget <div id="currency"></div>
            Discovered Chemicals<br>
            <div id="discovered"></div>
            Discovered Reactions<br>
            <div id="reactions-discovered"></div>
            Possible Reactions<br>
            <div id="reactions-possible"></div><br>
            <a href="" id="reset-button">Restart</a>
          </div>
          <div id="shop-box" class="stats-box">
            <button id="speed-button" class="wiggle-normal">Discover up to 1000 reactions for 42 $</button>
            <div id="chemical-shop" class="wiggle-normal">
              Unlock Free Chemical!
              <div id="free-chemical"></div>
              <button id="free-chemical-button" class="wiggle-normal">3 $</button>
            </div>
          </div>
          <div id="reroll-box" class="stats-box">
            <button id="reroll-button" class="wiggle-normal" style="--animation-delay: 0.42s;">Reroll</button>
          </div>
        </div>
        <div id="reactions"></div>
      </div>
    `;
  }

  private async setupReactions(resetReroll: boolean = true) {
    const reactionsContainer = document.querySelector<HTMLDivElement>('#reactions');
    if (!reactionsContainer) return;

    reactionsContainer.innerHTML = '';
    const reactions = this.graph.getRandomReactions(3);
    this.visualizer ||= new ChemicalVisualizer();

    for (const reaction of reactions) {
      const reactionDiv = document.createElement('div');
      reactionDiv.className = 'reaction';
      reactionsContainer.appendChild(reactionDiv);
      await this.visualizeReaction(reaction, reactionDiv, false);
      reactionDiv.addEventListener('click', () => this.handleReactionSelection(reaction, reactionDiv));
    }

    this.updateStats();
    if (resetReroll) this.resetReroll();
    this.productsShown = false;
  }

  private async handleReactionSelection(reaction: ReactionDetails, container: HTMLDivElement) {
    if (this.productsShown) return;

    this.productsShown = true;
    this.hideOtherReactions(container);
    const [netMoney, costProducts] = this.graph.performReaction(reaction.id);
    await this.visualizeReaction(reaction, container, true);
    this.money += netMoney;

    if (this.graph.getNumPerformedActions() % 5 === 0) {
      this.saveGame();
    }

    this.updateReactionCost(container, costProducts, netMoney);
    this.updateStats();
    container.addEventListener('click', () => this.setupReactions(), { once: true });
    
    if (netMoney >= 0) {
      this.soundManager.play('success');
    } else {
      this.soundManager.play('fail');
    }

    this.reactionCount++;
    if (this.reactionCount % 3 === 0) {
      this.updateChemicalShop();
    }

    // Reveal reroll and shop after a few reactions
    if (this.reactionCount == 3) {
      const rerollBox = document.querySelector<HTMLDivElement>('#reroll-box');
      rerollBox!.style.display = 'block';
    } else if (this.reactionCount == 6) {
      const shopBox = document.querySelector<HTMLDivElement>('#shop-box');
      shopBox!.style.display = 'block';
    }
  }

  private hideOtherReactions(selectedContainer: HTMLDivElement) {
    document.querySelectorAll<HTMLDivElement>('#reactions .reaction').forEach(reactionDiv => {
      if (reactionDiv !== selectedContainer) reactionDiv.classList.add('hidden');
    });
  }

  private updateReactionCost(container: HTMLDivElement, costProducts: number, netMoney: number) {
    container.querySelector<HTMLDivElement>('.products-price')!.innerText = `+${costProducts} $`;
    const cost = container.querySelector<HTMLDivElement>('.cost');
    cost!.innerText = `-${cost!.innerText}`;

    const pointsOverlay = document.createElement('div');
    pointsOverlay.className = 'points-overlay';
    pointsOverlay.innerText = netMoney >= 0 ? `+${netMoney} $` : `${netMoney} $`;
    pointsOverlay.style.color = netMoney >= 0 ? '' : 'red';
    container.appendChild(pointsOverlay);
  }

  private setupButton(selector: string, handler: () => void) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    button?.addEventListener('click', handler);
  }

  private handleReroll() {
    if (this.rerollCount < this.maxRerolls) {
      this.rerollCount++;
      this.setupReactions(false);
      if (this.rerollCount >= this.maxRerolls) {
        const rerollButton = document.querySelector<HTMLButtonElement>('#reroll-button');
        rerollButton!.disabled = true;
      }
    }
  }

  private handleSpeed() {
    if (this.money >= 50) {
      this.money -= 50;
      this.graph.performRandomReactions(1000);
      this.setupReactions();

      this.soundManager.play('speed')
    }
  }

  private setupReset() {
    const resetButton = document.querySelector<HTMLAnchorElement>('#reset-button');
    resetButton?.addEventListener('click', () => { 
      // Dialog box
      if (confirm('Are you sure you want to reset all game progress?')) {
        this.resetGame();
        this.setupReactions();
      }
    });
  }

  private async updateStats() {
    const currencyElement = document.querySelector<HTMLDivElement>('#currency');
    if (currencyElement) {
      currencyElement.innerText = `${this.money} $`;
      currencyElement.style.color = this.money < 0 ? 'red' : '';
    }

    const [chemicals, chemPercent, reactions, reactPercent, numPossible] = this.graph.getDiscoveredStats();
    document.querySelector<HTMLDivElement>('#discovered')!.innerText = `${chemicals} (${chemPercent} %)`;
    document.querySelector<HTMLDivElement>('#reactions-discovered')!.innerText = `${reactions} (${reactPercent} %)`;
    document.querySelector<HTMLDivElement>('#reactions-possible')!.innerText = `${numPossible}`;
  }

  private async visualizeReaction(reaction: ReactionDetails, container: HTMLDivElement, showProducts: boolean) {
    const rand = () => Math.random() * 0.8;
    const reactants = reaction.reactants.map(() => `<div class="reactant-svg wiggle-normal" style="--animation-delay: ${rand()}s;"></div>`).join(' ');
    const products = showProducts ? reaction.products.map(() => `<div class="product-svg wiggle-normal" style="--animation-delay: ${rand()}s;"></div>`).join(' ') : '';
    const cost = reaction.reactants.reduce((sum, r) => sum + r.cost, 0);

    container.innerHTML = `
      <div class="reaction-details">
        <div class="reactants">
          <div class="cost">${cost} $</div>${reactants}
        </div>
        ${showProducts ? '<div class="divider"></div>' : ''}
        <div class="products-price"></div>
        <div class="products">${products}</div>
      </div>
    `;

    await this.renderChemicals(reaction.reactants, container.querySelectorAll<HTMLDivElement>('.reactant-svg'));
    if (showProducts) {
      await this.renderChemicals(reaction.products, container.querySelectorAll<HTMLDivElement>('.product-svg'));
    }
  }

  private async renderChemicals(chemicals: any[], containers: NodeListOf<HTMLDivElement>) {
    for (let i = 0; i < chemicals.length; i++) {
      await this.visualizer?.render(chemicals[i], containers[i]);
    }
  }

  private resetReroll() {
    this.rerollCount = 0;
    const rerollButton = document.querySelector<HTMLButtonElement>('#reroll-button');
    rerollButton!.disabled = false;
  }

  private saveGame() {
    this.graph.saveState();
    localStorage.setItem('gameState', 
      JSON.stringify({ 
        money: this.money, 
        rerolls: this.rerollCount 
      })
    );
  }

  private loadGame(): [number, number] {
    const gameState = localStorage.getItem('gameState');
    if (gameState) {
      const { money, rerolls } = JSON.parse(gameState);
      return [money, rerolls];
    }
    return [0, 0];
  }

  // Handle chemical shop
  private initChemicalShop() {
    this.updateChemicalShop();
    const freeChemicalButton = document.querySelector<HTMLButtonElement>('#free-chemical-button');
    if (freeChemicalButton) {
      freeChemicalButton.addEventListener('click', () => this.handleChemicalPurchase());
    }
  }

  private updateChemicalShop() {
    const freeChemicalContainer = document.querySelector<HTMLDivElement>('#free-chemical');
    if (!freeChemicalContainer) return;

    const nonFreeChemicals = this.graph.getNonFreeInitialChemicals(1);
    if (nonFreeChemicals.length > 0) {
      const chemical = nonFreeChemicals[0];
      this.currentShopChemical = chemical;
      freeChemicalContainer.innerHTML = '';
      const chemicalDiv = document.createElement('div');
      chemicalDiv.className = 'chemical';
      freeChemicalContainer.appendChild(chemicalDiv);
      this.visualizer ||= new ChemicalVisualizer();
      this.visualizer.render_only_svg(chemical, chemicalDiv);

      // Show chemical shop
      const chemicalShop = document.querySelector<HTMLDivElement>('#chemical-shop');
      if (chemicalShop) {
        chemicalShop.style.display = 'block';
      }
    } else {
      const chemicalShop = document.querySelector<HTMLDivElement>('#chemical-shop');
      if (chemicalShop) {
        chemicalShop.style.display = 'none';
      }
    }
  }

  private handleChemicalPurchase() {
    if (this.money >= 5) {
      this.money -= 5;
      if (this.currentShopChemical) {
        this.graph.makeChemicalFree(this.currentShopChemical.id);
        // Hide chemical shop
        const chemicalShop = document.querySelector<HTMLDivElement>('#chemical-shop');
        if (chemicalShop) {
          chemicalShop.style.display = 'none';
        }
      }
    } else {
      this.soundManager.play('error');
    }
  }
}