import { TrophySystem } from "./TrophySystem.js";
import { TrophyDetail } from "./TrophyDetail.js";

export class TrophyWindow extends Application {
    constructor(options = {}) {
        super(options);
        
        this.hookId = Hooks.on("updateTrophies", () => {
            console.log("GloryForge | Hook updateTrophies reçu, mise à jour de la fenêtre");
            this.render(true);
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        if (game.user.isGM) {
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
        }

        // Gestion de la vue détaillée
        html.find('.trophy').on('click', async (event) => {
            // Si le clic vient d'un bouton, ne rien faire
            if (event.target.closest('button')) {
                return;
            }
            
            event.preventDefault();
            console.log("GloryForge | Click sur un trophée");
            const trophyId = event.currentTarget.dataset.id;
            console.log("GloryForge | ID du trophée:", trophyId);
            
            const trophy = TrophySystem.trophies.find(t => t.id === trophyId);
            if (trophy) {
                console.log("GloryForge | Ouverture de la vue détaillée");
                new TrophyDetail(trophy).render(true);
            }
        });
    }

    close(options = {}) {
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
}
