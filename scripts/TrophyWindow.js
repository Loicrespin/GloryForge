import { TrophySystem } from "./TrophySystem.js";

export class TrophyWindow extends Application {
    constructor(options = {}) {
        super(options);
        
        // Ajouter un écouteur pour les mises à jour
        this.hookId = Hooks.on("updateTrophies", () => {
            console.log("GloryForge | Hook updateTrophies reçu, mise à jour de la fenêtre");
            this.render(true);
        });
    }

    close(options = {}) {
        // Nettoyer l'écouteur lors de la fermeture
        Hooks.off("updateTrophies", this.hookId);
        return super.close(options);
    }

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

    getData(options = {}) {
        // Forcer le rechargement des trophées avant de récupérer les données
        return TrophySystem.loadTrophies().then(() => {
            const users = Object.fromEntries(game.users.contents.map(u => [u.id, u.name]));
            
            let trophies = TrophySystem.trophies;
            trophies = trophies.map(trophy => ({
                ...trophy,
                awardedToNames: trophy.awardedTo.map(playerId => users[playerId] || "Inconnu")
            }));

            return {
                isGM: game.user.isGM,
                userId: game.user.id,
                trophies,
                users: game.users.filter(u => u.active),
                userNames: users
            };
        });
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
        
            await TrophySystem.addTrophy(title, description, image, grade, hidden, hideDescription);
            this.render();
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
        
            await TrophySystem.awardTrophy(playerId, trophyId);
            this.render();
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
                await TrophySystem.removeTrophy(trophyId);
                // Forcer le rechargement des données et la mise à jour
                await TrophySystem.loadTrophies();
                this.render(true);
            }
        });              
    }

    // Ajoutez cette méthode pour permettre une mise à jour forcée
    refresh() {
        this.render(true);
    }
}
