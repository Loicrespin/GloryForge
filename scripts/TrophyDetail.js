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
        const users = game.users.filter(u => u.active).map(u => ({
            id: u.id,
            name: u.name
        }));

        return {
            trophy: {
                ...this.trophy,
                awardedToNames: this.trophy.awardedTo.map(id => game.users.get(id)?.name || "Inconnu")
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
        }
    }
} 