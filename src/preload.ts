
export type ChemicalData = {
  names: string[];
  costs: number[];
  initial: number[];
  english: string[];
}

export type ChemistryData = {
  chemicals: ChemicalData;
  reactions: number[][][];
}


export async function preloadData() {
  // load json data
  const response = await fetch('/chemistry.json');
  if (!response.ok) {
    throw new Error('Failed to download chemistry.json');
  }
  
  // Load json as ReactionData
  const data = await response.json() as ChemistryData;
  return data;
}