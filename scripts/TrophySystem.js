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
                TrophySystem.trophies = value;
            }
        });
    }

    //Charger les trophées
    static async loadTrophies() {
        this.trophies = game.settings.get("GloryForge", "trophies") || [];
    }

    //Ajout d'un trophée
    static async addTrophy(title, description, image, grade) {
        if (!game.user.isGM) return;
        
        let newTrophy = {
            id: foundry.utils.randomID(16), // Génère un ID unique de 16 caractères
            title,
            description,
            image,
            grade,
            awardedTo: []
        };
    
        this.trophies.push(newTrophy);
        await game.settings.set("GloryForge", "trophies", this.trophies);
    }

    //Suppression d'un trophé
    static async removeTrophy(id) {
        if (!game.user.isGM) return;
    
        // Filtrer la liste pour ne garder que les trophées dont l'ID est différent
        this.trophies = this.trophies.filter(t => t.id !== id);
    
        // Sauvegarder la nouvelle liste des trophées
        await game.settings.set("GloryForge", "trophies", this.trophies);
    }    

    static async awardTrophy(playerId, trophyTitle) {
        if (!game.user.isGM) return;
        let trophy = this.trophies.find(t => t.title === trophyTitle);
        if (trophy && !trophy.awardedTo.includes(playerId)) {
            trophy.awardedTo.push(playerId);
            await game.settings.set("GloryForge", "trophies", this.trophies);
            this.notifyPlayer(playerId, trophy);
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
