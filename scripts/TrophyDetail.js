import { TrophySystem } from "./TrophySystem.js";

export class TrophyDetail extends Application {
    constructor(trophy, options = {}) {
        super(options);
        this.trophy = trophy;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "modules/GloryForge/templates/trophy-detail.html",
            classes: ["gloryforge", "trophy-detail-window"],
            width: 600,
            height: "auto",
            title: "Détails du Trophée"
        });
    }

    getData(options = {}) {
        const users = game.users.filter(u => u.active);
        
        // Créer un tableau d'objets contenant à la fois l'ID et le nom
        const awardedToNames = this.trophy.awardedTo.map(id => ({
            id: id,
            name: game.users.get(id)?.name || "Inconnu"
        }));

        return {
            trophy: {
                ...this.trophy,
                awardedToNames: awardedToNames  // Utiliser le nouveau format
            },
            isGM: game.user.isGM,
            users: users
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        if (game.user.isGM) {
            html.find('.award-trophy-btn').click(async (event) => {
                const trophyId = event.currentTarget.dataset.id;
                const playerId = html.find(`#award-player-detail-${trophyId}`).val();
                console.log("GloryForge | Attribution du trophée", trophyId, "au joueur", playerId);
                await TrophySystem.awardTrophy(playerId, trophyId);
                this.render(true);
            });

            html.find('.delete-trophy-btn').click(async (event) => {
                event.preventDefault();
                
                const confirmed = await Dialog.confirm({
                    title: "Supprimer le trophée",
                    content: `<p>Voulez-vous vraiment supprimer ce trophée ?</p>`,
                    yes: () => true,
                    no: () => false,
                    defaultYes: false
                });
                
                if (confirmed) {
                    const trophyId = event.currentTarget.dataset.id;
                    await TrophySystem.removeTrophy(trophyId);
                    this.close();
                }
            });

            html.find('.revoke-trophy-btn').click(async (event) => {
                event.preventDefault();
                
                const playerId = event.currentTarget.dataset.playerId;
                const trophyId = event.currentTarget.dataset.trophyId;
                
                const confirmed = await Dialog.confirm({
                    title: "Retirer le trophée",
                    content: `<p>Voulez-vous vraiment retirer ce trophée au joueur ?</p>`,
                    yes: () => true,
                    no: () => false,
                    defaultYes: false
                });
                
                if (confirmed) {
                    await TrophySystem.revokeTrophy(playerId, trophyId);
                    
                    // Mettre à jour les données du trophée
                    this.trophy = TrophySystem.trophies.find(t => t.id === trophyId);
                    
                    // Forcer le rafraîchissement de la vue
                    this.render(true);
                }
            });
        }
    }
} 