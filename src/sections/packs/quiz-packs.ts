import { premiumPack } from "./pack-factory";

export const quizPacks = [
  premiumPack({ type: "quizProgress", name: "Progression quiz", category: "conversion", family: "quiz-forms", tags: ["quiz", "progression"], variants: [["steps", "Étapes", "Étapes explicitement numérotées."], ["bar", "Barre", "Progression continue en barre."], ["minimal", "Minimal", "Indicateur discret et compact."]] }),
  premiumPack({ type: "quizQuestion", name: "Question quiz", category: "conversion", family: "quiz-forms", tags: ["quiz", "question", "funnel"], layout: "quiz", variants: [["single-choice", "Choix unique", "Une réponse pour avancer."], ["multiple-choice", "Choix multiples", "Plusieurs besoins peuvent être sélectionnés."], ["visual-choice", "Choix visuel", "Réponses présentées en cartes média."]] }),
  premiumPack({ type: "quizResult", name: "Résultat quiz", category: "conversion", family: "quiz-forms", tags: ["quiz", "résultat", "recommandation"], variants: [["profile", "Profil", "Résultat formulé comme un profil."], ["routine", "Routine", "Résultat organisé en étapes d’usage."], ["next-step", "Prochaine étape", "Résultat focalisé sur l’action suivante."]] }),
  premiumPack({ type: "leadCapture", name: "Capture de contact", category: "conversion", family: "conversion-capture", tags: ["email", "consentement", "lead"], variants: [["consent", "Consentement", "Capture avec rappel du consentement."], ["reward", "Contrepartie", "Capture associée à une ressource ou avantage."], ["minimal", "Minimal", "Champ unique et action courte."]] }),
];
