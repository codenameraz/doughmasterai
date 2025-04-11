'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Droplet, Thermometer, Clock, Scale } from 'lucide-react'

export function TechnicalVisualization() {
  return (
    <div className="relative w-full h-full flex flex-col justify-center">
      <div className="grid grid-cols-2 gap-4">
        {/* Hydration Meter */}
        <Link 
          href="/calculator?style=neapolitan" 
          className="group relative overflow-hidden rounded-lg p-4 transition-all bg-gradient-to-br from-background to-background/50 border border-primary/10 hover:border-primary/20"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 bg-primary/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute left-0 top-0 w-full h-1 overflow-hidden rounded-t-lg">
            <motion.div 
              className="bg-gradient-to-r from-primary/40 to-primary h-full"
              initial={{ width: 0 }}
              animate={{ width: '65%' }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <Droplet className="h-4 w-4 text-primary mr-2" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Hydration</span>
            </div>
            
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold text-foreground">65</span>
                <span className="text-lg text-primary font-medium">%</span>
              </div>
              <span className="text-xs text-muted-foreground">Neapolitan Style</span>
            </div>
            
            {/* Water animation */}
            <div className="mt-2 h-12 rounded-md border border-primary/20 overflow-hidden relative">
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/30 to-primary/10"
                initial={{ height: 0 }}
                animate={{ height: "65%" }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
              <motion.div
                className="absolute bottom-0 left-0 right-0"
                initial={{ height: 0 }}
                animate={{ height: "62%" }}
                transition={{ duration: 1.8, ease: "easeOut" }}
              />
              <motion.div
                className="absolute bottom-0 left-0 right-0"
                initial={{ height: "62%" }}
                animate={{ height: ["62%", "65%", "62%"] }}
                transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
              >
                <svg className="w-full h-2 absolute -top-1" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <motion.path
                    d="M0 20 C20 8 50 12 70 8 L100 20 Z"
                    fill="rgba(226, 61, 87, 0.2)"
                    initial={{ d: "M0 20 C20 8 50 12 70 8 L100 20 Z" }}
                    animate={{ 
                      d: [
                        "M0 20 C20 8 50 12 70 8 L100 20 Z",
                        "M0 20 C30 12 60 16 80 12 L100 20 Z",
                        "M0 20 C20 8 50 12 70 8 L100 20 Z"
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 5 }}
                  />
                </svg>
              </motion.div>
            </div>
          </div>
        </Link>

        {/* Temperature Visualization */}
        <Link 
          href="/calculator?style=new-york" 
          className="group relative overflow-hidden rounded-lg p-4 transition-all bg-gradient-to-br from-background to-background/50 border border-primary/10 hover:border-primary/20"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 bg-primary/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute left-0 top-0 w-full h-1 overflow-hidden rounded-t-lg">
            <motion.div 
              className="bg-gradient-to-r from-primary/40 to-primary h-full"
              initial={{ width: 0 }}
              animate={{ width: '85%' }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <Thermometer className="h-4 w-4 text-primary mr-2" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Temperature</span>
            </div>
            
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold text-foreground">850</span>
                <span className="text-sm text-primary ml-1">°F</span>
                <span className="text-xs text-muted-foreground ml-2">/ 450°C</span>
              </div>
              <span className="text-xs text-muted-foreground">New York Style</span>
            </div>
            
            {/* Temperature Gauge */}
            <div className="mt-2 h-12 relative flex items-center">
              <div className="h-3 w-full bg-gradient-to-r from-blue-100 via-yellow-100 to-primary/30 rounded-full overflow-hidden relative">
                <motion.div
                  className="absolute top-0 bottom-0 left-0 w-3 h-3 bg-primary rounded-full border-2 border-white"
                  initial={{ left: 0 }}
                  animate={{ left: "85%" }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              </div>
              <div className="absolute -bottom-1 left-0 text-[8px] text-muted-foreground">300°F</div>
              <div className="absolute -bottom-1 right-0 text-[8px] text-muted-foreground">900°F</div>
            </div>
          </div>
        </Link>
        
        {/* Protein Content */}
        <Link 
          href="/calculator?style=detroit" 
          className="group relative overflow-hidden rounded-lg p-4 transition-all bg-gradient-to-br from-background to-background/50 border border-primary/10 hover:border-primary/20"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 bg-primary/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute left-0 top-0 w-full h-1 overflow-hidden rounded-t-lg">
            <motion.div 
              className="bg-gradient-to-r from-primary/40 to-primary h-full"
              initial={{ width: 0 }}
              animate={{ width: '72%' }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <Scale className="h-4 w-4 text-primary mr-2" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Protein</span>
            </div>
            
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold text-foreground">12.5</span>
                <span className="text-lg text-primary font-medium">%</span>
              </div>
              <span className="text-xs text-muted-foreground">Detroit Style</span>
            </div>
            
            {/* Protein Visualization - Wheat Chain */}
            <div className="mt-2 h-12 flex items-center justify-between">
              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary/60"
                  initial={{ width: 0 }}
                  animate={{ width: "72%" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              <div className="ml-3 relative">
                <motion.div 
                  className="grid grid-cols-3 gap-[1px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-primary/60"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + (i * 0.1), duration: 0.3 }}
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </Link>
        
        {/* Fermentation */}
        <Link 
          href="/calculator?style=sicilian" 
          className="group relative overflow-hidden rounded-lg p-4 transition-all bg-gradient-to-br from-background to-background/50 border border-primary/10 hover:border-primary/20"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 bg-primary/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute left-0 top-0 w-full h-1 overflow-hidden rounded-t-lg">
            <motion.div 
              className="bg-gradient-to-r from-primary/40 to-primary h-full"
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <Clock className="h-4 w-4 text-primary mr-2" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Fermentation</span>
            </div>
            
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold text-foreground">24</span>
                <span className="text-sm text-muted-foreground ml-1">hours</span>
              </div>
              <span className="text-xs text-muted-foreground">Sicilian Style</span>
            </div>
            
            {/* Fermentation Bubbles */}
            <div className="mt-2 h-12 relative bg-gradient-to-b from-muted/5 to-muted/20 rounded-md border border-primary/10 overflow-hidden">
              {[...Array(15)].map((_, i) => {
                const size = Math.random() * 6 + 2;
                const left = Math.random() * 100;
                const delay = Math.random() * 2;
                const duration = Math.random() * 3 + 2;
                
                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-full bg-primary/10"
                    style={{
                      width: size,
                      height: size,
                      left: `${left}%`,
                      bottom: -10,
                    }}
                    animate={{
                      y: [0, -48],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{
                      duration: duration,
                      delay: delay,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                );
              })}
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
} 