export type PizzaStyle = 'neapolitan' | 'ny' | 'detroit' | 'sicilian' | 'roman' | 'custom';

export interface PizzaRecipe {
  style: PizzaStyle;
  hydration: number;
  salt: number;
  oil: number;
  ballWeight: number;
  ballCount: number;
  fermentationHours: number;
  roomTemp: number;
  altitude?: number;
  yeastType: 'IDY' | 'ADY' | 'fresh';
  customYeastPercentage?: number;
}

export interface FlourRecommendation {
  name: string;
  brand: string;
  proteinContent: string;
  description: string;
  alternatives: {
    name: string;
    brand: string;
    proteinContent: string;
  }[];
} 