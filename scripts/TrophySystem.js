export class TrophySystem {
    static SOCKET = "module.GloryForge";

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
        console.log("GloryForge | Attribution du trophée", trophyId, "au joueur", playerId);
        
        const trophy = this.trophies.find(t => t.id === trophyId);
        if (!trophy) return;

        // Vérifier si le joueur n'a pas déjà le trophée
        if (!trophy.awardedTo.includes(playerId)) {
            trophy.awardedTo.push(playerId);
            
            // Sauvegarder les modifications
            await game.settings.set("GloryForge", "trophies", this.trophies);

            // Créer et afficher la notification dans le chat
            let chatData = {
                content: `
                    <div class="trophy-notification">
                        <img src="${trophy.image}" width="50" height="50"/>
                        <div class="trophy-info">
                            <h3>🏆 Nouveau Trophée Débloqué !</h3>
                            <p>${trophy.title}</p>
                        </div>
                    </div>
                `,
                whisper: [playerId],
                type: CONST.CHAT_MESSAGE_TYPES.OTHER
            };
            
            await ChatMessage.create(chatData);

            // Envoyer un message socket pour jouer le son
            if (game.user.isGM) {
                console.log("GloryForge | Envoi du socket pour jouer le son pour", playerId);
                game.socket.emit("module.GloryForge", {
                    type: "playSound",
                    userId: playerId,
                    trophyId: trophyId
                });
            }

            // Déclencher la mise à jour
            Hooks.callAll("updateTrophies");
        }
    }    

    static async notifyPlayer(playerId, trophy) {
        // Créer et afficher la notification dans le chat
        let chatData = {
            content: `
                <div class="trophy-notification">
                    <img src="${trophy.image}" width="50" height="50"/>
                    <div class="trophy-info">
                        <h3>🏆 Nouveau Trophée Débloqué !</h3>
                        <p>${trophy.title}</p>
                    </div>
                </div>
            `,
            whisper: [playerId],
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        };
        
        await ChatMessage.create(chatData);

        // Émettre un socket pour le son avec plus d'informations
        console.log("GloryForge | Émission du son pour le joueur", playerId);
        game.socket.emit("module.GloryForge", {
            operation: "playTrophySound",
            userId: playerId,
            trophy: trophy.title // Ajout du titre pour le debug
        });
    }

    static async revokeTrophy(playerId, trophyId) {
        console.log("GloryForge | Désattribution du trophée", trophyId, "du joueur", playerId);
        
        const trophy = this.trophies.find(t => t.id === trophyId);
        if (!trophy) return;

        // Retirer le joueur de la liste des attributions
        trophy.awardedTo = trophy.awardedTo.filter(id => id !== playerId);

        // Sauvegarder les modifications
        await game.settings.set("GloryForge", "trophies", this.trophies);

        // Émettre un socket pour synchroniser
        await game.socket.emit("module.gloryforge", {
            type: "trophyRevoked",
            trophyId: trophyId,
            playerId: playerId,
            userId: game.user.id
        });

        // Notifier l'interface
        ui.notifications.info(`Le trophée "${trophy.title}" a été retiré au joueur ${game.users.get(playerId)?.name}`);
        
        // Déclencher la mise à jour
        Hooks.callAll("updateTrophies");
    }

    static async playTrophySound() {
        console.log("GloryForge | Tentative de lecture du son");
        try {
            const result = await AudioHelper.play({
                src: "modules/GloryForge/assets/sounds/trophy_win.ogg",
                volume: 0.8,
                autoplay: true,
                loop: false
            });
            console.log("GloryForge | Son joué avec succès:", result);
        } catch (error) {
            console.error("GloryForge | Erreur lors de la lecture du son:", error);
        }
    }

    static initialize() {
        console.log("GloryForge | Initialisation du système de son");

        // Écouter les événements socket
        if (game.socket) {
            game.socket.on("module.GloryForge", (data) => {
                console.log("GloryForge | Réception d'un événement socket:", data);
                
                // Vérifier si c'est pour cet utilisateur
                if (data.type === "playSound" && data.userId === game.user.id) {
                    console.log("GloryForge | Lecture du son pour", game.user.name);
                    this.playTrophySound();
                }
            });
            console.log("GloryForge | Écouteur de socket initialisé");
        } else {
            console.error("GloryForge | Socket non disponible");
        }
    }
}
