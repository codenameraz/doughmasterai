export interface FlourType {
  name: string
  description: string
  protein: number
}

export interface PizzaStyle {
  name: string
  description: string
  defaultHydration: number
  defaultSaltPercentage: number
  defaultOilPercentage: number | null
  hydrationRange: {
    min: number
    max: number
  }
  saltRange: {
    min: number
    max: number
  }
  recommendedOil: number | null
  idealFlour: string
  fermentationTime: {
    room: {
      min: number
      max: number
      idealTemp: number
    }
    cold: {
      min: number
      max: number
      idealTemp: number
    }
  }
  signatureCharacteristics: string[]
  flourTypes: FlourType[]
}

export const FLOUR_TYPES: Record<string, FlourType> = {
  '00': {
    name: 'Tipo 00 Flour',
    description: 'Fine Italian milled flour, perfect for Neapolitan style',
    protein: 12.5
  },
  'bread': {
    name: 'Bread Flour',
    description: 'High protein flour, great for NY style and longer fermentation',
    protein: 12.5
  },
  'all-purpose': {
    name: 'All-Purpose Flour',
    description: 'Versatile flour suitable for most styles',
    protein: 10.5
  }
}

export const PIZZA_STYLES: Record<string, PizzaStyle> = {
  neapolitan: {
    name: 'Neapolitan',
    description: 'Traditional Italian style with thin center and puffy crust (AVPN certified)',
    defaultHydration: 62.5,
    defaultSaltPercentage: 2.5,
    defaultOilPercentage: null,
    hydrationRange: {
      min: 55.5,
      max: 62.5
    },
    saltRange: {
      min: 2.4,
      max: 3.0
    },
    recommendedOil: null,
    idealFlour: 'Tipo 00 flour (W260-270, 11-12.5% protein)',
    fermentationTime: {
      room: {
        min: 8,
        max: 12,
        idealTemp: 75
      },
      cold: {
        min: 24,
        max: 72,
        idealTemp: 40
      }
    },
    signatureCharacteristics: [
      'Soft and supple texture',
      'Pronounced crust bubbles',
      'Tender yet chewy cornicione',
      'Minimal thickness in center'
    ],
    flourTypes: [
      {
        name: 'Caputo Tipo 00 Chef\'s Flour',
        description: 'Professional grade Italian 00 flour, ideal for Neapolitan pizza (W260-270)',
        protein: 12.5
      },
      {
        name: 'Caputo Tipo 00 Pizzeria Flour',
        description: 'Higher protein Italian 00 flour, excellent for longer fermentation (W300-320)',
        protein: 13.0
      }
    ]
  },
  'new-york': {
    name: 'New York',
    description: 'Classic American style with slightly thicker crust',
    defaultHydration: 62,
    defaultSaltPercentage: 2.5,
    defaultOilPercentage: 2,
    hydrationRange: {
      min: 58,
      max: 65
    },
    saltRange: {
      min: 2.0,
      max: 3.0
    },
    recommendedOil: 2,
    idealFlour: 'High-gluten bread flour (14% protein)',
    fermentationTime: {
      room: {
        min: 4,
        max: 8,
        idealTemp: 75
      },
      cold: {
        min: 24,
        max: 96,
        idealTemp: 38
      }
    },
    signatureCharacteristics: [
      'Chewy yet foldable crust',
      'Crispy exterior',
      'Medium-thick edge',
      'Even browning'
    ],
    flourTypes: [
      {
        name: 'King Arthur Sir Lancelot Flour',
        description: 'High gluten flour perfect for NY style (14.2% protein)',
        protein: 14.2
      },
      {
        name: 'King Arthur Bread Flour',
        description: 'Strong bread flour suitable for NY style (12.7% protein)',
        protein: 12.7
      }
    ]
  },
  detroit: {
    name: 'Detroit',
    description: 'Thick, crispy bottom with airy crumb structure',
    defaultHydration: 70,
    defaultSaltPercentage: 2,
    defaultOilPercentage: 6,
    hydrationRange: {
      min: 65,
      max: 75
    },
    saltRange: {
      min: 1.8,
      max: 2.2
    },
    recommendedOil: 6,
    idealFlour: 'High-protein bread flour (13-14% protein)',
    fermentationTime: {
      room: {
        min: 4,
        max: 8,
        idealTemp: 75
      },
      cold: {
        min: 24,
        max: 48,
        idealTemp: 38
      }
    },
    signatureCharacteristics: [
      'Crispy, oily bottom crust',
      'Light and airy interior',
      'Caramelized cheese edges',
      'Square shape'
    ],
    flourTypes: [
      {
        name: 'King Arthur Bread Flour',
        description: 'Strong bread flour ideal for Detroit style (12.7% protein)',
        protein: 12.7
      },
      {
        name: 'General Mills All Trumps',
        description: 'High gluten flour for extra chewiness (14% protein)',
        protein: 14
      }
    ]
  },
  sicilian: {
    name: 'Sicilian',
    description: 'Thick, focaccia-like crust with olive oil',
    defaultHydration: 75,
    defaultSaltPercentage: 2.5,
    defaultOilPercentage: 8,
    hydrationRange: {
      min: 70,
      max: 80
    },
    saltRange: {
      min: 2.0,
      max: 3.0
    },
    recommendedOil: 8,
    idealFlour: 'Strong bread flour (12.5-14% protein)',
    fermentationTime: {
      room: {
        min: 4,
        max: 12,
        idealTemp: 75
      },
      cold: {
        min: 24,
        max: 48,
        idealTemp: 38
      }
    },
    signatureCharacteristics: [
      'Thick, light and airy crumb',
      'Crispy, olive oil-rich bottom',
      'Focaccia-like texture',
      'Rich olive oil flavor'
    ],
    flourTypes: [
      {
        name: 'King Arthur Bread Flour',
        description: 'Strong bread flour suitable for Sicilian style (12.7% protein)',
        protein: 12.7
      },
      {
        name: 'Caputo Tipo 00 Chef\'s Flour',
        description: 'Fine Italian 00 flour for softer texture (12.5% protein)',
        protein: 12.5
      }
    ]
  },
  'roman-al-taglio': {
    name: 'Roman Al Taglio',
    description: 'Light, crispy crust with high hydration',
    defaultHydration: 80,
    defaultSaltPercentage: 2.5,
    defaultOilPercentage: 4,
    hydrationRange: {
      min: 75,
      max: 85
    },
    saltRange: {
      min: 2.0,
      max: 3.0
    },
    recommendedOil: 4,
    idealFlour: 'Medium-strength flour (W280-300, 11-12% protein)',
    fermentationTime: {
      room: {
        min: 24,
        max: 72,
        idealTemp: 75
      },
      cold: {
        min: 48,
        max: 96,
        idealTemp: 38
      }
    },
    signatureCharacteristics: [
      'Light and airy structure',
      'Crispy bottom crust',
      'Open crumb structure',
      'Rectangle shape'
    ],
    flourTypes: [
      {
        name: 'Caputo Tipo 00 Pizza Flour',
        description: 'Medium-strength Italian flour ideal for Roman style',
        protein: 12.5
      },
      {
        name: 'General Purpose Flour',
        description: 'All-purpose flour blend for Roman style',
        protein: 11.5
      }
    ]
  },
  custom: {
    name: 'Custom',
    description: 'Custom pizza style with adjustable parameters',
    defaultHydration: 65,
    defaultSaltPercentage: 2.5,
    defaultOilPercentage: 0,
    hydrationRange: {
      min: 50,
      max: 90
    },
    saltRange: {
      min: 1,
      max: 5
    },
    recommendedOil: null,
    idealFlour: 'Based on desired characteristics',
    fermentationTime: {
      room: {
        min: 2,
        max: 24,
        idealTemp: 75
      },
      cold: {
        min: 24,
        max: 120,
        idealTemp: 38
      }
    },
    signatureCharacteristics: [
      'Customizable texture',
      'Flexible fermentation',
      'Adaptable to preferences'
    ],
    flourTypes: [
      {
        name: 'Bread Flour',
        description: 'Strong bread flour (12-13% protein)',
        protein: 12.5
      },
      {
        name: 'All Purpose Flour',
        description: 'Versatile flour for various styles (10-12% protein)',
        protein: 11
      },
      {
        name: '00 Flour',
        description: 'Fine Italian-style flour (11-12.5% protein)',
        protein: 12
      },
      {
        name: 'High Gluten Flour',
        description: 'Very strong flour for chewy texture (14%+ protein)',
        protein: 14
      }
    ]
  }
} 