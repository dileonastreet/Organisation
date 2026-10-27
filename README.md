# Marge Studio — Calculateur de prix de vente

Calculatrice commerciale en français, entièrement côté navigateur. Elle calcule le prix de vente suggéré à partir du coût d’achat en gros, du coût publicitaire avant TVA, de la livraison par pièce et du bénéfice net souhaité. La TVA publicitaire est fixée à 20 %.

## Lancer la page

Ouvrez `index.html` dans un navigateur récent. Aucune installation ni aucun serveur n’est nécessaire. La police DM Sans est chargée depuis Google Fonts si une connexion Internet est disponible ; sinon, une police système de remplacement est utilisée.

## Utilisation

Modifiez les montants pour recalculer instantanément le prix suggéré et les projections. Choisissez MAD, EUR ou USD dans le sélecteur de devise. Les quantités initiales (1, 10 et 25) peuvent être éditées ; « Ajouter une quantité » crée une nouvelle ligne et le bouton × supprime la ligne correspondante. « Réinitialiser les valeurs » restaure l’exemple de départ.

Les valeurs préremplies sont illustratives. Le calcul suppose une pièce par commande afin d’appliquer le coût publicitaire par commande au prix de chaque pièce. La TVA de 20 % s’applique uniquement au coût publicitaire. Le coût total d’une quantité comprend achat + publicité TTC + livraison ; le bénéfice net affiché est le bénéfice cible saisi, avant autres charges éventuelles.

## Fichiers

- `index.html` : contenu et composants de l’interface.
- `styles.css` : mise en page responsive et thème visuel.
- `app.js` : validation, calculs et commandes interactives.
- `manus-routes.json` : déclaration de l’unique page web.

Aucune donnée n’est envoyée à un serveur ni enregistrée durablement par la page.