
import { ChemistryData } from './preload';
const REACTION_IDS_START = 10000000;

export type ChemicalDetails = {
  id: number;
  name: string;
  cost: number;
  stars: number;
  new: boolean;
  en: string;
}

export type ReactionDetails = {
  id: number;
  reactants: ChemicalDetails[];
  products: ChemicalDetails[];
}


export class ChemicalGraph {
  private discoveredChemicals: Set<number> = new Set();
  private performedReactions: Set<number> = new Set();
  private possibleReactions: Set<number> = new Set();
  private freeChemicals: Set<number> = new Set();
  private names;
  private costs;
  private initial: number[];
  private sortedInitial;
  private reactions;
  private english;

  constructor(chemData: ChemistryData) {
    this.names = chemData.chemicals.names;
    this.costs = chemData.chemicals.costs;
    this.initial = chemData.chemicals.initial;
    this.english = chemData.chemicals.english;
    this.reactions = chemData.reactions;

    this.reset();


    // Which ones are the most frequent reactants in reactions. from the initial
    let reactantCounts: {[key: number]: number} = {};
    for (let rId=0; rId<this.reactions.length; rId++){
      for (let cId of this.reactions[rId][0]){
        if (this.initial.includes(cId)){
          if (!reactantCounts[cId]){
            reactantCounts[cId] = 0;
          }
          reactantCounts[cId] += 1;
        }
      }
    }

    // Array of initial reactants sorted by frequency
    let reactantCountsArr = [];
    for (let cId in reactantCounts){
      reactantCountsArr.push([cId, reactantCounts[cId]]);
    }
    reactantCountsArr.sort((a, b) => Number(b[1]) - Number(a[1]));
    let reactantIds = reactantCountsArr.slice(0, 50).map(x => parseInt(x[0].toString()));
    this.sortedInitial = reactantIds;
  }
  
  public getNumPerformedActions(): number {
    return this.performedReactions.size;
  }

  public reset() {
    this.discoveredChemicals = new Set();
    this.performedReactions = new Set();
    this.possibleReactions = new Set();
    this.freeChemicals = new Set();
    for (let cId of this.initial){
      this.discoveredChemicals.add(cId);
    }
    this.updatePossibleReactions();
  }

  private updatePossibleReactions(){
    for (let rId=0; rId<this.reactions.length; rId++){
      if (this.possibleReactions.has(rId)){
        continue;
      }
      if (this.performedReactions.has(rId)){
        continue;
      }
      let poss = true;
      for (let cId of this.reactions[rId][0]){
        if (!this.discoveredChemicals.has(cId)){
          poss = false;
          break;
        }
      }
      if (poss){
        this.possibleReactions.add(rId);
      }
    }
  }

  // JSON serialization and browser cache
  public serialize(): string {
    return JSON.stringify({
      discoveredChemicals: Array.from(this.discoveredChemicals),
      performedReactions: Array.from(this.performedReactions),
      possibleReactions: Array.from(this.possibleReactions),
      freeChemicals: Array.from(this.freeChemicals)
    });
  }

  public static deserialize(chemData: ChemistryData, jsonString: string): ChemicalGraph {
    const data = JSON.parse(jsonString);
    const graph = new ChemicalGraph(chemData);
    graph.discoveredChemicals = new Set(data.discoveredChemicals);
    graph.performedReactions = new Set(data.performedReactions);
    graph.possibleReactions = new Set(data.possibleReactions);
    graph.freeChemicals = new Set(data.freeChemicals);
    return graph;
  }

  public saveState() {
    const serializedState = this.serialize();
    localStorage.setItem('chemicalGraphState', serializedState);
  }

  public static loadState(chemData: ChemistryData): ChemicalGraph | null {
    const serializedState = localStorage.getItem('chemicalGraphState');
    if (serializedState) {
      return ChemicalGraph.deserialize(chemData, serializedState);
    }
    return null;
  }

  public getChemicalDetails(cId: number): ChemicalDetails {
    return {
      id: cId, 
      name: this.names[cId], 
      stars: this.costs[cId],
      cost: this.freeChemicals.has(cId) ? 0 : this.costs[cId] + 1,
      new: !this.discoveredChemicals.has(cId),
      en: this.english[cId]
    };
  }

  public getReactionDetails(rId: number): ReactionDetails {
    const reactants = this.reactions[rId][0].map(cId => this.getChemicalDetails(cId));
    const products = this.reactions[rId][1].map(cId => this.getChemicalDetails(cId));
    return {id: rId, reactants: reactants, products: products} as ReactionDetails;
  }

