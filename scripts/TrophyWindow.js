export class TrophyWindow extends Application {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "gloryforge-trophy-window",
            title: "GloryForge - Trophées",
            template: "modules/GloryForge/templates/trophy-window.html",
            width: 700,
            height: 600,
            resizable: true
        });
    }

    getData() {
        const users = Object.fromEntries(game.users.contents.map(u => [u.id, u.name])); // Convertit en objet cl�/valeur
    
        let trophies = game.settings.get("GloryForge", "trophies") || [];
    
        // Ajoute les noms des joueurs aux troph�es d�bloqu�s
        trophies = trophies.map(trophy => {
            return {
                ...trophy,
                awardedToNames: trophy.awardedTo.map(playerId => users[playerId] || "Inconnu") // R�cup�re les noms
            };
        });
    
        return {
            isGM: game.user.isGM,
            userId: game.user.id,
            trophies,
            users: game.users.filter(u => u.active), // Liste des joueurs actifs
            userNames: users // Liste des noms {id: "Nom"}
        };
    }
    
    activateListeners(html) {
        super.activateListeners(html);

        // Gestion du formulaire d'ajout
        html.find("#add-trophy-btn").on("click", async (event) => {
            event.preventDefault();
            const title = html.find("#trophy-title").val();
            const description = html.find("#trophy-description").val();
            const image = html.find("#trophy-image").val();
            const grade = html.find("#trophy-grade").val();
            const hidden = html.find("#trophy-hidden")[0]?.checked || false;
            const hideDescription = html.find("#trophy-hide-description")[0]?.checked || false;
        
            if (!title || !description || !image || !grade) {
                ui.notifications.warn("Veuillez remplir tous les champs !");
                return;
            }
        
            await game.GloryForge.TrophySystem.addTrophy(title, description, image, grade, hidden, hideDescription);
            this.render(); // Recharge la fenêtre pour afficher le nouveau trophée
        });

        //Gestion pour attribution du trophée
        html.find(".award-trophy-btn").on("click", async (event) => {
            event.preventDefault();
            
            const trophyId = event.currentTarget.dataset.id;
            const playerSelect = html.find(`#award-player-${trophyId}`);
            const playerId = playerSelect.val();
        
            if (!playerId || !trophyId) {
                ui.notifications.warn("Veuillez sélectionner un joueur.");
                return;
            }
        
            await game.GloryForge.TrophySystem.awardTrophy(playerId, trophyId);
            this.render(); // Recharge la fenêtre après attribution
        });
        
        

        html.find(".delete-trophy-btn").on("click", async (event) => {
            event.preventDefault();
            
            const trophyId = event.currentTarget.dataset.id;
            
            if (!trophyId) return;
        
            const confirmed = await Dialog.confirm({
                title: "Supprimer le trophée",
                content: `<p>Voulez-vous vraiment supprimer ce trophée ?</p>`,
                yes: () => true,
                no: () => false,
                defaultYes: false
            });
        
            if (confirmed) {
                await game.GloryForge.TrophySystem.removeTrophy(trophyId);
                this.render(); // Recharge la fenêtre après suppression
            }
        });              
    }
}
