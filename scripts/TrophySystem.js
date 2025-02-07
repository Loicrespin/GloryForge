export class TrophySystem {
    static trophies = [];

    static async registerSettings() {
        game.settings.register("GloryForge", "trophies", {
            name: "Trophées",
            scope: "world",
            config: false,
            type: Array,
            default: [],
            onChange: value => {
                console.log("GloryForge | Changement détecté dans les trophées");
                TrophySystem.trophies = value;
                // Déclencher la mise à jour
                Hooks.callAll("updateTrophies");
            }
        });

        // Ajouter un paramètre pour forcer les mises à jour
        game.settings.register("GloryForge", "lastUpdate", {
            name: "Dernière mise à jour",
            scope: "world",
            config: false,
            type: Number,
            default: 0,
            onChange: () => {
                console.log("GloryForge | Mise à jour forcée");
                TrophySystem.loadTrophies().then(() => {
                    Object.values(ui.windows)
                        .filter(w => w instanceof TrophyWindow)
                        .forEach(w => w.render(true));
                });
            }
        });
    }

    //Charger les trophées
    static async loadTrophies() {
        console.log("GloryForge | Chargement des trophées");
        const trophies = game.settings.get("GloryForge", "trophies") || [];
        this.trophies = trophies;
        console.log("GloryForge | Trophées chargés:", this.trophies.length);
        return this.trophies;
    }

    //Ajout d'un trophée
    static async addTrophy(title, description, image, grade, hidden = false, hideDescription = false) {
        if (!game.user.isGM) return;
        
        let newTrophy = {
            id: foundry.utils.randomID(16), // Génère un ID unique de 16 caractères
            title,
            description,
            image,
            grade,
            hidden, // Trophée caché ?
            hideDescription, // Cacher uniquement la description ?
            awardedTo: []
        };
    
        this.trophies.push(newTrophy);
        await game.settings.set("GloryForge", "trophies", this.trophies);
    }

    //Suppression d'un trophé
    static async removeTrophy(id) {
        if (!game.user.isGM) return;
    
        console.log("GloryForge | Début de la suppression du trophée:", id);
    
        // Filtrer la liste
        this.trophies = this.trophies.filter(t => t.id !== id);
    
        // Sauvegarder
        console.log("GloryForge | Sauvegarde des modifications");
        await game.settings.set("GloryForge", "trophies", this.trophies);
    
        // Émettre l'événement socket
        console.log("GloryForge | Émission du socket");
        
        // Utiliser la méthode executeForEveryone de Foundry
        await game.socket.emit("module.gloryforge", {
            type: "trophyDeleted",
            trophyId: id,
            userId: game.user.id
        });
    
        // Forcer la mise à jour pour tout le monde
        Hooks.callAll("updateTrophies");
    
        console.log("GloryForge | Fin de la suppression");
    }    

    //Attribuer un trophée
    static async awardTrophy(playerId, trophyId) {
        if (!game.user.isGM) return;
    
        let trophies = game.settings.get("GloryForge", "trophies") || [];
        let trophy = trophies.find(t => t.id === trophyId);
    
        if (!trophy) {
            ui.notifications.error("Trophée introuvable !");
            return;
        }
    
        // Vérifier si le joueur a déjà ce trophée
        if (!trophy.awardedTo.includes(playerId)) {
            trophy.awardedTo.push(playerId);
            await game.settings.set("GloryForge", "trophies", trophies);
            ui.notifications.info(`Le joueur ${game.users.get(playerId)?.name} a reçu le trophée "${trophy.title}" !`);
        } else {
            ui.notifications.warn("Ce joueur possède déjà ce trophée.");
        }
    }    

    static notifyPlayer(playerId, trophy) {
        let player = game.users.get(playerId);
        if (player) {
            ui.notifications.info(`${player.name} a débloqué un trophée: ${trophy.title}`);
            AudioHelper.play({src: "modules/GloryForge/assets/sounds/achievement.mp3", volume: 0.8, autoplay: true, loop: false}, true);
        }
    }
}
