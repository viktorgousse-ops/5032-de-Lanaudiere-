/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function App() {
  const occupants = [
    { name: "Anabelle", detail: "Petite • +18.33$ inc.", rent: "610,48 $", internet: "14,95 $", hydro: "16,94 $", total: "642,37 $" },
    { name: "Disponible", detail: "Moyenne • +22.49$ inc.", rent: "748,99 $", internet: "14,95 $", hydro: "16,94 $", total: "780,88 $" },
    { name: "Viktor", detail: "Grande • +24.18$ inc.", rent: "805,53 $", internet: "14,95 $", hydro: "16,94 $", total: "837,42 $" },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary selection:text-white">
      <main className="py-12 px-6 max-w-5xl mx-auto">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {/* Title & Hero Section */}
          <motion.div variants={itemVariants} className="mb-10">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-primary mb-2 font-bold">Gestion Financière</p>
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface">5032 de Lanaudière</h1>
          </motion.div>

          {/* Summary Grid (Bento Style) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary-container p-6 rounded-xl text-white shadow-xl flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                <span className="font-label text-xs uppercase tracking-widest opacity-80">Total à Répartir</span>
                <span className="font-label text-xs uppercase tracking-widest font-black opacity-80">paiements</span>
              </div>
              <div>
                <h2 className="text-3xl font-headline font-bold">2 260,68 $</h2>
                <p className="text-sm opacity-70 mt-1">Montant global mensuel (Bail + Charges)</p>
              </div>
            </div>
            
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_24px_rgba(25,28,29,0.04)] border border-outline-variant/10">
              <span className="block font-headline font-black text-primary mb-3 text-sm uppercase tracking-tighter">loyer</span>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Loyer Total (Juillet)</p>
              <p className="text-xl font-headline font-bold text-on-surface">2 165,00 $</p>
            </div>
            
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_24px_rgba(25,28,29,0.04)] border border-outline-variant/10">
              <span className="block font-headline font-black text-primary mb-3 text-sm uppercase tracking-tighter">charges</span>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Internet & Hydro</p>
              <p className="text-xl font-headline font-bold text-on-surface">95,68 $</p>
            </div>
          </motion.div>

          {/* Main Financial Ledger */}
          <motion.section variants={itemVariants} className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-headline font-bold flex items-center gap-3">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                Grille de Répartition (Dès Juillet)
              </h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-4 py-1.5 rounded-full uppercase tracking-wider">Actualisé : Juillet 2024</span>
            </div>
            
            <div className="overflow-hidden rounded-xl bg-surface-container-low border border-outline-variant/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest">
                      <th className="p-5 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Occupant</th>
                      <th className="p-5 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Loyer Juil.</th>
                      <th className="p-5 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Internet</th>
                      <th className="p-5 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Hydro</th>
                      <th className="p-5 font-label text-[10px] uppercase tracking-widest text-primary text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface">
                    {occupants.map((occ, i) => (
                      <tr key={i} className="hover:bg-surface-container-lowest transition-all group">
                        <td className="p-5">
                          <p className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{occ.name}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium">{occ.detail}</p>
                        </td>
                        <td className="p-5 font-bold text-on-surface">{occ.rent}</td>
                        <td className="p-5 text-on-surface-variant font-medium">{occ.internet}</td>
                        <td className="p-5 text-on-surface-variant font-medium">{occ.hydro}</td>
                        <td className="p-5 text-right font-headline font-extrabold text-primary text-lg">{occ.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>

          {/* Secondary Section: Evolution & Notes */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Evolution Table */}
            <div className="lg:col-span-3">
              <h3 className="text-xl font-headline font-bold mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                Évolution des Loyers 2026
              </h3>
              <div className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/10">
                <div className="p-5 bg-surface-container-lowest border-b border-surface flex justify-between items-center">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Projections 2026</span>
                  <span className="text-[10px] text-secondary font-bold flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-base">trending_up</span> Prévisions de bail
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between p-4 rounded-lg hover:bg-surface-container-lowest transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center text-secondary font-black text-xs">26</div>
                      <div>
                        <p className="font-bold text-on-surface">Dès Juillet 2026</p>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight">Petite: 642$ • Moy: 781$ • Gde: 837$</p>
                      </div>
                    </div>
                    <span className="font-headline font-black text-on-surface text-lg">2 260 $</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg hover:bg-surface-container-lowest transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-black text-xs">26</div>
                      <div>
                        <p className="font-bold text-on-surface">Mai - Juin 2026</p>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight">Petite: 624$ • Moy: 758$ • Gde: 813$</p>
                      </div>
                    </div>
                    <span className="font-headline font-black text-on-surface text-lg">2 195 $</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="lg:col-span-2">
              <h3 className="text-xl font-headline font-bold mb-6 flex items-center gap-3 text-on-surface">
                <span className="w-1.5 h-6 bg-tertiary rounded-full"></span>
                Détails des Charges
              </h3>
              <div className="space-y-4">
                <div className="bg-secondary-fixed/30 p-5 rounded-xl border border-secondary-fixed-dim/20 shadow-sm">
                  <div className="flex gap-4">
                    <span className="material-symbols-outlined text-secondary text-2xl">wifi</span>
                    <div>
                      <p className="text-sm font-black text-on-secondary-container mb-1 uppercase tracking-wider">Internet (FIZZ)</p>
                      <p className="text-[11px] text-on-secondary-fixed-variant leading-relaxed font-medium">44,85 $ total divisé par 3 occupants (14,95 $/pers). Inclus haute vitesse illimitée.</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/15">
                  <div className="flex gap-4">
                    <span className="font-headline font-black text-primary text-xs uppercase self-center tracking-tighter">charges</span>
                    <div>
                      <p className="text-sm font-black text-on-surface mb-1 uppercase tracking-wider">Hydro-Québec</p>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">50,83 $ total par mois (16,94 $/pers). Basé sur le plan de paiements égaux.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Side Decoration (Editorial Flair) */}
      <div className="hidden lg:block fixed right-10 top-1/2 -translate-y-1/2 w-48 opacity-10 pointer-events-none rotate-6 select-none">
        <img 
          className="rounded-2xl grayscale blur-[1px] hover:blur-0 transition-all duration-700" 
          referrerPolicy="no-referrer"
          alt="Minimalist architectural detail" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV3a_yp6RcPurok1LVblaRfGBPbd8Z40FSm3Fnpl_2qoetfaxZXWpoR51eXKoaIuIF4pNTRxAyEFRXK4f9l4kA1G4buUJfeImfOGMMrIkMMld65DFO9Mc3WR-0kU0hS43I_t39fr7HyJFJ3C9YcBxX41_OGYNQPYt7T2F21lfRuOqahgOOVgacF68Hor8Nb9wH32Rvjf1XrRS3K_13pwBacrq5pW_P9LrQnQ0XFAIIN8ZSlJtVJQPSOJTzF61EFxI2Axms8g449Jw"
        />
      </div>
    </div>
  );
}

