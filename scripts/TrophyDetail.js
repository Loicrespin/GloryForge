import { TrophySystem } from "./TrophySystem.js";

export class TrophyDetail extends Application {
    constructor(trophy, options = {}) {
        super(options);
        this.trophy = trophy;
        this.isEditing = false;
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
            users: users,
            isEditing: this.isEditing,
            grades: ['Bronze', 'Argent', 'Or', 'Platine']
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        if (game.user.isGM) {
            // Bouton d'édition
            html.find('.edit-trophy-btn').click(() => {
                this.isEditing = true;
                this.render(true);
                // Ajouter un petit délai pour s'assurer que le formulaire est rendu
                setTimeout(() => {
                    const form = html.find('.trophy-edit-form');
                    form.removeClass('closing'); // Au cas où
                    form.addClass('opening');
                }, 300);
            });

            // Bouton de sauvegarde
            html.find('.save-trophy-btn').click(async (event) => {
                event.preventDefault();
                const formData = new FormData(html.find('form')[0]);
                
                const updates = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    image: formData.get('image'),
                    grade: formData.get('grade'),
                    hidden: formData.get('hidden') === 'on',
                    hideDescription: formData.get('hideDescription') === 'on'
                };

                const success = await TrophySystem.updateTrophy(this.trophy.id, updates);
                if (success) {
                    this.isEditing = false;
                    this.trophy = { ...this.trophy, ...updates };
                    this.render(true);
                }
            });

            // Bouton d'annulation
            html.find('.cancel-edit-btn').click(() => {
                const form = html.find('.trophy-edit-form');
                form.removeClass('opening');
                form.addClass('closing');
                
                // Attendre la fin de l'animation avant de fermer
                setTimeout(() => {
                    this.isEditing = false;
                    this.render(true);
                }, 300);
            });
        }

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

        // Écouter les changements d'utilisateurs
        Hooks.on("userConnected", () => this.updatePlayerList());
        Hooks.on("userDisconnected", () => this.updatePlayerList());
    }

    async updatePlayerList() {
        const select = this.element.find(`#award-player-detail-${this.trophy.id}`);
        if (!select.length) return;

        // Récupérer la liste mise à jour des utilisateurs
        const users = game.users.filter(u => u.active);
        
        // Sauvegarder la sélection actuelle
        const currentSelection = select.val();

        // Mettre à jour les options
        select.empty();
        users.forEach(user => {
            const option = $(`<option value="${user.id}">${user.name}</option>`);
            select.append(option);
        });

        // Restaurer la sélection si possible
        if (users.some(u => u.id === currentSelection)) {
            select.val(currentSelection);
        }
    }

    close(options={}) {
        // Nettoyer les hooks lors de la fermeture
        Hooks.off("userConnected", this.updatePlayerList);
        Hooks.off("userDisconnected", this.updatePlayerList);
        return super.close(options);
    }
}