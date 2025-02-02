import { TrophySystem } from "./TrophySystem.js";
import { TrophyWindow } from "./TrophyWindow.js";

Hooks.once("init", () => {
    console.log("GloryForge | Initialisation du module...");
    TrophySystem.registerSettings();
});

Hooks.once("ready", () => {
    console.log("GloryForge | Chargement des trophées...");
    TrophySystem.loadTrophies();

    game.GloryForge = {
        TrophySystem
    };
});

// Ajout du bouton dans la barre d'icônes à gauche
Hooks.on("getSceneControlButtons", (controls) => {
    console.log("GloryForge | Ajout du bouton de trophées");

    // Ajoute un groupe de contrôle dédié pour GloryForge
    controls.push({
        name: "GloryForge",
        title: "GloryForge",
        icon: "fas fa-trophy",
        layer: "controls",
        tools: [
            {
                name: "trophy",
                title: "Trophées",
                icon: "fas fa-trophy",
                onClick: () => {
                    const existingWindow = Object.values(ui.windows).find(w => w instanceof TrophyWindow);
                    if (existingWindow) {
                        existingWindow.close();
                    } else {
                        new TrophyWindow().render(true);
                    }
                },
                toggle: true
            }
        ]
    });
});





