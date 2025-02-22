import { TrophyDetail } from './TrophyDetail.js';

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

            // Déterminer la classe CSS en fonction du grade
            let gradeClass = '';
            switch(trophy.grade) {
                case 'Bronze':
                    gradeClass = 'trophy-grade-bronze';
                    break;
                case 'Argent':
                    gradeClass = 'trophy-grade-silver';
                    break;
                case 'Or':
                    gradeClass = 'trophy-grade-gold';
                    break;
                case 'Platine':
                    gradeClass = 'trophy-grade-platinum';
                    break;
                default:
                    gradeClass = 'trophy-grade-normal';
            }

            // Créer et afficher la notification dans le chat
            let chatData = {
                content: `
                    <div class="trophy-notification ${gradeClass}" data-trophy-id="${trophy.id}">
                        <div class="trophy-icon">
                            <img src="${trophy.image}" width="50" height="50"/>
                        </div>
                        <div class="trophy-info">
                            <h3>🏆 Nouveau Trophée Débloqué !</h3>
                            <p class="trophy-title">${trophy.title}</p>
                            ${trophy.grade ? `<span class="trophy-grade">${trophy.grade}</span>` : ''}
                        </div>
                    </div>
                `,
                whisper: [playerId],
                type: CONST.CHAT_MESSAGE_TYPES.OTHER
            };

            console.log("GloryForge | Création de la notification avec ID:", trophy.id);
            
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

    static async updateTrophy(trophyId, updates) {
        if (!game.user.isGM) return false;

        try {
            const index = this.trophies.findIndex(t => t.id === trophyId);
            if (index === -1) {
                ui.notifications.error("Trophée non trouvé");
                return false;
            }

            // Mise à jour du trophée en conservant les propriétés existantes
            this.trophies[index] = {
                ...this.trophies[index],
                title: updates.title || this.trophies[index].title,
                description: updates.description || this.trophies[index].description,
                image: updates.image || this.trophies[index].image,
                grade: updates.grade || this.trophies[index].grade,
                hidden: updates.hidden ?? this.trophies[index].hidden,
                hideDescription: updates.hideDescription ?? this.trophies[index].hideDescription
            };

            await game.settings.set("GloryForge", "trophies", this.trophies);

            game.socket.emit("module.gloryforge", {
                type: "trophyUpdated",
                userId: game.user.id,
                trophy: this.trophies[index]
            });

            ui.notifications.info(`Trophée "${this.trophies[index].title}" mis à jour`);
            return true;
        } catch (error) {
            console.error("GloryForge | Erreur lors de la mise à jour:", error);
            ui.notifications.error("Erreur lors de la mise à jour du trophée");
            return false;
        }
    }

    static initialize() {
        console.log("GloryForge | Initialisation du système de son");

        // Ajouter l'écouteur pour les clics sur les notifications dans le chat
        $(document).on('click', '#chat-log .trophy-notification', async function(event) {
            console.log("GloryForge | Clic sur une notification de trophée");
            const trophyId = $(this).data('trophy-id');
            console.log("GloryForge | ID du trophée cliqué:", trophyId);
            
            if (trophyId) {
                // Charger les trophées si nécessaire
                if (!TrophySystem.trophies || TrophySystem.trophies.length === 0) {
                    console.log("GloryForge | Chargement des trophées avant ouverture du détail");
                    await TrophySystem.loadTrophies();
                }

                // Trouver le trophée correspondant
                const trophy = TrophySystem.trophies.find(t => t.id === trophyId);
                console.log("GloryForge | Trophée trouvé:", trophy);
                
                if (trophy) {
                    console.log("GloryForge | Ouverture de la vue détail pour:", trophy.title);
                    // Ouvrir la vue détail existante
                    new TrophyDetail(trophy).render(true);
                }
            }
        });

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
