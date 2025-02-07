import { TrophySystem } from "./TrophySystem.js";
import { TrophyWindow } from "./TrophyWindow.js";

Hooks.once("init", () => {
    console.log("GloryForge | Initialisation du module...");
    TrophySystem.registerSettings();
});

Hooks.once("ready", () => {
    console.log("GloryForge | Module prêt");
    
    // Configuration du socket
    game.socket.on("module.gloryforge", async (data) => {
        console.log(`GloryForge | Socket reçu par ${game.user.name}`, data);
        
        // Ne pas traiter l'événement pour l'émetteur
        if (data.userId === game.user.id) return;
        
        if (data.type === "trophyDeleted") {
            console.log("GloryForge | Mise à jour après suppression");
            
            // Recharger les trophées
            await TrophySystem.loadTrophies();
            
            // Mettre à jour les fenêtres ouvertes
            const windows = Object.values(ui.windows).filter(w => w instanceof TrophyWindow);
            windows.forEach(w => w.render(true));
        }
    });
});

// Ajout du bouton dans la barre d'icônes à gauche
Hooks.on("getSceneControlButtons", (controls) => {
    console.log("GloryForge | Ajout du bouton de trophées");

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
                    const windows = Object.values(ui.windows).filter(w => w instanceof TrophyWindow);
                    if (windows.length > 0) {
                        windows.forEach(w => w.close());
                    } else {
                        new TrophyWindow().render(true);
                    }
                },
                toggle: true
            }
        ]
    });
});

// Modification du Hook pour la suppression
Hooks.on('GloryForgeTrophyDeleted', async (trophyId) => {
    // Supprimer le trophée localement
    TrophySystem.trophies = TrophySystem.trophies.filter(t => t.id !== trophyId);
    
    // Mettre à jour toutes les fenêtres ouvertes
    Object.values(ui.windows)
        .filter(w => w instanceof TrophyWindow)
        .forEach(w => w.render(true));
});
