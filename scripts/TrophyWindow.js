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
        return {
            isGM: game.user.isGM,
            trophies: game.settings.get("GloryForge", "trophies") || []
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