  public getRandomReactions(n: number, costInfluence: number = 2.5): ReactionDetails[] {
    // Sample (no repeats) from discovered reactions
    const reactionIds = Array.from(this.possibleReactions);
  
    // Calculate weights based on total reactants cost
    const weights = reactionIds.map(rId => {
      const reaction = this.getReactionDetails(rId);
      const totalCost = reaction.reactants.reduce((sum, reactant) => sum + reactant.cost + 1, 0);
      return Math.pow(totalCost, costInfluence);
    });
  
    // Normalize weights
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = weights.map(weight => weight / totalWeight);
  
    // Weighted random selection
    const sampledIds = [];
    for (let i = 0; i < n; i++) {
      const randomValue = Math.random();
      let cumulativeWeight = 0;
      for (let j = 0; j < reactionIds.length; j++) {
        cumulativeWeight += normalizedWeights[j];
        if (randomValue < cumulativeWeight) {
          sampledIds.push(reactionIds[j]);
          break;
        }
      }
    }
  
    return sampledIds.map(rId => this.getReactionDetails(rId));
  }

  public performReaction(rId: number, updatePossible: boolean=true): number[] {
    if (!this.possibleReactions.has(rId)){
      // throw new Error(`Reaction ${rId} is not possible`);
      return [0, 0];
    }
    if (this.performedReactions.has(rId)){
      // throw new Error(`Reaction ${rId} has already been performed`);
      return [0, 0];
    }

    const [reactants, products] = this.reactions[rId];
    let cost = 0;
    for (let cId of products){
      // cost += this.costs[cId] + 1;

      // Each new chemical gives additional $
      if (!this.discoveredChemicals.has(cId)){
        cost += this.costs[cId] * 4;
        this.discoveredChemicals.add(cId);
      }
    }
    this.possibleReactions.delete(rId);
    this.performedReactions.add(rId);

    if (updatePossible){
      this.updatePossibleReactions();
    }

    // Return the net cost of the reaction
    const costProducts = cost;
    for (let cId of reactants){
      if (!this.freeChemicals.has(cId)){
        cost -= this.costs[cId] + 1;
      }
    }
    return [cost, costProducts];
  }

  public performRandomReactions(n: number) {
    if (n < 100){
      console.log("Not enough random reactions to perform");
      return
    }
    
    // Do in batches
    while (n > 0){
      const num = Math.min(n, 50);
      const reactions = this.getRandomReactions(num);
      for (let i = 0; i < num; i++){
        const reaction = reactions[i];
        this.performReaction(reaction.id, false);
      }
      this.updatePossibleReactions();
      n -= reactions.length;
    }

  }

  public getDiscoveredStats(): number[] {
    // Percentage of discovered chemicals, percentage of discovered reactions
    const sl = this.initial.length;
    const numDiscoveredChemicals = this.discoveredChemicals.size - sl;
    const numDiscoveredReactions = this.performedReactions.size;
    // Rounded to 2 decimal places
    const percChemicals = Math.round(numDiscoveredChemicals / (this.names.length - sl) * 10000) / 100;
    const percReactions = Math.round(numDiscoveredReactions / this.reactions.length * 10000) / 100;

    const numPossible = this.possibleReactions.size;
    return [numDiscoveredChemicals, percChemicals, numDiscoveredReactions, percReactions, numPossible];
  }

  public getNonFreeInitialChemicals(num: number): ChemicalDetails[] {
    // Filter non-free chemicals from the sorted initial list
    const initialChemicals = this.sortedInitial.filter(cId => !this.freeChemicals.has(cId));
  
    // Calculate & normalize weights
    const weights = initialChemicals.map((_, index) => Math.exp(-index / initialChemicals.length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = weights.map(weight => weight / totalWeight);
  
    // Weighted random selection
    const sampledChemicals: number[] = [];
    while (sampledChemicals.length < num) {
      const randomValue = Math.random();
      let cumulativeWeight = 0;
      for (let i = 0; i < normalizedWeights.length; i++) {
        cumulativeWeight += normalizedWeights[i];
        if (randomValue < cumulativeWeight) {
          const selectedChemical = initialChemicals[i];
          if (!sampledChemicals.includes(selectedChemical)) {
            sampledChemicals.push(selectedChemical);
          }
          break;
        }
      }
    }
  
    return sampledChemicals.map(cId => this.getChemicalDetails(cId));
  }

  public makeChemicalFree(cId: number) {
    this.freeChemicals.add(cId);
  }
}